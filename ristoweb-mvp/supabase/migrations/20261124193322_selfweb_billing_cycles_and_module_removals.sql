create table public.tenant_billing_cycles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  unique (tenant_id, period_end),
  check (period_start < period_end)
);

create table public.tenant_module_removals (
  tenant_id uuid not null,
  module_key text not null,
  period_end date not null,
  primary key (tenant_id, module_key),
  foreign key (tenant_id, module_key)
    references public.tenant_modules(tenant_id, module_key) on delete cascade,
  foreign key (tenant_id, period_end)
    references public.tenant_billing_cycles(tenant_id, period_end) on delete cascade
);

alter table public.tenant_billing_cycles enable row level security;
alter table public.tenant_module_removals enable row level security;
revoke all on public.tenant_billing_cycles, public.tenant_module_removals from public, anon, authenticated;
grant select, insert, update on public.tenant_billing_cycles to authenticated;
grant select, insert, delete on public.tenant_module_removals to authenticated;
grant all on public.tenant_billing_cycles, public.tenant_module_removals to service_role;

create policy "Members read own cycle" on public.tenant_billing_cycles for select to authenticated
using ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(
  tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));

create policy "Platform opens subscription cycles" on public.tenant_billing_cycles for insert to authenticated
with check ((select selfweb_private.is_platform_admin()) and exists (
  select 1 from public.tenants t where t.id=tenant_billing_cycles.tenant_id and t.plan_type='subscription'));

create policy "Platform updates subscription cycles" on public.tenant_billing_cycles for update to authenticated
using ((select selfweb_private.is_platform_admin()))
with check ((select selfweb_private.is_platform_admin()));

create policy "Members read own scheduled removals" on public.tenant_module_removals for select to authenticated
using ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(
  tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));

create policy "Owners schedule removal of active modules" on public.tenant_module_removals for insert to authenticated
with check (
  ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(
    tenant_id, array['tenant_admin']::public.tenant_role[]))
  and exists (select 1 from public.tenants t where t.id=tenant_module_removals.tenant_id and t.plan_type='subscription')
  and exists (select 1 from public.tenant_modules m where m.tenant_id=tenant_module_removals.tenant_id
    and m.module_key=tenant_module_removals.module_key and m.enabled)
);

create policy "Owners cancel scheduled removals" on public.tenant_module_removals for delete to authenticated
using ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(
  tenant_id, array['tenant_admin']::public.tenant_role[]));

create function public.selfweb_record_renewal(p_tenant_id uuid, p_expected_end date, p_next_end date)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  current_end date;
begin
  if not exists (select 1 from public.platform_members
    where user_id=(select auth.uid()) and role='platform_admin') then return false; end if;
  if not exists (select 1 from public.tenants
    where id=p_tenant_id and plan_type='subscription') then return false; end if;

  select period_end into current_end from public.tenant_billing_cycles
  where tenant_id=p_tenant_id for update;
  if current_end is null or current_end is distinct from p_expected_end
    or current_end > (now() at time zone 'Europe/Rome')::date
    or p_next_end is null or p_next_end <= current_end then return false; end if;

  with removals as (
    delete from public.tenant_module_removals
    where tenant_id=p_tenant_id and period_end=current_end
    returning module_key
  )
  update public.tenant_modules as m
  set enabled=false, updated_at=now()
  from removals r
  where m.tenant_id=p_tenant_id and m.module_key=r.module_key;

  update public.tenant_billing_cycles
    set period_start=current_end, period_end=p_next_end
    where tenant_id=p_tenant_id;
  return true;
end;
$$;
revoke execute on function public.selfweb_record_renewal(uuid,date,date) from public, anon, authenticated;
grant execute on function public.selfweb_record_renewal(uuid,date,date) to authenticated;