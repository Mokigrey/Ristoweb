create or replace function selfweb_private.public_booking_status(p_slug text, p_request_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', booking.status,
    'canCancel', booking.status in ('pending','confirmed') and booking.requested_at > now(),
    'startsAt', booking.requested_at,
    'name', coalesce(nullif(btrim(settings.public_name), ''), site.name),
    'serviceName', booking.booking_service_name,
    'durationMinutes', (extract(epoch from booking.slot_ends_at - booking.requested_at) / 60)::integer
  )
  from public.tenants as site
  join public.bookings as booking on booking.tenant_id = site.id
    and booking.public_request_id = p_request_id
  left join public.site_settings as settings on settings.tenant_id = site.id
  where site.slug = p_slug and site.is_published;
$$;
