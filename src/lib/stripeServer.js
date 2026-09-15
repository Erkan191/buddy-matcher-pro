import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createPaymentService } from "./stripePayments.mjs";

let paymentService;

export function getPaymentService() {
  if (!paymentService) {
    const secret = process.env.STRIPE_SECRET_KEY || "";
    if (!/^[sr]k_(live|test)_/.test(secret)) throw new Error("Missing Stripe configuration");
    paymentService = createPaymentService({
      stripe: new Stripe(secret),
      admin: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
      priceId: process.env.STRIPE_PRICE_ID,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      liveMode: /^[sr]k_live_/.test(secret),
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });
  }
  return paymentService;
}
