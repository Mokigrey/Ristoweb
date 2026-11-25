create function public.selfweb_manage_gallery_image(
  p_tenant_id uuid, p_image_id uuid, p_command text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_position integer;
  target_position integer;
  visible_count integer;
begin
  if not exists (
    select 1 from public.platform_members
    where user_id = (select auth.uid()) and role = 'platform_admin'
  ) then
    return false;
  end if;

  -- Serialize moves and visibility changes for this site.
  perform id from public.tenants where id = p_tenant_id for no key update;
  if not found then return false; end if;

  if p_command = 'archive' or p_command = 'restore' then
    update public.gallery_images
    set is_visible = p_command = 'restore',
        sort_order = case when p_command = 'restore' then 2147483647 else sort_order end
    where tenant_id = p_tenant_id and id = p_image_id
      and is_visible = (p_command = 'archive');
    return found;
  end if;

  if p_command is null or p_command not in ('up', 'down') then return false; end if;

  select max(position) filter (where id = p_image_id), count(*)::integer
  into current_position, visible_count
  from (
    select id, row_number() over (order by sort_order, created_at, id)::integer as position
    from public.gallery_images
    where tenant_id = p_tenant_id and is_visible
  ) visible;

  target_position := current_position + case when p_command = 'up' then -1 else 1 end;
  if target_position is null or target_position not between 1 and visible_count then return false; end if;

  with ordered as (
    select id, row_number() over (order by sort_order, created_at, id)::integer as position
    from public.gallery_images
    where tenant_id = p_tenant_id and is_visible
  )
  update public.gallery_images as image
  set sort_order = case
    when ordered.position = current_position then target_position
    when ordered.position = target_position then current_position
    else ordered.position
  end
  from ordered
  where image.id = ordered.id and image.tenant_id = p_tenant_id;

  return true;
end;
$$;

revoke execute on function public.selfweb_manage_gallery_image(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.selfweb_manage_gallery_image(uuid, uuid, text)
  to authenticated;