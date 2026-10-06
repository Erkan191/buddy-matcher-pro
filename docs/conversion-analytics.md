# Pro conversion and attribution — 6 October 2026

## Product changes

Pro promotion now follows this hierarchy: blocked pairs → avoid repeats → saved lists → Student View → bigger/custom groups → print/export → group leaders. The homepage panel and locked-feature modal share the same feature data. The upgrade page leads with £3.99 once, no subscription, three main benefits and a Get Pro for £3.99 button. Secondary benefits follow below. Teacher copy and search descriptions use the same positioning. Tool controls prioritise pairing rules, and group leaders remain available under optional tools.

Maybe later on the Pro feature modal opens an optional, one-click Why not? dialog. It supports Skip, Escape and backdrop dismissal. Selecting a reason closes it immediately. Other is a category, with no free-text collection. The cap modal has a regular-use/time-saving message. The existing five normal plus one explicitly chosen emergency generation per rolling seven days, all quota code, entitlement verification and database/RLS remain unchanged.

## Event contract

All listed events use the existing `public.usage_events` columns: `event_type`, `session_id`, `user_id`, `metadata`. `session_id` remains the existing persistent browser identifier, not a count of distinct people or visits.

| Event | Metadata added or retained |
| --- | --- |
| `page_view` | `path` is the actual pathname on every route, including client navigation; `previous_path` is the previous pathname in this document, or null on first load. Removed the old homepage-only emitter. Query/hash-only changes are not extra page views. |
| `pro_modal_declined` | `source: pro_modal`, `reason`: the locked-feature message that opened the modal. Emitted when Maybe later opens feedback. |
| `pro_decline_feedback` | Same source/reason plus `response`: `one_time_use`, `another_tool`, `features_not_needed`, `account_required`, `payment_issue`, or `other`. Skip/dismiss produces no answer event. |
| `projector_mode_opened` | `source: tool`, `group_count`, `total_names`. Only after Pro access and nonempty results allow Student View to open. No names or group contents. |
| Existing client events | Shared attribution and actual `path` on tool, upgrade, login/signup and checkout events, including `pro_modal_opened`, `upgrade_clicked`, `upgrade_page_view`, `checkout_clicked`, `checkout_redirect_started`, `checkout_error`, `generate_groups` and existing login/signup events. Existing free-quota requests also carry attribution. |
| `checkout_session_created` | Server event now includes allowlisted attribution and existing `stripe_checkout_session_id`. Stripe Checkout session metadata stores the same attribution alongside the validated browser `session_id`. |
| `payment_failed` | Retains its server-only status; receives attribution from the Stripe session when available. |
| `payment_success` | Unchanged, still written atomically by the existing fulfillment routine. Join to `checkout_session_created` on `metadata.stripe_checkout_session_id` for campaign attribution. |

Shared attribution fields (when available): `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_path`, `referrer`, `referrer_host`, `attribution_captured_at`. Referrer contains only HTTP(S) origin and pathname, with no credentials, query or fragment. Landing paths exclude queries/fragments. Values are allowlisted and bounded to 400 characters before entering Stripe. The ordinary event `source` field continues to mean the in-app UI source, independent of `utm_source`.

Attribution is stored in sessionStorage for the current tab, survives reloads, login and checkout redirects, and is replaced by a different explicit campaign. A return from Stripe or an internal link without UTM parameters does not overwrite it. Memory fallback handles blocked storage within the current document. The privacy page now describes this collection.

## Analysis examples

```sql
-- Campaign funnel; count browser IDs rather than claiming distinct people.
select event_type, count(*) as events, count(distinct session_id) as browsers
from public.usage_events
where metadata->>'utm_source' = 'instagram'
  and metadata->>'utm_campaign' = 'teacher_outreach'
group by event_type order by events desc;

-- Optional reasons, grouped by feature that prompted the offer.
select metadata->>'reason' as feature, metadata->>'response' as response,
       count(*) as responses
from public.usage_events where event_type = 'pro_decline_feedback'
group by 1, 2 order by responses desc;

-- Purchases attributed through the checkout ID, preserving fulfillment/RLS.
select p.created_at, p.metadata->>'stripe_checkout_session_id' as checkout_id,
       c.metadata->>'utm_source' as utm_source,
       c.metadata->>'utm_campaign' as utm_campaign
from public.usage_events p
left join lateral (
  select metadata from public.usage_events c
  where c.event_type = 'checkout_session_created'
    and c.metadata->>'stripe_checkout_session_id' = p.metadata->>'stripe_checkout_session_id'
  order by c.created_at limit 1
) c on true
where p.event_type = 'payment_success';
```

## Verification and limits

- `node --experimental-vm-modules --test tests/*.test.mjs`: 68 passing tests, including quota, password recovery, payment security and new attribution cases.
- Production build and targeted lint pass; two existing tool hook-dependency warnings remain.
- Browser tests cover mobile CTA visibility at 360/390px, desktop layout, route views, feedback answer/skip/Escape, login-to-checkout attribution, Student View gating/event counts, emergency opt-in, hard stop and stale-record denial. Synthetic auth, checkout and quota responses avoid real purchases/allowance use.
- No database migration or RLS changes. Payment amount, price ID selection, auth and atomic fulfillment remain unchanged.
- Client analytics are best effort and can be blocked by browsers/network/storage settings. UTM tags are visitor-supplied, not authoritative identity. Attribution does not follow users across devices or independent tabs/email-confirmation contexts. No old events are backfilled, so total page views rise with the expanded route coverage.
- No real payment is submitted during verification. Existing dependency audit findings were not changed as part of this conversion release.
