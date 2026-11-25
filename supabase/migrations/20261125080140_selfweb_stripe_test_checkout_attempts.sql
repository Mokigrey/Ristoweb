create table selfweb_private.stripe_test_checkout_attempts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  quote_id uuid not null references selfweb_private.checkout_quotes(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);
alter table selfweb_private.stripe_test_checkout_attempts enable row level security;
revoke all on selfweb_private.stripe_test_checkout_attempts from public, anon, authenticated, service_role;

create function selfweb_private.reserve_stripe_test_checkout(p_tenant_id uuid,p_quote_id uuid,p_expired_attempt uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  attempt selfweb_private.stripe_test_checkout_attempts%rowtype;
  quote selfweb_private.checkout_quotes%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,1842));
  perform 1 from public.tenants where id=p_tenant_id and not is_published
    and plan_type='subscription' and subscription_status='trialing' for no key update;
  if not found then return null; end if;

  select * into quote from selfweb_private.checkout_quotes
  where id=p_quote_id and tenant_id=p_tenant_id and total_cents>0;
  if not found then return null; end if;

  select * into attempt from selfweb_private.stripe_test_checkout_attempts where tenant_id=p_tenant_id;
  if not found or (attempt.id=p_expired_attempt and attempt.stripe_session_id is not null) then
    insert into selfweb_private.stripe_test_checkout_attempts (tenant_id,quote_id)
    values (p_tenant_id,p_quote_id)
    on conflict (tenant_id) do update set quote_id=excluded.quote_id, id=excluded.id, stripe_session_id=null, created_at=excluded.created_at
    returning * into attempt;
  else
    select * into strict quote from selfweb_private.checkout_quotes where id=attempt.quote_id;
  end if;
  return jsonb_build_object('id',attempt.id,'quoteId',attempt.quote_id,'sessionId',attempt.stripe_session_id,
    'createdAt',attempt.created_at,'lines',quote.lines,'currency',quote.currency,'total',quote.total_cents);
end;
$$;
revoke execute on function selfweb_private.reserve_stripe_test_checkout(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function selfweb_private.reserve_stripe_test_checkout(uuid,uuid,uuid) to service_role;

create function public.selfweb_reserve_stripe_test_checkout(p_tenant_id uuid,p_quote_id uuid,p_expired_attempt uuid default null)
returns jsonb language sql security invoker set search_path = ''
begin atomic
  select selfweb_private.reserve_stripe_test_checkout(p_tenant_id,p_quote_id,p_expired_attempt);
end;
revoke execute on function public.selfweb_reserve_stripe_test_checkout(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.selfweb_reserve_stripe_test_checkout(uuid,uuid,uuid) to service_role;

create function selfweb_private.link_stripe_test_checkout(p_attempt uuid,p_session text)
returns boolean language sql security definer set search_path = ''
as $$
  with updated as (
    update selfweb_private.stripe_test_checkout_attempts set stripe_session_id=p_session
    where id=p_attempt and p_session ~ '^cs_test_[A-Za-z0-9]+$'
      and (stripe_session_id is null or stripe_session_id=p_session)
    returning id
  ) select exists(select 1 from updated);
$$;
revoke execute on function selfweb_private.link_stripe_test_checkout(uuid,text) from public,anon,authenticated,service_role;
grant execute on function selfweb_private.link_stripe_test_checkout(uuid,text) to service_role;

create function public.selfweb_link_stripe_test_checkout(p_attempt uuid,p_session text)
returns boolean language sql security invoker set search_path = ''
begin atomic
  select selfweb_private.link_stripe_test_checkout(p_attempt,p_session);
end;
revoke execute on function public.selfweb_link_stripe_test_checkout(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.selfweb_link_stripe_test_checkout(uuid,text) to service_role;
