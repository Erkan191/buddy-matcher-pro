-- Run against the candidate record_free_generate_success definition.
-- To check before deployment, insert the candidate SQL immediately after BEGIN.
-- Everything (including a candidate installed inside this transaction) rolls back.
begin;
set local statement_timeout = '20s';
set local role service_role;

do $$
declare
  session_a text := 'quota-check-a-' || gen_random_uuid()::text;
  session_b text := 'quota-check-b-' || gen_random_uuid()::text;
  session_old text := 'quota-check-old-' || gen_random_uuid()::text;
  session_boundary text := 'quota-check-boundary-' || gen_random_uuid()::text;
  account_a uuid := gen_random_uuid();
  account_b uuid := gen_random_uuid();
  result record;
  i integer;
  total integer;
  latest_metadata jsonb;
  identity_lock bigint;
begin
  -- The first five successful requests consume normal quota only.
  for i in 1..5 loop
    select * into result from public.record_free_generate_success(
      'session', session_a, null, session_a, current_date,
      '{"checked_free_usage_mode":"weekly","source":"quota-regression"}'::jsonb
    );
    if result.recorded is distinct from true or result.can_generate is distinct from true
      or result.free_usage_mode is distinct from 'weekly'
      or result.weekly_count is distinct from i
      or result.emergency_count_today is distinct from 0
      or result.emergency_remaining is distinct from 1 then
      raise exception 'Normal generation % returned incorrect quota: %', i, row_to_json(result);
    end if;
  end loop;

  -- A stale normal preflight must not silently spend the emergency allowance.
  select * into result from public.record_free_generate_success(
    'session', session_a, null, session_a, current_date,
    '{"checked_free_usage_mode":"weekly"}'::jsonb
  );
  if result.recorded is distinct from false or result.can_generate is distinct from false
    or result.weekly_count is distinct from 5 or result.free_usage_mode is not null
    or result.emergency_remaining is distinct from 1 then
    raise exception 'Sixth normal request should not automatically spend emergency: %', row_to_json(result);
  end if;

  select * into result from public.record_free_generate_success(
    'session', session_a, null, session_a, current_date,
    '{"checked_free_usage_mode":"emergency","source":"quota-regression","group_size":2}'::jsonb
  );
  if result.recorded is distinct from true or result.free_usage_mode is distinct from 'emergency'
    or result.weekly_count is distinct from 5 or result.emergency_count_today is distinct from 1
    or result.emergency_remaining is distinct from 0 then
    raise exception 'One explicit emergency generation should succeed: %', row_to_json(result);
  end if;

  -- Verify backward-compatible analytics plus accurate rolling-window metadata.
  select metadata into latest_metadata from public.usage_events
  where session_id = session_a and metadata->>'free_usage_mode' = 'emergency';
  if (latest_metadata @> jsonb_build_object(
    'weekly_limit', 5, 'weekly_count', 5, 'window_days', 7,
    'emergency_count_today', 1, 'emergency_count_window', 1,
    'emergency_limit', 1, 'emergency_remaining', 0, 'emergency_window_days', 7,
    'free_usage_mode', 'emergency', 'free_generate_identity_type', 'session',
    'free_generate_identity_id', session_a, 'local_date', current_date::text,
    'source', 'quota-regression', 'group_size', 2
  )) is distinct from true then
    raise exception 'Quota analytics metadata changed unexpectedly: %', latest_metadata;
  end if;

  -- Repeated requests / a date change do not give another emergency generation.
  for i in 0..1 loop
    select * into result from public.record_free_generate_success(
      'session', session_a, null, session_a, current_date + i,
      '{"checked_free_usage_mode":"emergency"}'::jsonb
    );
    if result.recorded is distinct from false or result.can_generate is distinct from false
      or result.emergency_count_today is distinct from (1 - i) or result.emergency_remaining is distinct from 0 then
      raise exception 'Seventh request or midnight incorrectly reopened quota: %', row_to_json(result);
    end if;
  end loop;
  select count(*) into total from public.usage_events where session_id = session_a;
  if total <> 6 then raise exception 'Denied requests must not record successful generations'; end if;

  -- The same transaction advisory lock still protects count-and-insert. Concurrent
  -- requests for this identity serialize before reading counts; a losing request
  -- sees the committed winner. This check is not a two-connection race simulation.
  identity_lock := hashtextextended('buddy_matcher_free_generate:session:' || session_a, 0);
  if not exists (
    select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()
      and classid = ((identity_lock >> 32) & 4294967295)::oid
      and objid = (identity_lock & 4294967295)::oid
      and objsubid = 1 and granted and mode = 'ExclusiveLock'
  ) then raise exception 'Identity transaction advisory lock is missing'; end if;

  -- Another anonymous visitor keeps their own quota.
  select * into result from public.record_free_generate_success(
    'session', session_b, null, session_b, current_date, '{}'::jsonb
  );
  if result.recorded is distinct from true or result.weekly_count is distinct from 1 then
    raise exception 'Anonymous identities incorrectly share quota';
  end if;

  -- Existing historical analytics need no rewriting to count under the new rule.
  insert into public.usage_events(event_type, session_id, created_at, metadata)
  select 'free_generate_success', session_old, now() - interval '2 days',
    jsonb_build_object('free_usage_mode', 'weekly', 'weekly_limit', 30)
  from generate_series(1,5);
  insert into public.usage_events(event_type, session_id, created_at, metadata)
  values ('free_generate_success', session_old, now() - interval '1 day',
    jsonb_build_object('free_usage_mode','emergency','local_date',(current_date - 1)::text,'emergency_limit',3));
  select * into result from public.record_free_generate_success(
    'session', session_old, null, session_old, current_date,
    '{"checked_free_usage_mode":"emergency"}'::jsonb
  );
  if result.recorded is distinct from false or result.weekly_count is distinct from 5
    or result.emergency_count_today is distinct from 0 or result.emergency_remaining is distinct from 0 then
    raise exception 'Historical successful generations were not counted across days';
  end if;

  -- Exactly seven days old is expired for both normal and emergency usage.
  insert into public.usage_events(event_type, session_id, created_at, metadata)
  select 'free_generate_success', session_boundary, now() - interval '7 days',
    jsonb_build_object('free_usage_mode', 'weekly') from generate_series(1,5);
  insert into public.usage_events(event_type, session_id, created_at, metadata)
  values ('free_generate_success', session_boundary, now() - interval '7 days',
    jsonb_build_object('free_usage_mode','emergency','local_date',(current_date - 7)::text));
  select * into result from public.record_free_generate_success(
    'session', session_boundary, null, session_boundary, current_date, '{}'::jsonb
  );
  if result.recorded is distinct from true or result.free_usage_mode is distinct from 'weekly'
    or result.weekly_count is distinct from 1 or result.emergency_count_today is distinct from 0
    or result.emergency_remaining is distinct from 1 then
    raise exception 'Seven-day boundary failed to restore quota';
  end if;

  -- Each normal slot becomes available when its own event leaves the window.
  update public.usage_events set created_at = now() - interval '7 days'
  where id = (select id from public.usage_events where session_id = session_old
    and metadata->>'free_usage_mode' = 'weekly' limit 1);
  select * into result from public.record_free_generate_success(
    'session', session_old, null, session_old, current_date, '{}'::jsonb
  );
  if result.recorded is distinct from true or result.free_usage_mode is distinct from 'weekly'
    or result.weekly_count is distinct from 5 or result.emergency_count_today is distinct from 0
    or result.emergency_remaining is distinct from 0 then
    raise exception 'Expiring one normal event did not restore one normal slot';
  end if;
  update public.usage_events set created_at = now() - interval '7 days'
  where session_id = session_old and metadata->>'free_usage_mode' = 'emergency';
  select * into result from public.record_free_generate_success(
    'session', session_old, null, session_old, current_date,
    '{"checked_free_usage_mode":"emergency"}'::jsonb
  );
  if result.recorded is distinct from true or result.free_usage_mode is distinct from 'emergency'
    or result.emergency_count_today is distinct from 1 then
    raise exception 'Expiring emergency event did not restore its slot';
  end if;

  -- Signed-in usage follows account ID across sessions, independently of anonymous
  -- events from the same browser, and independently of other signed-in accounts.
  insert into public.usage_events(event_type, session_id, user_id, metadata)
  select 'free_generate_success', session_a, account_a,
    jsonb_build_object('free_usage_mode', 'weekly') from generate_series(1,5);
  select * into result from public.record_free_generate_success(
    'user', account_a::text, account_a, session_b, current_date,
    '{"checked_free_usage_mode":"weekly"}'::jsonb
  );
  if result.recorded is distinct from false or result.weekly_count is distinct from 5
    or result.emergency_count_today is distinct from 0 then
    raise exception 'Account quota failed across sessions or inherited anonymous emergency usage';
  end if;
  select * into result from public.record_free_generate_success(
    'user', account_b::text, account_b, session_a, current_date, '{}'::jsonb
  );
  if result.recorded is distinct from true or result.weekly_count is distinct from 1 then
    raise exception 'A second account incorrectly inherited another identity quota';
  end if;
  select * into result from public.record_free_generate_success(
    'session', session_a, null, session_a, current_date,
    '{"checked_free_usage_mode":"emergency"}'::jsonb
  );
  if result.recorded is distinct from false or result.weekly_count is distinct from 5
    or result.emergency_count_today is distinct from 1 then
    raise exception 'Anonymous quota incorrectly counted signed-in events';
  end if;

  if has_function_privilege('anon', 'public.record_free_generate_success(text,text,uuid,text,date,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.record_free_generate_success(text,text,uuid,text,date,jsonb)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.record_free_generate_success(text,text,uuid,text,date,jsonb)', 'EXECUTE') then
    raise exception 'Server-only RPC permissions changed';
  end if;
end $$;

rollback;
select 'Quota SQL checks passed; all fixtures and transactional changes rolled back' as result;
