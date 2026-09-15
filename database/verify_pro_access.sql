-- Run after the migration. All synthetic users, profiles, receipts and events roll back.
begin;
set local statement_timeout = '20s';
select set_config('test.free_id', gen_random_uuid()::text, true),
       set_config('test.other_id', gen_random_uuid()::text, true);
insert into auth.users (id,email)
values (current_setting('test.free_id')::uuid,'pro-access-test@example.invalid'),
       (current_setting('test.other_id')::uuid,'pro-access-other@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.free_id'),true),
       set_config('request.jwt.claims',json_build_object('sub',current_setting('test.free_id'),'role','authenticated')::text,true);
insert into public.users (id,email,is_pro)
values (current_setting('test.free_id')::uuid,'pro-access-test@example.invalid',false)
on conflict (id) do nothing;
update public.users set email='pro-access-updated@example.invalid' where id=current_setting('test.free_id')::uuid;
do $$ begin
  if not exists(select 1 from public.users where id=current_setting('test.free_id')::uuid and is_pro is false and email='pro-access-updated@example.invalid') then
    raise exception 'Bootstrap or allowed profile edit failed';
  end if;
  begin
    update public.users set is_pro=true where id=current_setting('test.free_id')::uuid;
    raise exception 'SECURITY FAILURE: client updated Pro';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.users (id,email,is_pro) values (current_setting('test.free_id')::uuid,'x@example.invalid',true)
    on conflict(id) do update set is_pro=true;
    raise exception 'SECURITY FAILURE: merge upsert changed Pro';
  exception when insufficient_privilege then null; end;
  begin
    perform public.fulfill_buddy_pro_checkout('cs_test_regression',current_setting('test.free_id')::uuid,'pi_regression',399,'gbp','x@example.invalid',null);
    raise exception 'SECURITY FAILURE: client called fulfillment';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.usage_events(event_type,user_id) values('payment_success',current_setting('test.free_id')::uuid);
    raise exception 'SECURITY FAILURE: client spoofed payment event';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.other_id'),true),
       set_config('request.jwt.claims',json_build_object('sub',current_setting('test.other_id'),'role','authenticated')::text,true);
do $$ begin
  begin
    insert into public.users(id,is_pro) values(current_setting('test.other_id')::uuid,true);
    raise exception 'SECURITY FAILURE: inserted Pro profile';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.users(id,is_pro) values(current_setting('test.other_id')::uuid,null);
    raise exception 'SECURITY FAILURE: inserted NULL Pro flag';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.users where id=current_setting('test.free_id')::uuid) then
    raise exception 'SECURITY FAILURE: read another profile';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin
    insert into public.usage_events(event_type) values('payment_success');
    raise exception 'SECURITY FAILURE: anonymous payment event';
  exception when insufficient_privilege then null; end;
  begin
    perform public.fulfill_buddy_pro_checkout('cs_test_regression',current_setting('test.free_id')::uuid,'pi_regression',399,'gbp','x@example.invalid',null);
    raise exception 'SECURITY FAILURE: anonymous fulfillment';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.usage_events(event_type,session_id) values('page_view','pro-access-regression');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
  if public.fulfill_buddy_pro_checkout('cs_test_regression',current_setting('test.free_id')::uuid,'pi_regression',399,'gbp','pro-access-test@example.invalid','pro-access-regression') is not true then
    raise exception 'First fulfillment did not insert receipt';
  end if;
  if public.fulfill_buddy_pro_checkout('cs_test_regression',current_setting('test.free_id')::uuid,'pi_regression',399,'gbp','pro-access-test@example.invalid','pro-access-regression') is not false then
    raise exception 'Duplicate fulfillment was not deduplicated';
  end if;
  if not exists(select 1 from public.users where id=current_setting('test.free_id')::uuid and is_pro is true) then
    raise exception 'Service fulfillment did not activate Pro';
  end if;
  if (select count(*) from public.usage_events where user_id=current_setting('test.free_id')::uuid and event_type='payment_success') <> 1 then
    raise exception 'Duplicate success event';
  end if;
  begin
    perform public.fulfill_buddy_pro_checkout('cs_test_regression',current_setting('test.other_id')::uuid,'pi_regression',399,'gbp','other@example.invalid',null);
    raise exception 'SECURITY FAILURE: reassigned a receipt';
  exception when raise_exception then
    if sqlerrm <> 'Payment receipt mismatch' then raise; end if;
  end;
  if exists(select 1 from public.users where id=current_setting('test.other_id')::uuid and is_pro is true) then
    raise exception 'Receipt mismatch activated another account';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.free_id'),true),
       set_config('request.jwt.claims',json_build_object('sub',current_setting('test.free_id'),'role','authenticated')::text,true);
-- Existing client bootstrap is safe even when a webhook won a race and created Pro first.
insert into public.users(id,email,is_pro) values(current_setting('test.free_id')::uuid,'pro-access-test@example.invalid',false)
on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from public.users where id=current_setting('test.free_id')::uuid and is_pro is true) then
    raise exception 'Profile bootstrap downgraded paid user';
  end if;
  begin
    update public.users set is_pro=false where id=current_setting('test.free_id')::uuid;
    raise exception 'SECURITY FAILURE: client downgraded Pro';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'All database protection and atomic fulfillment checks passed; synthetic data rolled back' as result;
