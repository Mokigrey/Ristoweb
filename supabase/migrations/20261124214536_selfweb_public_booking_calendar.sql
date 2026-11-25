create table public.booking_rules (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  duration_minutes integer not null default 30 check (duration_minutes in (15, 30, 45, 60, 90, 120)),
  notice_minutes integer not null default 60 check (notice_minutes in (0, 60, 120, 240, 1440)),
  horizon_days integer not null default 14 check (horizon_days in (7, 14, 30, 60)),
  max_party_size integer not null default 1 check (max_party_size between 1 and 30)
);

alter table public.booking_rules enable row level security;
revoke all on public.booking_rules from public, anon, authenticated;
grant select, insert, update on public.booking_rules to authenticated;
grant select, insert, update, delete on public.booking_rules to service_role;

create policy "Booking managers configure enabled booking modules" on public.booking_rules
for all to authenticated
using (
  ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
  and exists (select 1 from public.tenant_modules as module
    where module.tenant_id = booking_rules.tenant_id and module.module_key = 'bookings' and module.enabled)
)
with check (
  ((select selfweb_private.is_platform_admin()) or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
  and exists (select 1 from public.tenant_modules as module
    where module.tenant_id = booking_rules.tenant_id and module.module_key = 'bookings' and module.enabled)
);

alter table public.bookings
  add column slot_ends_at timestamptz,
  add column public_request_id uuid,
  add constraint bookings_public_slot_complete check (
    (public_request_id is null and slot_ends_at is null)
    or (public_request_id is not null and slot_ends_at is not null and slot_ends_at > requested_at)
  );

create unique index bookings_public_request_unique on public.bookings (tenant_id, public_request_id)
where public_request_id is not null;

create index bookings_public_contact_rate_idx on public.bookings (tenant_id, customer_phone, created_at)
where public_request_id is not null;

create function selfweb_private.public_booking_site(p_slug text)
returns table (tenant_id uuid, name text, duration_minutes integer, notice_minutes integer, horizon_days integer, max_party_size integer)
language sql stable security invoker set search_path = ''
as $$
  select site.id, coalesce(nullif(btrim(settings.public_name), ''), site.name),
    rules.duration_minutes, rules.notice_minutes, rules.horizon_days, rules.max_party_size
  from public.tenants as site
  join public.booking_rules as rules on rules.tenant_id = site.id and rules.enabled
  join public.tenant_modules as module on module.tenant_id = site.id and module.module_key = 'bookings' and module.enabled
  left join public.site_settings as settings on settings.tenant_id = site.id
  where site.slug = p_slug and site.is_published;
$$;
revoke execute on function selfweb_private.public_booking_site(text) from public, anon, authenticated, service_role;

create function selfweb_private.free_booking_slots(
  p_tenant_id uuid, p_day date, p_duration interval, p_earliest timestamptz
) returns table (slot_start timestamptz, slot_end timestamptz)
language sql stable security invoker set search_path = ''
as $$
  with schedule as (
    select opening_hours -> (array['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'])[extract(isodow from p_day)::int] as day
    from public.site_settings where tenant_id = p_tenant_id
  ), windows as (
    select
      case when open_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p_day + open_at::time end as opens,
      case when close_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p_day + close_at::time end as closes
    from schedule
    cross join lateral (values (day->>'lunch_open',day->>'lunch_close'),(day->>'dinner_open',day->>'dinner_close')) as ranges(open_at,close_at)
    where day->>'closed' is distinct from 'true'
  ), candidates as (
    select
      local_start, local_start at time zone 'Europe/Rome' as starts,
      (local_start + p_duration) at time zone 'Europe/Rome' as ends
    from windows
    cross join lateral generate_series(opens, closes - p_duration, p_duration) as slots(local_start)
  )
  select distinct starts, ends from candidates
  where starts >= p_earliest and ends - starts = p_duration
    and (starts at time zone 'Europe/Rome') = local_start
    and not exists (
      select 1 from public.bookings as existing
      where existing.tenant_id = p_tenant_id and existing.status in ('pending','confirmed')
        and existing.requested_at < ends
        and coalesce(existing.slot_ends_at, existing.requested_at + p_duration) > starts
    )
  order by starts;
$$;
revoke execute on function selfweb_private.free_booking_slots(uuid,date,interval,timestamptz) from public, anon, authenticated, service_role;

create function selfweb_private.public_booking_calendar(p_slug text, p_day date, p_include_slots boolean)
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
  select * into site from selfweb_private.public_booking_site(p_slug);
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
    'durationMinutes', site.duration_minutes, 'maxPartySize', site.max_party_size, 'slots', slots);
end;
$$;

revoke execute on function selfweb_private.public_booking_calendar(text,date,boolean) from public, anon, authenticated, service_role;
grant execute on function selfweb_private.public_booking_calendar(text,date,boolean) to anon, authenticated;

