create table public.module_catalog (
  module_key text primary key,
  label text not null,
  description text not null
);

create table public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null references public.module_catalog(module_key),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);
create index tenant_modules_module_key_idx on public.tenant_modules (module_key);

insert into public.module_catalog(module_key,label,description)
values ('digital_menu','Menu digitale','Mostra categorie, prodotti e prezzi nella vetrina.');

-- Maintain existing restaurant workflows and any menu already configured.
insert into public.tenant_modules (tenant_id,module_key,enabled)
select t.id,'digital_menu',true
from public.tenants t
where t.business_type in ('restaurant','pizzeria','restaurant_pizzeria')
  or exists (select 1 from public.menu_categories c where c.tenant_id=t.id);

alter table public.module_catalog enable row level security;
alter table public.tenant_modules enable row level security;
revoke all on public.module_catalog, public.tenant_modules from public, anon, authenticated;
grant select on public.module_catalog to authenticated;
grant select, insert, update on public.tenant_modules to authenticated;
grant select, insert, update, delete on public.module_catalog, public.tenant_modules to service_role;

create policy "Signed in users read module catalog" on public.module_catalog
  for select to authenticated using (true);

create policy "Members read own module states" on public.tenant_modules
  for select to authenticated using (
    (select selfweb_private.is_platform_admin())
    or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[])
  );

create policy "Platform admins assign modules" on public.tenant_modules
  for insert to authenticated with check ((select selfweb_private.is_platform_admin()));

create policy "Platform admins update modules" on public.tenant_modules
  for update to authenticated
  using ((select selfweb_private.is_platform_admin()))
  with check ((select selfweb_private.is_platform_admin()));

alter policy "tenant members manage menu categories" on public.menu_categories
  using (
  (selfweb_private.is_platform_admin() or selfweb_private.has_tenant_role(
    menu_categories.tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]
  ))
  and exists (
    select 1 from public.tenant_modules as entitlement
    where entitlement.tenant_id = menu_categories.tenant_id
      and entitlement.module_key = 'digital_menu' and entitlement.enabled
  )
)
  with check (
  (selfweb_private.is_platform_admin() or selfweb_private.has_tenant_role(
    menu_categories.tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]
  ))
  and exists (
    select 1 from public.tenant_modules as entitlement
    where entitlement.tenant_id = menu_categories.tenant_id
      and entitlement.module_key = 'digital_menu' and entitlement.enabled
  )
);

alter policy "tenant members manage menu items" on public.menu_items
  using (
  (selfweb_private.is_platform_admin() or selfweb_private.has_tenant_role(
    menu_items.tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]
  ))
  and exists (
    select 1 from public.tenant_modules as entitlement
    where entitlement.tenant_id = menu_items.tenant_id
      and entitlement.module_key = 'digital_menu' and entitlement.enabled
  )
)
  with check (
  (selfweb_private.is_platform_admin() or selfweb_private.has_tenant_role(
    menu_items.tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]
  ))
  and exists (
    select 1 from public.tenant_modules as entitlement
    where entitlement.tenant_id = menu_items.tenant_id
      and entitlement.module_key = 'digital_menu' and entitlement.enabled
  )
);