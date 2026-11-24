create table selfweb_private.initial_subscription_payments (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  quote_id uuid not null unique references selfweb_private.checkout_quotes(id) on delete cascade,
  provider text not null,
  provider_payment_id text not null,
  provider_subscription_id text not null,
  period_start date not null,
  period_end date not null check (period_end > period_start),
  activated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  unique (provider, provider_subscription_id)
);

alter table selfweb_private.initial_subscription_payments enable row level security;
revoke all on selfweb_private.initial_subscription_payments from public, anon, authenticated, service_role;

create function selfweb_private.activate_paid_checkout(
  p_tenant_id uuid,
  p_quote_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_subscription_id text,
  p_amount_cents bigint,
  p_currency text,
  p_period_start date,
  p_period_end date
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote selfweb_private.checkout_quotes%rowtype;
  payment selfweb_private.initial_subscription_payments%rowtype;
  cycle public.tenant_billing_cycles%rowtype;
begin
  if p_tenant_id is null or p_quote_id is null or p_provider is null or p_provider !~ '^[a-z][a-z0-9_-]{0,31}$'
    or coalesce(char_length(btrim(p_provider_payment_id)), 0) not between 1 and 255
    or coalesce(char_length(btrim(p_provider_subscription_id)), 0) not between 1 and 255
    or p_provider_payment_id <> btrim(p_provider_payment_id)
    or p_provider_subscription_id <> btrim(p_provider_subscription_id)
    or p_amount_cents is null or p_amount_cents < 0 or p_currency is null
    or p_period_start is null or p_period_end is null
    or not isfinite(p_period_start) or not isfinite(p_period_end)
    or p_period_start >= p_period_end then
    return 'invalid_details';
  end if;

  select * into quote from selfweb_private.checkout_quotes where id = p_quote_id and tenant_id = p_tenant_id;
  if not found then return 'unknown_quote'; end if;
  if quote.total_cents <> p_amount_cents or quote.currency <> p_currency then
    return 'payment_mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 1842));
  select * into payment from selfweb_private.initial_subscription_payments where tenant_id = p_tenant_id;
  if found then
    if (payment.quote_id, payment.provider, payment.provider_payment_id, payment.provider_subscription_id,
        payment.period_start, payment.period_end)
      = (p_quote_id, p_provider, p_provider_payment_id, p_provider_subscription_id, p_period_start, p_period_end) then
      return 'already_activated';
    end if;
    return 'payment_conflict';
  end if;

  perform 1 from public.tenants where id = p_tenant_id and not is_published
    and plan_type = 'subscription' and subscription_status = 'trialing' for no key update;
  if not found then return 'not_a_draft'; end if;

  select * into cycle from public.tenant_billing_cycles where tenant_id = p_tenant_id for update;
  if found and (cycle.period_start, cycle.period_end) <> (p_period_start, p_period_end) then
    return 'cycle_conflict';
  end if;

  insert into selfweb_private.initial_subscription_payments (
    tenant_id, quote_id, provider, provider_payment_id, provider_subscription_id, period_start, period_end
  ) values (
    p_tenant_id, p_quote_id, p_provider, p_provider_payment_id, p_provider_subscription_id, p_period_start, p_period_end
  ) on conflict do nothing;
  if not found then return 'payment_conflict'; end if;

  insert into public.tenant_billing_cycles (tenant_id, period_start, period_end)
  values (p_tenant_id, p_period_start, p_period_end)
  on conflict (tenant_id) do nothing;
  -- Retry if a concurrent manual setup introduced a conflicting cycle.
  perform 1 from public.tenant_billing_cycles where tenant_id = p_tenant_id
    and period_start = p_period_start and period_end = p_period_end for update;
  if not found then raise exception using errcode = '40001', message = 'Billing cycle changed during activation'; end if;

  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select p_tenant_id, line->>'key', true
  from jsonb_array_elements(quote.lines) as lines(line)
  where line->>'key' <> 'base'
  on conflict (tenant_id, module_key) do update set enabled = true, updated_at = now();

  update public.tenants set subscription_status = 'active', is_published = true where id = p_tenant_id;
  return 'activated';
end;
$$;

revoke execute on function selfweb_private.activate_paid_checkout(uuid, uuid, text, text, text, bigint, text, date, date)
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.activate_paid_checkout(uuid, uuid, text, text, text, bigint, text, date, date)
  to service_role;

create function public.selfweb_activate_paid_checkout(
  p_tenant_id uuid,
  p_quote_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_subscription_id text,
  p_amount_cents bigint,
  p_currency text,
  p_period_start date,
  p_period_end date
) returns text
language sql
security invoker
set search_path = ''
begin atomic
  select selfweb_private.activate_paid_checkout(
    p_tenant_id, p_quote_id, p_provider, p_provider_payment_id, p_provider_subscription_id,
    p_amount_cents, p_currency, p_period_start, p_period_end
  );
end;

revoke execute on function public.selfweb_activate_paid_checkout(uuid, uuid, text, text, text, bigint, text, date, date)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_activate_paid_checkout(uuid, uuid, text, text, text, bigint, text, date, date)
  to service_role;
