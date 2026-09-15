# Pro access protection

Production Supabase migration `20260915095426_harden_pro_access` was applied on 15 September 2026. `harden_pro_access.sql` is the exact applied migration; do not run it again on that database.

## Trust boundaries

- Existing users retain their entitlements. A browser can insert its own Free profile or edit its own email, but cannot change `is_pro` or the profile ID.
- `stripe_pro_receipts` is server-only. RLS with no client policies is intentional. The `fulfill_buddy_pro_checkout` function is SECURITY INVOKER and executable only by the service role (and database owner).
- The server must verify the Supabase bearer token for checkout/status and Stripe signatures for webhooks. It retrieves the current Stripe Session and validates ownership, environment, payment mode, exact configured price, one item/quantity, amount and currency.
- Only a complete, paid checkout can invoke activation. The verified auth-account email is used; a differing billing email does not replace it.
- Receipt insertion, Pro activation and one success event are one database transaction. Concurrent webhook and return-page requests share the same unique Checkout Session ID.
- Existing authenticated users who already have Pro are directed back to the tool instead of starting another purchase.

## Payment settings

The purchase remains a single, fixed-price, one-off payment. Strict validation intentionally fails closed if the price, tax, discounts, quantity or payment model is later changed; update and test validation alongside those product changes.

The existing Stripe endpoint must subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Keep its URL and signing secret unchanged. Successful delayed payments are activated by the webhook even if the customer closes the browser. A customer returning while activation is delayed can also safely trigger the same idempotent verification.

## Verification

Run `node --test tests/stripe-payments.test.mjs` for authentication, forged-user-ID, purchase validation, signed-webhook and delayed-payment regression tests. Stripe's real signature verification is exercised; external requests and payments are mocked.

`database/verify_pro_access.sql` exercises database roles, Free bootstrap, forbidden Pro writes, protected analytics, service-only activation, duplicate receipts and preservation of paid profiles. It creates synthetic users only inside a transaction and ends with ROLLBACK. No real customer records are used for mutation tests.

The implementation was also production-built and checked in a browser for missing-reference and signed-out confirmation states. No real payment is required or charged by these checks.

## Scope

This does not retroactively classify historical Pro users or revoke anyone's access. Card-decline investigation still uses Stripe as the authoritative source; the app's new failure event covers delayed Checkout payment failures, not every individual card attempt. Refund/dispute lifecycle changes and unrelated authentication settings are outside this patch.