create function public.selfweb_public_booking_calendar(p_slug text, p_day date default null, p_include_slots boolean default true)
returns jsonb
language sql stable security invoker set search_path = ''
begin atomic
  select selfweb_private.public_booking_calendar(p_slug,p_day,p_include_slots);
end;
revoke execute on function public.selfweb_public_booking_calendar(text,date,boolean) from public, anon, authenticated, service_role;
grant execute on function public.selfweb_public_booking_calendar(text,date,boolean) to anon, authenticated;

create function selfweb_private.guard_booking_schedule()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rules public.booking_rules%rowtype;
  duration interval;
begin
  if new.status not in ('pending','confirmed') then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text, 1843));

  if new.status = 'confirmed' then
    select * into rules from public.booking_rules where tenant_id = new.tenant_id;
    duration := make_interval(mins => coalesce(rules.duration_minutes, 30));
    if exists (
      select 1 from public.bookings as existing
      where existing.tenant_id = new.tenant_id and existing.id <> new.id and existing.status = 'confirmed'
        and (coalesce(rules.enabled, false) or existing.slot_ends_at is not null or new.slot_ends_at is not null)
        and existing.requested_at < coalesce(new.slot_ends_at, new.requested_at + duration)
        and coalesce(existing.slot_ends_at, existing.requested_at + duration) > new.requested_at
    ) then
      raise exception using errcode = '23P01', message = 'Booking overlaps a confirmed appointment';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function selfweb_private.guard_booking_schedule() from public, anon, authenticated, service_role;
create trigger guard_booking_schedule before insert or update of status, requested_at, slot_ends_at
on public.bookings for each row execute function selfweb_private.guard_booking_schedule();

create function selfweb_private.reserve_public_booking(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  site record;
  phone_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  booking_end timestamptz;
  earliest timestamptz;
  local_day date;
begin
  if p_request_id is null or p_slot is null or not isfinite(p_slot)
    or coalesce(char_length(btrim(p_name)), 0) not between 1 and 150
    or char_length(phone_digits) not between 6 and 18 or char_length(p_phone) > 40
    or (nullif(btrim(p_email), '') is not null and (char_length(p_email) > 254 or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
    or p_party_size is null or p_party_size not between 1 and 30 then return 'invalid'; end if;

  select * into site from selfweb_private.public_booking_site(p_slug);
  if not found then return 'unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(site.tenant_id::text, 1843));
  select * into site from selfweb_private.public_booking_site(p_slug);
  if not found then return 'unavailable'; end if;

  if exists (select 1 from public.bookings where tenant_id = site.tenant_id and public_request_id = p_request_id) then
    if exists (select 1 from public.bookings where tenant_id = site.tenant_id and public_request_id = p_request_id
      and requested_at = p_slot and customer_phone = phone_digits and status = 'confirmed') then return 'confirmed'; end if;
    return 'unavailable';
  end if;
  if p_party_size > site.max_party_size then return 'invalid'; end if;

  earliest := clock_timestamp() + make_interval(mins => site.notice_minutes);
  local_day := (p_slot at time zone 'Europe/Rome')::date;
  if local_day not between (earliest at time zone 'Europe/Rome')::date
    and (clock_timestamp() at time zone 'Europe/Rome')::date + site.horizon_days - 1 then return 'unavailable'; end if;

  if (select count(*) from public.bookings where tenant_id = site.tenant_id and customer_phone = phone_digits
    and public_request_id is not null and created_at >= now() - interval '24 hours') >= 3 then
    return 'limit_reached';
  end if;

  select slot_end into booking_end
  from selfweb_private.free_booking_slots(site.tenant_id, local_day, make_interval(mins => site.duration_minutes), earliest)
  where slot_start = p_slot;
  if not found then return 'unavailable'; end if;

  insert into public.bookings (tenant_id, customer_name, customer_phone, customer_email, party_size,
    requested_at, status, slot_ends_at, public_request_id)
  values (site.tenant_id, btrim(p_name), phone_digits, nullif(btrim(p_email), ''), p_party_size,
    p_slot, 'confirmed', booking_end, p_request_id);
  return 'confirmed';
end;
$$;
revoke execute on function selfweb_private.reserve_public_booking(text,timestamptz,uuid,text,text,text,integer)
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.reserve_public_booking(text,timestamptz,uuid,text,text,text,integer) to anon, authenticated;

create function public.selfweb_reserve_public_booking(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer
) returns text
language sql security invoker set search_path = ''
begin atomic
  select selfweb_private.reserve_public_booking(p_slug,p_slot,p_request_id,p_name,p_phone,p_email,p_party_size);
end;
revoke execute on function public.selfweb_reserve_public_booking(text,timestamptz,uuid,text,text,text,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_reserve_public_booking(text,timestamptz,uuid,text,text,text,integer) to anon, authenticated;
