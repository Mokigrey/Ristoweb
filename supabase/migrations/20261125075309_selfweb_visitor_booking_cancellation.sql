create or replace function selfweb_private.public_booking_status(p_slug text, p_request_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', booking.status,
    'canCancel', booking.status in ('pending','confirmed') and booking.requested_at > now(),
    'startsAt', booking.requested_at,
    'name', coalesce(nullif(btrim(settings.public_name), ''), site.name)
  )
  from public.tenants as site
  join public.bookings as booking on booking.tenant_id = site.id
    and booking.public_request_id = p_request_id
  left join public.site_settings as settings on settings.tenant_id = site.id
  where site.slug = p_slug and site.is_published;
$$;

create function selfweb_private.cancel_public_booking(p_slug text, p_request_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.bookings as booking
  set status = 'cancelled', updated_at = now()
  from public.tenants as site
  where booking.tenant_id = site.id and site.slug = p_slug and site.is_published
    and booking.public_request_id = p_request_id and booking.status in ('pending','confirmed')
    and booking.requested_at > now();

  return selfweb_private.public_booking_status(p_slug, p_request_id);
end;
$$;
revoke execute on function selfweb_private.cancel_public_booking(text,uuid) from public, anon, authenticated, service_role;
grant execute on function selfweb_private.cancel_public_booking(text,uuid) to anon, authenticated;

create function public.selfweb_cancel_public_booking(p_slug text, p_request_id uuid)
returns jsonb
language sql security invoker
set search_path = ''
begin atomic
  select selfweb_private.cancel_public_booking(p_slug,p_request_id);
end;
revoke execute on function public.selfweb_cancel_public_booking(text,uuid) from public, anon, authenticated, service_role;
grant execute on function public.selfweb_cancel_public_booking(text,uuid) to anon, authenticated;
