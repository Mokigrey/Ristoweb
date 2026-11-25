create schema selfweb_private;
revoke all on schema selfweb_private from public, anon, authenticated, service_role;

alter function public.is_platform_admin() set schema selfweb_private;
alter function public.has_tenant_role(uuid,public.tenant_role[]) set schema selfweb_private;

alter function selfweb_private.is_platform_admin() set search_path = '';
alter function selfweb_private.has_tenant_role(uuid,public.tenant_role[]) set search_path = '';

revoke execute on function selfweb_private.is_platform_admin(),
  selfweb_private.has_tenant_role(uuid,public.tenant_role[])
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.is_platform_admin(),
  selfweb_private.has_tenant_role(uuid,public.tenant_role[])
  to authenticated;