create function selfweb_private.create_site_draft(
  p_name text,
  p_slug text,
  p_sector text,
  p_template text,
  p_city text default null,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_site_id uuid;
  site_name text := btrim(p_name);
  site_slug text := lower(btrim(p_slug));
  site_city text := nullif(btrim(p_city), '');
  site_description text := nullif(btrim(p_description), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if site_name is null or char_length(site_name) not between 2 and 150
    or site_slug is null or char_length(site_slug) not between 2 and 80
    or site_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(site_city) > 255 or char_length(site_description) > 4000 then
    raise exception 'Invalid draft data' using errcode = '22023';
  end if;

  insert into public.tenants (name, slug, business_type, template_key, plan_type, is_published)
  values (site_name, site_slug, p_sector, p_template, 'subscription', false)
  returning id into new_site_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_site_id, current_user_id, 'tenant_admin');

  insert into public.site_settings (tenant_id, public_name, city, description)
  values (new_site_id, site_name, site_city, site_description);
  return new_site_id;
end;
$$;

revoke execute on function selfweb_private.create_site_draft(text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.create_site_draft(text,text,text,text,text,text) to authenticated;

-- The stored SQL body binds the private function at creation time, so clients
-- need EXECUTE but no USAGE on selfweb_private.
create function public.selfweb_create_site_draft(
  p_name text,
  p_slug text,
  p_sector text,
  p_template text,
  p_city text default null,
  p_description text default null
) returns uuid
language sql
security invoker
set search_path = ''
begin atomic
  select selfweb_private.create_site_draft(p_name, p_slug, p_sector, p_template, p_city, p_description);
end;

revoke execute on function public.selfweb_create_site_draft(text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_create_site_draft(text,text,text,text,text,text) to authenticated;