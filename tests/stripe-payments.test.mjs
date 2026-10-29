import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createPaymentService } from "../src/lib/stripePayments.mjs";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const sessionId = "cs_test_regression";
const webhookSecret = "whsec_regression_only";
const stripeSdk = new Stripe("sk_test_regression_only");

function fixture() {
  const state = {
    pro: false, rpcError: false, authError: false, intentStatus: "processing", created: [], events: [], grants: [], receipts: new Set(),
    userEmail: "login@example.invalid", emailConfirmed: true,
    session: { id: sessionId, client_reference_id: userId, mode: "payment", livemode: false,
      amount_total: 399, currency: "gbp", status: "complete", payment_status: "paid",
      payment_intent: "pi_regression", metadata: { session_id: userId },
      customer_details: { email: "different-billing@example.invalid" } },
    items: { has_more: false, data: [{ quantity: 1, amount_total: 399, currency: "gbp",
      price: { id: "price_expected", type: "one_time", unit_amount: 399, currency: "gbp" } }] },
  };
  const admin = {
    auth: {
      getUser: async (token) => token === "valid" && !state.authError
        ? { data: { user: { id: userId, email: state.userEmail,
          email_confirmed_at: state.emailConfirmed ? "2026-01-01T00:00:00Z" : null } } }
        : { error: new Error("Invalid") },
      admin: { getUserById: async (id) => ({ data: { user: { id, email: state.userEmail,
        email_confirmed_at: "2026-01-01T00:00:00Z" } } }) },
    },
    from: (table) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_pro: state.pro } }) }) }),
      insert: async (event) => { assert.equal(table, "usage_events"); state.events.push(event); return {}; },
    }),
    rpc: async (name, args) => {
      assert.equal(name, "fulfill_buddy_pro_checkout");
      if (state.rpcError) return { error: new Error("Database unavailable") };
      state.grants.push(args);
      state.pro = true;
      state.receipts.add(args.p_checkout_session_id);
      return { data: true };
    },
  };
  const stripe = {
    checkout: { sessions: {
      retrieve: async (id) => { assert.equal(id, sessionId); return state.session; },
      listLineItems: async () => state.items,
      list: async ({ payment_intent }) => payment_intent === state.session.payment_intent
        ? { data: [state.session] } : { data: [] },
      create: async (args) => {
        state.created.push(args);
        return { ...args, id: sessionId, url: "https://checkout.stripe.com/example" };
      },
    } },
    webhooks: stripeSdk.webhooks,
    paymentIntents: { retrieve: async () => ({ status: state.intentStatus }) },
  };
  const service = createPaymentService({ stripe, admin, priceId: "price_expected", siteUrl: "http://localhost:3000",
    liveMode: false, webhookSecret, logger: { error() {} } });
  return { state, service };
}

