create table public.tenant_draft_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null references public.module_catalog(module_key),
  primary key (tenant_id, module_key)
);
create index tenant_draft_modules_module_key_idx on public.tenant_draft_modules (module_key);

alter table public.tenant_draft_modules enable row level security;
revoke all on public.tenant_draft_modules from public, anon, authenticated;
grant select, insert, delete on public.tenant_draft_modules to authenticated;
grant select, insert, update, delete on public.tenant_draft_modules to service_role;

create policy "Members read own draft module selections" on public.tenant_draft_modules
for select to authenticated using (
  (select selfweb_private.is_platform_admin())
  or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[])
);

create policy "Owners add optional modules to their draft" on public.tenant_draft_modules
for insert to authenticated with check (
  ((select selfweb_private.is_platform_admin())
    or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin']::public.tenant_role[]))
  and exists (select 1 from public.tenants t where t.id=tenant_draft_modules.tenant_id
    and not t.is_published and t.plan_type='subscription' and t.subscription_status='trialing')
);

create policy "Owners remove optional modules from their draft" on public.tenant_draft_modules
for delete to authenticated using (
  ((select selfweb_private.is_platform_admin())
    or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin']::public.tenant_role[]))
  and exists (select 1 from public.tenants t where t.id=tenant_draft_modules.tenant_id
    and not t.is_published and t.plan_type='subscription' and t.subscription_status='trialing')
);

create function public.selfweb_save_draft_modules(p_tenant_id uuid, p_module_keys text[])
returns boolean language plpgsql security invoker set search_path = ''
as $$
begin
  if not exists (select 1 from public.platform_members
    where user_id=(select auth.uid()) and role='platform_admin')
  and not exists (select 1 from public.tenant_members
    where user_id=(select auth.uid()) and tenant_id=p_tenant_id and role='tenant_admin') then
    return false;
  end if;

  if p_module_keys is null or array_position(p_module_keys, null) is not null then return false; end if;
  if not exists (select 1 from public.tenants where id=p_tenant_id and not is_published
      and plan_type='subscription' and subscription_status='trialing') then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tenant_id::text, 1842));
  delete from public.tenant_draft_modules
  where tenant_id=p_tenant_id and not (module_key = any(p_module_keys));

  insert into public.tenant_draft_modules (tenant_id,module_key)
  select p_tenant_id,key from unnest(p_module_keys) as keys(key)
  on conflict do nothing;

  return true;
end;
$$;

revoke execute on function public.selfweb_save_draft_modules(uuid,text[]) from public, anon, authenticated;
grant execute on function public.selfweb_save_draft_modules(uuid,text[]) to authenticated;