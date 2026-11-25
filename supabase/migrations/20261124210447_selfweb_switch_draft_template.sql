-- Reuse Elegante outside hospitality and restrict template changes to site drafts.
insert into public.sector_templates (sector_key, template_key)
values ('beauty', 'elegante'), ('professional', 'elegante'), ('retail', 'elegante')
on conflict (sector_key, template_key) do nothing;

create function selfweb_private.set_draft_template(p_tenant_id uuid, p_template_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then return false; end if;
  if not exists (
    select 1 from public.platform_members
    where user_id = actor_id and role = 'platform_admin'
  ) and not exists (
    select 1 from public.tenant_members
    where user_id = actor_id and tenant_id = p_tenant_id and role in ('tenant_admin', 'tenant_editor')
  ) then
    return false;
  end if;

  update public.tenants as site
  set template_key = p_template_key
  where site.id = p_tenant_id
    and site.is_published = false
    and site.plan_type = 'subscription'
    and site.subscription_status = 'trialing'
    and exists (
      select 1 from public.sector_templates as catalog
      where catalog.sector_key = site.business_type and catalog.template_key = p_template_key
    );
  return found;
end;
$$;

revoke execute on function selfweb_private.set_draft_template(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.set_draft_template(uuid, text) to authenticated;

create function public.selfweb_set_draft_template(p_tenant_id uuid, p_template_key text)
returns boolean
language sql
security invoker
set search_path = ''
begin atomic
  select selfweb_private.set_draft_template(p_tenant_id, p_template_key);
end;

revoke execute on function public.selfweb_set_draft_template(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_set_draft_template(uuid, text) to authenticated;
