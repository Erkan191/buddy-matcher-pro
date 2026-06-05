create or replace function public.record_free_generate_success(
  p_identity_type text,
  p_identity_id text,
  p_user_id uuid,
  p_session_id text,
  p_quota_date date,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  recorded boolean,
  can_generate boolean,
  free_usage_mode text,
  weekly_count integer,
  emergency_count_today integer,
  emergency_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  weekly_limit constant integer := 30;
  emergency_limit constant integer := 3;
  window_start timestamptz := now() - interval '7 days';
  lock_key bigint;
  checked_mode text := coalesce(p_metadata->>'checked_free_usage_mode', '');
  mode_to_record text := '';
  next_metadata jsonb;
begin
  if p_identity_type not in ('user', 'session') then
    raise exception 'Unsupported identity type';
  end if;

  if p_identity_type = 'user' and p_user_id is null then
    raise exception 'Missing user_id for user identity';
  end if;

  if p_identity_type = 'session' and coalesce(p_session_id, '') = '' then
    raise exception 'Missing session_id for session identity';
  end if;

  lock_key := hashtextextended(
    'buddy_matcher_free_generate:' || p_identity_type || ':' || p_identity_id,
    0
  );

  perform pg_advisory_xact_lock(lock_key);

  select count(*)::integer
    into weekly_count
  from public.usage_events
  where event_type = 'free_generate_success'
    and created_at >= window_start
    and metadata->>'free_usage_mode' = 'weekly'
    and (
      (p_identity_type = 'user' and user_id = p_user_id)
      or (
        p_identity_type = 'session'
        and user_id is null
        and session_id = p_session_id
      )
    );

  select count(*)::integer
    into emergency_count_today
  from public.usage_events
  where event_type = 'free_generate_success'
    and created_at >= window_start
    and metadata->>'free_usage_mode' = 'emergency'
    and metadata->>'local_date' = p_quota_date::text
    and (
      (p_identity_type = 'user' and user_id = p_user_id)
      or (
        p_identity_type = 'session'
        and user_id is null
        and session_id = p_session_id
      )
    );

  emergency_remaining := greatest(0, emergency_limit - emergency_count_today);

  if weekly_count < weekly_limit then
    mode_to_record := 'weekly';
  elsif checked_mode = 'emergency' and emergency_remaining > 0 then
    mode_to_record := 'emergency';
  else
    recorded := false;
    can_generate := false;
    free_usage_mode := null;
    return next;
    return;
  end if;

  if mode_to_record = 'weekly' then
    weekly_count := weekly_count + 1;
  else
    emergency_count_today := emergency_count_today + 1;
    emergency_remaining := greatest(0, emergency_limit - emergency_count_today);
  end if;

  next_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'free_usage_mode', mode_to_record,
    'free_generate_identity_type', p_identity_type,
    'free_generate_identity_id', p_identity_id,
    'local_date', p_quota_date::text,
    'weekly_count', weekly_count,
    'weekly_limit', weekly_limit,
    'window_days', 7,
    'emergency_count_today', emergency_count_today,
    'emergency_limit', emergency_limit,
    'emergency_remaining', emergency_remaining
  );

  insert into public.usage_events (
    event_type,
    session_id,
    user_id,
    metadata
  )
  values (
    'free_generate_success',
    nullif(p_session_id, ''),
    p_user_id,
    next_metadata
  );

  recorded := true;
  can_generate := true;
  free_usage_mode := mode_to_record;
  return next;
end;
$$;

revoke all on function public.record_free_generate_success(
  text,
  text,
  uuid,
  text,
  date,
  jsonb
) from public, anon, authenticated;

grant execute on function public.record_free_generate_success(
  text,
  text,
  uuid,
  text,
  date,
  jsonb
) to service_role;
