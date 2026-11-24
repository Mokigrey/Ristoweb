drop index public.bookings_public_contact_rate_idx;
create index bookings_public_contact_rate_idx
on public.bookings (tenant_id, regexp_replace(customer_phone, '[^0-9]', '', 'g'), created_at)
where public_request_id is not null;

create or replace function selfweb_private.reserve_public_booking(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  site record;
  locked_tenant_id uuid;
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  booking_end timestamptz;
  earliest timestamptz;
  local_day date;
begin
  if p_request_id is null or p_slot is null or not isfinite(p_slot)
    or coalesce(char_length(btrim(p_name)), 0) not between 1 and 150
    or char_length(phone_digits) not between 6 and 18 or char_length(p_phone) > 40
    or p_phone !~ '^[+0-9(). /-]+$'
    or (nullif(btrim(p_email), '') is not null and (char_length(p_email) > 254 or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
    or p_party_size is null or p_party_size not between 1 and 30 then return 'invalid'; end if;

  select * into site from selfweb_private.public_booking_site(p_slug);
  if not found then return 'unavailable'; end if;
  locked_tenant_id := site.tenant_id;
  perform pg_advisory_xact_lock(hashtextextended(locked_tenant_id::text, 1843));
  select * into site from selfweb_private.public_booking_site(p_slug);
  if not found or site.tenant_id is distinct from locked_tenant_id then return 'unavailable'; end if;

  if exists (select 1 from public.bookings where tenant_id = site.tenant_id and public_request_id = p_request_id) then
    if exists (select 1 from public.bookings where tenant_id = site.tenant_id and public_request_id = p_request_id
      and requested_at = p_slot and regexp_replace(customer_phone, '[^0-9]', '', 'g') = phone_digits and status = 'confirmed') then return 'confirmed'; end if;
    return 'unavailable';
  end if;
  if p_party_size > site.max_party_size then return 'invalid'; end if;

  earliest := clock_timestamp() + make_interval(mins => site.notice_minutes);
  local_day := (p_slot at time zone 'Europe/Rome')::date;
  if local_day not between (earliest at time zone 'Europe/Rome')::date
    and (clock_timestamp() at time zone 'Europe/Rome')::date + site.horizon_days - 1 then return 'unavailable'; end if;

  if (select count(*) from public.bookings where tenant_id = site.tenant_id and regexp_replace(customer_phone, '[^0-9]', '', 'g') = phone_digits
    and public_request_id is not null and created_at >= now() - interval '24 hours') >= 3 then
    return 'limit_reached';
  end if;

  select slot_end into booking_end
  from selfweb_private.free_booking_slots(site.tenant_id, local_day, make_interval(mins => site.duration_minutes), earliest)
  where slot_start = p_slot;
  if not found then return 'unavailable'; end if;

  insert into public.bookings (tenant_id, customer_name, customer_phone, customer_email, party_size,
    requested_at, status, slot_ends_at, public_request_id)
  values (site.tenant_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''), p_party_size,
    p_slot, 'confirmed', booking_end, p_request_id);
  return 'confirmed';
end;
$$;
