insert into public.module_catalog (module_key, label, description)
values ('bookings', 'Prenotazioni', 'Organizza gli appuntamenti e gestisci le richieste di prenotazione.')
on conflict (module_key) do nothing;

revoke all on public.bookings from public, anon, authenticated;
grant select on public.bookings to authenticated;
grant insert (tenant_id, customer_name, customer_email, customer_phone, party_size, requested_at, notes)
  on public.bookings to authenticated;

alter policy "tenant members manage bookings" on public.bookings
  using (
    ((select selfweb_private.is_platform_admin())
      or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
    and exists (select 1 from public.tenant_modules as module
      where module.tenant_id = bookings.tenant_id and module.module_key = 'bookings' and module.enabled)
  )
  with check (
    ((select selfweb_private.is_platform_admin())
      or selfweb_private.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
    and exists (select 1 from public.tenant_modules as module
      where module.tenant_id = bookings.tenant_id and module.module_key = 'bookings' and module.enabled)
  );

create function public.selfweb_create_manual_booking(
  p_tenant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_party_size integer,
  p_requested_local timestamp without time zone,
  p_notes text
) returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  requested timestamptz;
  booking_id uuid;
begin
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 1 and 150
    or p_customer_phone is null or char_length(btrim(p_customer_phone)) not between 1 and 40
    or char_length(p_customer_email) > 254 or p_party_size is null or p_party_size not between 1 and 30
    or p_requested_local is null or not isfinite(p_requested_local) or char_length(p_notes) > 1000 then
    return null;
  end if;

  requested := p_requested_local at time zone 'Europe/Rome';
  if (requested at time zone 'Europe/Rome') <> p_requested_local then return null; end if;

  insert into public.bookings (tenant_id, customer_name, customer_phone, customer_email, party_size, requested_at, notes)
  values (p_tenant_id, btrim(p_customer_name), btrim(p_customer_phone), nullif(btrim(p_customer_email), ''),
          p_party_size, requested, nullif(btrim(p_notes), ''))
  returning id into booking_id;
  return booking_id;
end;
$$;

revoke execute on function public.selfweb_create_manual_booking(uuid,text,text,text,integer,timestamp without time zone,text)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_create_manual_booking(uuid,text,text,text,integer,timestamp without time zone,text)
  to authenticated;

create function selfweb_private.change_booking_status(
  p_tenant_id uuid, p_booking_id uuid, p_expected_status public.booking_status, p_new_status public.booking_status
) returns boolean
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    selfweb_private.is_platform_admin()
    or selfweb_private.has_tenant_role(p_tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[])
  ) then return false; end if;

  if not coalesce(
    (p_expected_status = 'pending' and p_new_status in ('confirmed','declined'))
    or (p_expected_status = 'confirmed' and p_new_status = 'cancelled'), false
  ) then return false; end if;

  update public.bookings as booking set status = p_new_status, updated_at = now()
  where booking.id = p_booking_id and booking.tenant_id = p_tenant_id and booking.status = p_expected_status
    and exists (select 1 from public.tenant_modules as module
      where module.tenant_id = booking.tenant_id and module.module_key = 'bookings' and module.enabled);
  return found;
end;
$$;

revoke execute on function selfweb_private.change_booking_status(uuid,uuid,public.booking_status,public.booking_status)
  from public, anon, authenticated, service_role;
grant execute on function selfweb_private.change_booking_status(uuid,uuid,public.booking_status,public.booking_status)
  to authenticated;

create function public.selfweb_change_booking_status(
  p_tenant_id uuid, p_booking_id uuid, p_expected_status public.booking_status, p_new_status public.booking_status
) returns boolean
language sql security invoker
set search_path = ''
begin atomic
  select selfweb_private.change_booking_status(p_tenant_id,p_booking_id,p_expected_status,p_new_status);
end;

revoke execute on function public.selfweb_change_booking_status(uuid,uuid,public.booking_status,public.booking_status)
  from public, anon, authenticated, service_role;
grant execute on function public.selfweb_change_booking_status(uuid,uuid,public.booking_status,public.booking_status)
  to authenticated;
