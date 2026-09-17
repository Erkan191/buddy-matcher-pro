# Free generation quota

The policy is **5 normal successful generations plus 1 explicitly selected emergency generation per rolling 7 days**. Both allowances use successful events newer than exactly seven days ago. A use becomes available when its event leaves that window; there is no midnight emergency reset. Pro remains unlimited through the existing server-verified entitlement bypass.

## Implementation

- `src/app/api/usage/free-generate/route.js` checks the allowance with the existing account/signed-cookie identity.
- `src/supabase/free-generate-quota-rpc.sql` is the matching atomic record routine. Its identity advisory lock prevents count/insert races. A stale normal check cannot silently spend the emergency allowance.
- The tool displays newly generated groups only after successful recording. A record-time 429 shows the limit dialog and leaves previous results intact.
- Homepage copy, free-limit dialog and homepage structured data use the new allowance.

No Stripe, auth, entitlement, grouping algorithm, database tables or RLS changes are included. Existing successful usage remains counted; historical events are not rewritten or reset.

## Analytics compatibility

Existing event names and `free_usage_mode` values (`weekly`, `emergency`, `pro`) remain unchanged. Existing `weekly_count`, `weekly_limit`, `window_days`, `emergency_count_today`, `emergency_limit`, `emergency_remaining` and identity fields remain present. The daily emergency count retains its original meaning for reporting and no longer controls eligibility.

New `emergency_window_days: 7` records the period for the emergency limit. `emergency_count_window` records the rolling count in successful SQL events and API events for which the full count was queried. Record-time API responses retain the existing RPC fields; `emergency_remaining` reflects the rolling allowance.

## Verification

```text
node --experimental-vm-modules --test tests/free-generate-quota.test.mjs
node --test tests/stripe-payments.test.mjs
npm run build
```

The API suite executes the real route with mocked I/O. The SQL verification is `database/verify-free-generate-quota.sql`; it runs as the service role inside BEGIN/ROLLBACK using randomized synthetic event identities. Before installation, insert the candidate routine SQL immediately after BEGIN so the definition also rolls back. Never commit the verification transaction. It checks quota boundaries, expiry, midnight behaviour, legacy events, identity isolation, permissions and retained advisory locking; it does not simulate a two-connection race.

## Release coordination

The application and existing database routine must be released together. Updating only the UI or API is insufficient because the SQL routine is the final authority when recording usage. Apply the reviewed `src/supabase/free-generate-quota-rpc.sql` as a tracked production migration during the release, then publish the matching application and verify both. The signature and service-role permissions are unchanged. A brief mismatch during release fails closed but can show the old copy until both are updated.

Production database migration `20260917052913_set_free_generation_quota_five_plus_one` was applied on 17 September 2026. Post-installation SQL verification passed and rolled back all synthetic fixtures; the 19 existing Pro accounts were unchanged. This release contains the matching application update.
