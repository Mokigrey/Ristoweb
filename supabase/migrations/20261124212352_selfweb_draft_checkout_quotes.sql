create table selfweb_private.checkout_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  total_cents bigint not null check (total_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now()
);

alter table selfweb_private.checkout_quotes enable row level security;
revoke all on selfweb_private.checkout_quotes from public, anon, authenticated, service_role;
create index checkout_quotes_tenant_idx on selfweb_private.checkout_quotes (tenant_id);

create function selfweb_private.prepare_draft_checkout(p_tenant_id uuid, p_expected_prices jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_prices jsonb;
  quote_lines jsonb;
  total bigint;
  missing integer;
  saved_id uuid;
begin
  if actor_id is null or p_tenant_id is null or not (
    exists (select 1 from public.platform_members where user_id = actor_id and role = 'platform_admin')
    or exists (select 1 from public.tenant_members
      where user_id = actor_id and tenant_id = p_tenant_id and role = 'tenant_admin')
  ) then
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- Use the same lock as saving the draft module selection.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 1842));
  perform 1 from public.tenants
  where id = p_tenant_id and not is_published and plan_type = 'subscription' and subscription_status = 'trialing'
  for no key update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;

  with selected_modules as (
    select module_key from public.tenant_draft_modules where tenant_id = p_tenant_id
    union
    select module_key from public.tenant_modules where tenant_id = p_tenant_id and enabled
  ), required_lines as (
    select 'base'::text as key, 'Sito vetrina base'::text as label, 0 as position
    union all
    select catalog.module_key, catalog.label, 1
    from selected_modules as selected
    join public.module_catalog as catalog using (module_key)
  )
  select
    jsonb_object_agg(line.key, price.amount_cents),
    jsonb_agg(jsonb_build_object('key', line.key, 'label', line.label, 'amount_cents', price.amount_cents)
      order by line.position, line.key),
    sum(price.amount_cents),
    count(*) filter (where price.amount_cents is null)
  into current_prices, quote_lines, total, missing
  from required_lines as line
  left join public.monthly_prices as price on price.price_key = line.key;

  if missing > 0 then return jsonb_build_object('status', 'unpriced'); end if;
  if p_expected_prices is distinct from current_prices then return jsonb_build_object('status', 'changed'); end if;

  select id into saved_id from selfweb_private.checkout_quotes
  where tenant_id = p_tenant_id and lines = quote_lines
  order by created_at desc, id
  limit 1;

  if not found then
    insert into selfweb_private.checkout_quotes (tenant_id, lines, total_cents)
    values (p_tenant_id, quote_lines, total)
    returning id into saved_id;
  end if;

  return jsonb_build_object('status', 'ready', 'quote_id', saved_id);
end;
$$;

revoke execute on function selfweb_private.prepare_draft_checkout(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function selfweb_private.prepare_draft_checkout(uuid, jsonb) to authenticated;

create function public.selfweb_prepare_draft_checkout(p_tenant_id uuid, p_expected_prices jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
begin atomic
  select selfweb_private.prepare_draft_checkout(p_tenant_id, p_expected_prices);
end;

revoke execute on function public.selfweb_prepare_draft_checkout(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.selfweb_prepare_draft_checkout(uuid, jsonb) to authenticated;
