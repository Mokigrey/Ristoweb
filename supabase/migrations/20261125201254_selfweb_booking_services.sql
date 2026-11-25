create table public.booking_services (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100 and name = btrim(name)),
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60, 90, 120)),
  enabled boolean not null default true,
  primary key (tenant_id, id)
);

alter table public.booking_services enable row level security;
revoke all on public.booking_services from public, anon, authenticated;
grant select, insert on public.booking_services to authenticated;
grant update (name, duration_minutes, enabled) on public.booking_services to authenticated;
grant select, insert, update, delete on public.booking_services to service_role;

create policy "Manage booking services for assigned sites" on public.booking_services
for all to authenticated
using (
  ((select selfweb_private.is_platform_admin()) or
    selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
  and exists (select 1 from public.tenant_modules as module
    where module.tenant_id = booking_services.tenant_id and module.module_key = 'bookings' and module.enabled)
)
with check (
  ((select selfweb_private.is_platform_admin()) or
    selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
  and exists (select 1 from public.tenant_modules as module
    where module.tenant_id = booking_services.tenant_id and module.module_key = 'bookings' and module.enabled)
);

alter table public.bookings
  add column booking_service_id uuid,
  add column booking_service_name text,
  add constraint bookings_service_fk foreign key (tenant_id, booking_service_id)
    references public.booking_services (tenant_id, id),
  add constraint bookings_service_snapshot check (
    (booking_service_id is null) = (booking_service_name is null)
  );

create index bookings_service_idx on public.bookings (tenant_id, booking_service_id)
where booking_service_id is not null;

create or replace function selfweb_private.free_booking_slots(
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
        and coalesce(existing.slot_ends_at, existing.requested_at + make_interval(mins => coalesce(
          (select duration_minutes from public.booking_rules where tenant_id = p_tenant_id), 30))) > starts
    )
  order by starts;
$$;
create or replace function selfweb_private.public_booking_calendar(p_slug text, p_day date, p_include_slots boolean, p_service_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  site record;
  earliest timestamptz;
  service public.booking_services%rowtype;
  services jsonb := '[]'::jsonb;
  duration integer;
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
  duration := site.duration_minutes;
  if p_include_slots then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'durationMinutes', duration_minutes)
      order by name, id), '[]'::jsonb)
    into services from public.booking_services where tenant_id = site.tenant_id and enabled;

    select * into service from public.booking_services
    where tenant_id = site.tenant_id and enabled
    order by (id = p_service_id) desc nulls last, name, id limit 1;
    duration := coalesce(service.duration_minutes, duration);
    select coalesce(jsonb_agg(slot_start order by slot_start), '[]'::jsonb) into slots
    from selfweb_private.free_booking_slots(site.tenant_id, selected_day, make_interval(mins => duration), earliest);
  end if;

  return jsonb_build_object('name', site.name, 'firstDay', first_day, 'lastDay', last_day, 'selectedDay', selected_day,
    'durationMinutes', duration, 'serviceId', service.id, 'services', services, 'maxPartySize', site.max_party_size, 'confirmationMode', site.confirmation_mode, 'slots', slots);
end;
$$;