function request(body = {}, token = "valid") {
  return new Request("http://localhost/api", { method: "POST", headers: {
    "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, body: JSON.stringify(body) });
}

function webhook(type = "checkout.session.completed", overrides = {}, validSignature = true) {
  const payload = JSON.stringify({ id: "evt_regression", livemode: false, type,
    data: { object: { id: sessionId, payment_status: "paid" } }, ...overrides });
  const signature = stripeSdk.webhooks.generateTestHeaderString({ payload,
    secret: validSignature ? webhookSecret : "whsec_wrong" });
  return new Request("http://localhost/api/stripe/webhook", { method: "POST",
    headers: { "stripe-signature": signature }, body: payload });
}

test("checkout allows payment first without an account but rejects an invalid supplied login", async () => {
  const anonymous = fixture();
  const response = await anonymous.service.checkout(request({ sessionId: userId }, null));
  assert.equal(response.status, 200);
  assert.equal(anonymous.state.created[0].client_reference_id, undefined);
  assert.equal(anonymous.state.created[0].customer_email, undefined);
  assert.equal(anonymous.state.created[0].metadata.purchase_flow, "payment_first_v1");
  assert.equal(anonymous.state.events[0].user_id, null);

  const invalid = fixture();
  assert.equal((await invalid.service.checkout(request({}, "expired"))).status, 401);
  assert.equal(invalid.state.created.length, 0);
});

test("checkout binds the verified user, ignoring a spoofed userId and using auth email", async () => {
  const { state, service } = fixture();
  const response = await service.checkout(request({ userId: otherUserId, sessionId: userId }));
  assert.equal(response.status, 200);
  assert.equal(state.created[0].client_reference_id, userId);
  assert.equal(state.created[0].customer_email, "login@example.invalid");
  assert.equal(state.events[0].event_type, "checkout_session_created");
  assert.equal(state.events[0].metadata.stripe_checkout_session_id, sessionId);
});

test("already Pro users cannot start another purchase", async () => {
  const { state, service } = fixture(); state.pro = true;
  assert.equal((await service.checkout(request())).status, 409);
  assert.equal(state.created.length, 0);
});

test("checkout carries bounded campaign attribution into Stripe and the usage event without trusting identity fields", async () => {
  const { state, service } = fixture();
  const response = await service.checkout(request({ sessionId: userId, attribution: {
    utm_source: "instagram", utm_campaign: "teacher_outreach", landing_path: "/teachers",
    session_id: otherUserId, user_id: otherUserId, referrer: "https://instagram.com/?token=secret",
  } }));
  assert.equal(response.status, 200);
  assert.equal(state.created[0].metadata.session_id, userId);
  assert.equal(state.created[0].metadata.user_id, undefined);
  assert.equal(state.created[0].metadata.utm_source, "instagram");
  assert.equal(state.created[0].metadata.referrer, "https://instagram.com/");
  assert.equal(state.events[0].metadata.utm_campaign, "teacher_outreach");
  assert.equal(state.events[0].metadata.landing_path, "/teachers");
  assert.equal(state.created[0].line_items[0].price, "price_expected");
});

test("malformed JSON is a client error", async () => {
  const { service } = fixture();
  const req = new Request("http://localhost/api", { method: "POST", headers: { Authorization: "Bearer valid" }, body: "{" });
  assert.equal((await service.checkout(req)).status, 400);
});

test("payment status is private to the checkout owner", async () => {
  const { state, service } = fixture(); state.session.client_reference_id = otherUserId;
  assert.equal((await service.status(request({ sessionId }))).status, 404);
  assert.equal(state.grants.length, 0);
  assert.deepEqual(await (await service.status(request({ sessionId }, null))).json(), { status: "account_required" });
});

test("an anonymous paid checkout requires a confirmed account with the checkout email", async () => {
  const { state, service } = fixture();
  state.session.client_reference_id = null;
  state.session.metadata.purchase_flow = "payment_first_v1";
  state.session.customer_details.email = "buyer@example.invalid";

  assert.deepEqual(await (await service.status(request({ sessionId }, null))).json(), { status: "account_required" });
  assert.equal(state.grants.length, 0);

  state.userEmail = "someone-else@example.invalid";
  assert.deepEqual(await (await service.status(request({ sessionId }))).json(), { status: "email_mismatch" });
  assert.equal(state.grants.length, 0);

  state.userEmail = "buyer@example.invalid";
  state.emailConfirmed = false;
  assert.deepEqual(await (await service.status(request({ sessionId }))).json(), { status: "email_mismatch" });
  assert.equal(state.grants.length, 0);

  state.emailConfirmed = true;
  assert.deepEqual(await (await service.status(request({ sessionId }))).json(), { status: "active" });
  assert.equal(state.grants[0].p_user_id, userId);
  assert.equal(state.grants[0].p_email, "buyer@example.invalid");
});

test("missing/invalid checkout IDs cannot report success", async () => {
  const { service } = fixture();
  for (const id of [undefined, "anything", "cs_test_x?secret=1"]) {
    assert.equal((await service.status(request({ sessionId: id }))).status, 404);
  }
});

for (const [status, paymentStatus, expected] of [["open", "unpaid", "unpaid"], ["expired", "unpaid", "expired"], ["complete", "unpaid", "pending"]]) {
  test(`${status}/${paymentStatus} never grants Pro`, async () => {
    const { state, service } = fixture();
    state.session.status = status; state.session.payment_status = paymentStatus;
    assert.deepEqual(await (await service.status(request({ sessionId }))).json(), { status: expected });
    assert.equal(state.pro, false);
    assert.equal(state.grants.length, 0);
  });
}

test("paid checkout activates via atomic RPC and uses login email, not billing email", async () => {
  const { state, service } = fixture();
  const response = await service.status(request({ sessionId }));
  assert.deepEqual(await response.json(), { status: "active" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(state.grants[0].p_email, "login@example.invalid");
  assert.equal(state.grants[0].p_user_id, userId);
  assert.equal(state.grants[0].p_payment_intent_id, "pi_regression");
});

const corruptions = {
  "wrong product price": s => { s.items.data[0].price.id = "price_other"; },
  "wrong amount": s => { s.session.amount_total = 1; },
  "wrong currency": s => { s.session.currency = "usd"; },
  "multiple items": s => { s.items.has_more = true; },
  "wrong quantity": s => { s.items.data[0].quantity = 2; },
  "wrong live/test mode": s => { s.session.livemode = true; },
  "subscription checkout": s => { s.session.mode = "subscription"; },
  "zero priced order": s => { s.items.data[0].price.unit_amount = 0; },
};
for (const [name, corrupt] of Object.entries(corruptions)) {
  test(`rejects ${name} without entitlement`, async () => {
    const { state, service } = fixture(); corrupt(state);
    assert.equal((await service.status(request({ sessionId }))).status, 422);
    assert.equal(state.grants.length, 0);
  });
}

test("unsigned or incorrectly signed webhook cannot grant access", async () => {
  const { state, service } = fixture();
  assert.equal((await service.webhook(request())).status, 400);
  assert.equal((await service.webhook(webhook(undefined, {}, false))).status, 400);
  assert.equal(state.grants.length, 0);
});

test("signed event is cross-checked with current Stripe state", async () => {
  const { state, service } = fixture(); state.session.payment_status = "unpaid";
  assert.equal((await service.webhook(webhook())).status, 200);
  assert.equal(state.grants.length, 0);
});

test("signed webhook from the wrong environment is rejected", async () => {
  const { state, service } = fixture();
  assert.equal((await service.webhook(webhook(undefined, { livemode: true }))).status, 400);
  assert.equal(state.grants.length, 0);
});

test("delayed payment grants only on verified paid success", async () => {
  const { state, service } = fixture(); state.session.payment_status = "unpaid";
  await service.webhook(webhook());
  assert.equal(state.grants.length, 0);
  state.session.payment_status = "paid";
  assert.equal((await service.webhook(webhook("checkout.session.async_payment_succeeded"))).status, 200);
  assert.equal(state.grants.length, 1);
});

test("delayed failure records failure and does not grant access", async () => {
  const { state, service } = fixture(); state.session.payment_status = "unpaid";
  assert.equal((await service.webhook(webhook("checkout.session.async_payment_failed"))).status, 200);
  assert.equal(state.events[0].event_type, "payment_failed");
  assert.equal(state.grants.length, 0);
});

test("a successful payment-first checkout waits safely for account claiming", async () => {
  const { state, service } = fixture();
  state.session.client_reference_id = null;
  state.session.metadata.purchase_flow = "payment_first_v1";
  state.session.customer_details.email = "buyer@example.invalid";
  assert.equal((await service.webhook(webhook())).status, 200);
  assert.equal(state.grants.length, 0);
  assert.equal(state.events[0].event_type, "payment_success_pending_account");
});

test("expired checkout and card failures are recorded with non-sensitive reason codes", async () => {
  const expired = fixture();
  expired.state.session.status = "expired";
  expired.state.session.payment_status = "unpaid";
  assert.equal((await expired.service.webhook(webhook("checkout.session.expired"))).status, 200);
  assert.equal(expired.state.events[0].event_type, "checkout_expired");

  const failed = fixture();
  failed.state.session.payment_status = "unpaid";
  const response = await failed.service.webhook(webhook("payment_intent.payment_failed", {
    data: { object: { id: "pi_regression", last_payment_error: {
      decline_code: "insufficient_funds", code: "card_declined", type: "card_error",
    } } },
  }));
  assert.equal(response.status, 200);
  assert.equal(failed.state.events[0].event_type, "payment_failed");
  assert.equal(failed.state.events[0].metadata.decline_code, "insufficient_funds");
  assert.equal(failed.state.events[0].metadata.error_code, "card_declined");
  assert.equal(failed.state.grants.length, 0);
});

test("a completed checkout with a failed delayed payment no longer tells the customer to wait", async () => {
  for (const status of ["requires_payment_method", "canceled"]) {
    const { state, service } = fixture();
    state.session.payment_status = "unpaid"; state.intentStatus = status;
    assert.deepEqual(await (await service.status(request({ sessionId }))).json(), { status: "unpaid" });
    assert.equal(state.grants.length, 0);
  }
});

test("activation failures return retryable errors and never a false success", async () => {
  const { state, service } = fixture(); state.rpcError = true;
  assert.equal((await service.status(request({ sessionId }))).status, 500);
  assert.equal((await service.webhook(webhook())).status, 500);
  assert.equal(state.pro, false);
  state.rpcError = false;
  assert.equal((await service.webhook(webhook())).status, 200);
  assert.equal(state.pro, true);
});

test("signed events for other purchases are acknowledged without granting Pro", async () => {
  const { state, service } = fixture(); state.items.data[0].price.id = "price_other";
  assert.equal((await service.webhook(webhook())).status, 200);
  assert.equal(state.grants.length, 0);
});
