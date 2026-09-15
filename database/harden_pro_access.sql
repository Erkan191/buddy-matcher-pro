-- Backward compatible with profile INSERT ... ON CONFLICT DO NOTHING.
-- Existing customer entitlements are not changed by this migration.
create policy users_pro_insert_guard on public.users
  as restrictive for insert to anon, authenticated
  with check (is_pro is false);

revoke update, delete, truncate, references, trigger on public.users from public, anon, authenticated;
revoke update (id, email, is_pro) on public.users from public, anon, authenticated;
grant update (email) on public.users to authenticated;

-- Client analytics must not impersonate authoritative server payment/quota events.
create policy usage_events_server_events_guard on public.usage_events
  as restrictive for insert to anon, authenticated
  with check (event_type not in ('payment_success', 'payment_failed', 'checkout_session_created', 'free_generate_success'));

create table public.stripe_pro_receipts (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_intent_id text not null unique,
  amount_total integer not null check (amount_total > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  fulfilled_at timestamptz not null default now()
);
alter table public.stripe_pro_receipts enable row level security;
revoke all on public.stripe_pro_receipts from public, anon, authenticated;
grant select, insert on public.stripe_pro_receipts to service_role;

create function public.fulfill_buddy_pro_checkout(
  p_checkout_session_id text,
  p_user_id uuid,
  p_payment_intent_id text,
  p_amount_total integer,
  p_currency text,
  p_email text,
  p_browser_session_id text default null
) returns boolean
language plpgsql security invoker set search_path = '' as $function$
declare
  inserted_id text;
  receipt public.stripe_pro_receipts%rowtype;
begin
  if p_checkout_session_id is null or p_checkout_session_id !~ '^cs_(live|test)_[A-Za-z0-9]+$'
     or p_payment_intent_id is null or p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
     or p_user_id is null or p_amount_total is null or p_amount_total <= 0
     or p_currency is null or p_currency !~ '^[a-z]{3}$' then
    raise exception 'Invalid payment receipt';
  end if;

  insert into public.stripe_pro_receipts (checkout_session_id,user_id,payment_intent_id,amount_total,currency)
  values (p_checkout_session_id,p_user_id,p_payment_intent_id,p_amount_total,p_currency)
  on conflict (checkout_session_id) do nothing
  returning checkout_session_id into inserted_id;

  select * into strict receipt from public.stripe_pro_receipts
  where checkout_session_id = p_checkout_session_id;
  if receipt.user_id <> p_user_id or receipt.payment_intent_id <> p_payment_intent_id
     or receipt.amount_total <> p_amount_total or receipt.currency <> p_currency then
    raise exception 'Payment receipt mismatch';
  end if;

  -- The server supplies the verified auth-account email, not the billing email.
  insert into public.users (id,email,is_pro) values (p_user_id,p_email,true)
  on conflict (id) do update set is_pro = true, email = coalesce(excluded.email, public.users.email);

  if inserted_id is not null then
    insert into public.usage_events (event_type,session_id,user_id,metadata)
    values ('payment_success',nullif(p_browser_session_id,''),p_user_id,
      jsonb_build_object('stripe_checkout_session_id',p_checkout_session_id,
        'stripe_payment_intent_id',p_payment_intent_id,'amount_total',p_amount_total,'currency',p_currency));
  end if;
  return inserted_id is not null;
end;
$function$;
revoke all on function public.fulfill_buddy_pro_checkout(text,uuid,text,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.fulfill_buddy_pro_checkout(text,uuid,text,integer,text,text,text) to service_role;
