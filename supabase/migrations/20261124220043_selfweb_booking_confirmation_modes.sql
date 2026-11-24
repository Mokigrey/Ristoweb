alter table public.booking_rules
  add column confirmation_mode text not null default 'manual'
    check (confirmation_mode in ('manual', 'automatic'));

create or replace function selfweb_private.public_booking_calendar(p_slug text, p_day date, p_include_slots boolean)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  site record;
  earliest timestamptz;
  first_day date;
  last_day date;
  selected_day date;
  slots jsonb := '[]'::jsonb;
begin
  select booking_site.*, rules.confirmation_mode into site
  from selfweb_private.public_booking_site(p_slug) as booking_site
  join public.booking_rules as rules on rules.tenant_id = booking_site.tenant_id;
  if not found then return null; end if;

  earliest := now() + make_interval(mins => site.notice_minutes);
  first_day := (earliest at time zone 'Europe/Rome')::date;
  last_day := (now() at time zone 'Europe/Rome')::date + site.horizon_days - 1;
  selected_day := case when p_day between first_day and last_day then p_day else first_day end;
  if p_include_slots then
    select coalesce(jsonb_agg(slot_start order by slot_start), '[]'::jsonb) into slots
    from selfweb_private.free_booking_slots(site.tenant_id, selected_day, make_interval(mins => site.duration_minutes), earliest);
  end if;

  return jsonb_build_object('name', site.name, 'firstDay', first_day, 'lastDay', last_day, 'selectedDay', selected_day,
    'durationMinutes', site.duration_minutes, 'maxPartySize', site.max_party_size, 'confirmationMode', site.confirmation_mode, 'slots', slots);
end;
$$;

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
  stored_result text;
  initial_status public.booking_status;
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
  select booking_site.*, rules.confirmation_mode into site
  from selfweb_private.public_booking_site(p_slug) as booking_site
  join public.booking_rules as rules on rules.tenant_id = booking_site.tenant_id;
  if not found or site.tenant_id is distinct from locked_tenant_id then return 'unavailable'; end if;

  select case when existing.requested_at = p_slot and regexp_replace(existing.customer_phone, '[^0-9]', '', 'g') = phone_digits
    and existing.status in ('pending','confirmed') then existing.status::text else 'unavailable' end
  into stored_result
  from public.bookings as existing where existing.tenant_id = site.tenant_id and existing.public_request_id = p_request_id;
  if found then return stored_result; end if;
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

  initial_status := case when site.confirmation_mode = 'automatic'
    then 'confirmed'::public.booking_status else 'pending'::public.booking_status end;

  insert into public.bookings (tenant_id, customer_name, customer_phone, customer_email, party_size,
    requested_at, status, slot_ends_at, public_request_id)
  values (site.tenant_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''), p_party_size,
    p_slot, initial_status, booking_end, p_request_id);
  return initial_status::text;
end;
$$;
