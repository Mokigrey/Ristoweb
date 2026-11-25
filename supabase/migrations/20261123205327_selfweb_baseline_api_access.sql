-- Applica anche a progetti recenti con grant automatici disattivati.
-- Le policy RLS esistenti continuano a delimitare righe e operazioni.
grant select, insert, update, delete on
  public.tenants, public.tenant_members, public.platform_members, public.domains,
  public.site_settings, public.menu_categories, public.menu_items,
  public.gallery_images, public.bookings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'platform_members'
      and policyname = 'Users can read own platform role'
  ) then
    create policy "Users can read own platform role" on public.platform_members
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
end
$$;