create or replace function selfweb_private.reserve_public_booking(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer,
  p_service_id uuid, p_expected_duration integer
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
  service public.booking_services%rowtype;
  duration integer;
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
    and (p_expected_duration is null or existing.booking_service_id is not distinct from p_service_id)
    and existing.status in ('pending','confirmed') then existing.status::text else 'unavailable' end
  into stored_result
  from public.bookings as existing where existing.tenant_id = site.tenant_id and existing.public_request_id = p_request_id;
  if found then return stored_result; end if;
  if p_party_size > site.max_party_size then return 'invalid'; end if;

  select * into service from public.booking_services
  where tenant_id = site.tenant_id and enabled and (p_service_id is null or id = p_service_id)
  order by name, id limit 1 for share;
  if (p_service_id is not null and service.id is null)
    or (p_expected_duration is not null and service.id is distinct from p_service_id) then return 'unavailable'; end if;
  duration := coalesce(service.duration_minutes, site.duration_minutes);
  if p_expected_duration is not null and p_expected_duration <> duration then return 'unavailable'; end if;

  earliest := clock_timestamp() + make_interval(mins => site.notice_minutes);
  local_day := (p_slot at time zone 'Europe/Rome')::date;
  if local_day not between (earliest at time zone 'Europe/Rome')::date
    and (clock_timestamp() at time zone 'Europe/Rome')::date + site.horizon_days - 1 then return 'unavailable'; end if;

  if (select count(*) from public.bookings where tenant_id = site.tenant_id and regexp_replace(customer_phone, '[^0-9]', '', 'g') = phone_digits
    and public_request_id is not null and created_at >= now() - interval '24 hours') >= 3 then
    return 'limit_reached';
  end if;

  select slot_end into booking_end
  from selfweb_private.free_booking_slots(site.tenant_id, local_day, make_interval(mins => duration), earliest)
  where slot_start = p_slot;
  if not found then return 'unavailable'; end if;

  initial_status := case when site.confirmation_mode = 'automatic'
    then 'confirmed'::public.booking_status else 'pending'::public.booking_status end;

  insert into public.bookings (tenant_id, customer_name, customer_phone, customer_email, party_size,
    requested_at, status, slot_ends_at, public_request_id, booking_service_id, booking_service_name)
  values (site.tenant_id, btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''), p_party_size,
    p_slot, initial_status, booking_end, p_request_id, service.id, service.name);
  return initial_status::text;
end;
$$;

create or replace function selfweb_private.public_booking_calendar(p_slug text, p_day date, p_include_slots boolean)
returns jsonb language sql stable security invoker set search_path = ''
begin atomic
  select selfweb_private.public_booking_calendar(p_slug, p_day, p_include_slots, null);
end;

create or replace function selfweb_private.reserve_public_booking(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer
) returns text language sql security invoker set search_path = ''
begin atomic
  select selfweb_private.reserve_public_booking(p_slug, p_slot, p_request_id, p_name, p_phone,
    p_email, p_party_size, null, null);
end;

create function public.selfweb_public_service_calendar(
  p_slug text, p_day date, p_include_slots boolean, p_service_id uuid
) returns jsonb language sql stable security invoker set search_path = ''
begin atomic
  select selfweb_private.public_booking_calendar(p_slug, p_day, p_include_slots, p_service_id);
end;

create function public.selfweb_reserve_public_service(
  p_slug text, p_slot timestamptz, p_request_id uuid, p_name text, p_phone text, p_email text, p_party_size integer,
  p_service_id uuid, p_expected_duration integer
) returns text language sql security invoker set search_path = ''
begin atomic
  select selfweb_private.reserve_public_booking(p_slug, p_slot, p_request_id, p_name, p_phone, p_email,
    p_party_size, p_service_id, p_expected_duration);
end;

revoke execute on function
  selfweb_private.public_booking_calendar(text,date,boolean,uuid),
  selfweb_private.reserve_public_booking(text,timestamptz,uuid,text,text,text,integer,uuid,integer),
  public.selfweb_public_service_calendar(text,date,boolean,uuid),
  public.selfweb_reserve_public_service(text,timestamptz,uuid,text,text,text,integer,uuid,integer)
from public, anon, authenticated, service_role;
grant execute on function
  selfweb_private.public_booking_calendar(text,date,boolean,uuid),
  selfweb_private.reserve_public_booking(text,timestamptz,uuid,text,text,text,integer,uuid,integer),
  public.selfweb_public_service_calendar(text,date,boolean,uuid),
  public.selfweb_reserve_public_service(text,timestamptz,uuid,text,text,text,integer,uuid,integer)
to anon, authenticated;
