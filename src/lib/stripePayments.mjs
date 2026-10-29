import { sanitizeAttribution } from "./attribution.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECKOUT_ID = /^cs_(live|test)_[A-Za-z0-9]+$/;

class PaymentError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new PaymentError("Invalid request.", 400);
  }
}

// Dependencies are supplied by server routes; no credentials enter client code.
export function createPaymentService({ stripe, admin, priceId, siteUrl, liveMode, webhookSecret, logger = console }) {
  async function authenticate(request) {
    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "");
    if (!match) throw new PaymentError("Please sign in to continue.", 401);
    const { data, error } = await admin.auth.getUser(match[1]);
    if (error || !data?.user) throw new PaymentError("Please sign in again.", 401);
    return data.user;
  }

  async function optionalAuthenticate(request) {
    if (!request.headers.get("authorization")) return null;
    return authenticate(request);
  }

  async function isPro(userId) {
    const { data, error } = await admin.from("users").select("is_pro").eq("id", userId).maybeSingle();
    if (error) throw new Error("Account lookup failed");
    return data?.is_pro === true;
  }

  async function track(eventType, session, extra = {}) {
    const { error } = await admin.from("usage_events").insert({
      event_type: eventType,
      user_id: UUID.test(session.client_reference_id || "") ? session.client_reference_id : null,
      session_id: session.metadata?.session_id || null,
      metadata: { ...sanitizeAttribution(session.metadata), stripe_checkout_session_id: session.id, ...extra },
    });
    if (error) logger.error("Payment event recording failed", { eventType });
  }

  async function retrieveSession(id) {
    if (typeof id !== "string" || !CHECKOUT_ID.test(id)) {
      throw new PaymentError("Checkout not found.", 404);
    }
    try {
      return await stripe.checkout.sessions.retrieve(id);
    } catch (error) {
      if (error.code === "resource_missing") throw new PaymentError("Checkout not found.", 404);
      throw error;
    }
  }

  async function validatePurchase(session) {
    if (!priceId) throw new Error("Missing Stripe price configuration");
    const hasBoundAccount = UUID.test(session.client_reference_id || "");
    const isPaymentFirst = !session.client_reference_id &&
      session.metadata?.purchase_flow === "payment_first_v1" &&
      UUID.test(session.metadata?.session_id || "");
    if (session.mode !== "payment" || session.livemode !== liveMode || (!hasBoundAccount && !isPaymentFirst)) {
      throw new PaymentError("This checkout cannot activate Pro. Please contact support.", 422);
    }
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    const item = items.data[0];
    if (items.has_more || items.data.length !== 1 || item.quantity !== 1 ||
        item.price?.id !== priceId || item.price?.type !== "one_time" ||
        !Number.isSafeInteger(item.price?.unit_amount) || item.price.unit_amount <= 0 ||
        item.currency !== session.currency || item.price.currency !== session.currency ||
        item.amount_total !== item.price.unit_amount || session.amount_total !== item.amount_total) {
      throw new PaymentError("This checkout cannot activate Pro. Please contact support.", 422);
    }
  }

  function checkoutEmail(session) {
    const value = session.customer_details?.email || session.customer_email;
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }

  async function fulfill(session, validated = false, claimUser = null) {
    if (!validated) await validatePurchase(session);
    if (session.payment_status !== "paid" || session.status !== "complete") return false;
    let user;
    if (session.client_reference_id) {
      const { data, error } = await admin.auth.admin.getUserById(session.client_reference_id);
      if (error || !data?.user) throw new Error("Checkout account no longer available");
      user = data.user;
    } else {
      user = claimUser;
      if (!user?.email_confirmed_at || !checkoutEmail(session) ||
          user.email?.trim().toLowerCase() !== checkoutEmail(session)) {
        throw new PaymentError("Use the confirmed account email entered at checkout.", 403);
      }
    }
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntentId) throw new Error("Paid checkout is missing payment reference");
    const { error: fulfillmentError } = await admin.rpc("fulfill_buddy_pro_checkout", {
      p_checkout_session_id: session.id,
      p_user_id: user.id,
      p_payment_intent_id: paymentIntentId,
      p_amount_total: session.amount_total,
      p_currency: session.currency,
      p_email: user.email || null,
      p_browser_session_id: session.metadata?.session_id || null,
    });
    if (fulfillmentError) throw new Error("Pro activation failed");
    return true;
  }

  async function handleCheckout(request) {
    const body = await readBody(request);
    const user = await optionalAuthenticate(request);
    if (user && await isPro(user.id)) return json({ status: "active", error: "You already have Pro." }, 409);
    const browserSessionId = UUID.test(body.sessionId || "") ? body.sessionId : "";
    if (!user && !browserSessionId) throw new PaymentError("Please refresh the page and try again.", 400);
    if (!priceId || !siteUrl) throw new Error("Missing checkout configuration");
    const base = new URL(siteUrl);
    if (liveMode && base.protocol !== "https:") throw new Error("Live checkout requires HTTPS");
    const checkoutParams = {
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        ...sanitizeAttribution(body.attribution),
        purchase_flow: "payment_first_v1",
        session_id: browserSessionId,
      },
      success_url: `${base.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base.origin}/upgrade?checkout=cancelled`,
      integration_identifier: `buddy_matcher_${Array.from({ length: 8 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("")}`,
    };
    if (user) {
      checkoutParams.client_reference_id = user.id;
      checkoutParams.customer_email = user.email;
    }
    const session = await stripe.checkout.sessions.create(checkoutParams);
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    // Recording failures must not strand a customer after Stripe creates checkout.
    try { await track("checkout_session_created", session); }
    catch { logger.error("Checkout session recording failed", { sessionId: session.id }); }
    return json({ url: session.url });
  }

  async function handleStatus(request) {
    const { sessionId } = await readBody(request);
    const session = await retrieveSession(sessionId);
    await validatePurchase(session);
    const user = await optionalAuthenticate(request);
    if (session.client_reference_id && !user) return json({ status: "account_required" });
    if (session.client_reference_id && session.client_reference_id !== user.id) {
      throw new PaymentError("Checkout not found.", 404);
    }
    if (session.status === "complete" && session.payment_status === "paid") {
      if (!user) return json({ status: "account_required" });
      if (!session.client_reference_id &&
          (!user.email_confirmed_at || user.email?.trim().toLowerCase() !== checkoutEmail(session))) {
        return json({ status: "email_mismatch" });
      }
      await fulfill(session, true, user);
      if (!(await isPro(user.id))) throw new Error("Pro activation is not yet visible");
      return json({ status: "active" });
    }
    if (session.status === "expired") return json({ status: "expired" });
    if (session.status === "complete") {
      const intentId = typeof session.payment_intent === "string"
        ? session.payment_intent : session.payment_intent?.id;
      if (intentId) {
        const intent = await stripe.paymentIntents.retrieve(intentId);
        if (["requires_payment_method", "canceled"].includes(intent.status)) {
          return json({ status: "unpaid" });
        }
      }
      return json({ status: "pending" });
    }
    return json({ status: "unpaid" });
  }

  async function handleWebhook(request) {
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new PaymentError("Missing Stripe signature.", 400);
    let event;
    try {
      event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    } catch {
      throw new PaymentError("Invalid Stripe signature.", 400);
    }
    if (event.livemode !== liveMode) throw new PaymentError("Incorrect payment environment.", 400);
    const fulfillEvents = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
    if (fulfillEvents.includes(event.type)) {
      const session = await retrieveSession(event.data.object.id);
      try { await fulfill(session); }
      catch (error) {
        if (error instanceof PaymentError && error.status === 403 &&
            session.status === "complete" && session.payment_status === "paid") {
          await track("payment_success_pending_account", session, { stripe_event_id: event.id });
          return json({ received: true });
        }
        // A correctly signed event for another product is acknowledged without access.
        if (!(error instanceof PaymentError) || error.status !== 422) throw error;
        logger.error("Checkout rejected for Pro activation", { sessionId: session.id });
      }
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = await retrieveSession(event.data.object.id);
      try {
        await validatePurchase(session);
        await track("payment_failed", session, { stripe_event_id: event.id });
      } catch (error) {
        if (!(error instanceof PaymentError) || error.status !== 422) throw error;
      }
    } else if (event.type === "checkout.session.expired") {
      const session = await retrieveSession(event.data.object.id);
      try {
        await validatePurchase(session);
        await track("checkout_expired", session, { stripe_event_id: event.id });
      } catch (error) {
        if (!(error instanceof PaymentError) || error.status !== 422) throw error;
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id, limit: 1 });
      const session = sessions.data?.[0];
      if (session) {
        try {
          await validatePurchase(session);
          await track("payment_failed", session, {
            stripe_event_id: event.id,
            decline_code: intent.last_payment_error?.decline_code || null,
            error_code: intent.last_payment_error?.code || null,
            error_type: intent.last_payment_error?.type || null,
          });
        } catch (error) {
          if (!(error instanceof PaymentError) || error.status !== 422) throw error;
        }
      }
    }
    return json({ received: true });
  }

  function safe(handler) {
    return async (request) => {
      try { return await handler(request); }
      catch (error) {
        if (error instanceof PaymentError) return json({ error: error.message }, error.status);
        // Do not log Stripe objects, bearer tokens, billing details or client secrets.
        logger.error("Payment request failed", { operation: handler.name, type: error.type || error.name });
        return json({ error: "We could not verify your payment right now. Please try again." }, 500);
      }
    };
  }

  return { checkout: safe(handleCheckout), status: safe(handleStatus), webhook: safe(handleWebhook) };
}
