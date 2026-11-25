create table public.monthly_prices (
  price_key text primary key,
  module_key text unique references public.module_catalog(module_key),
  amount_cents integer,
  constraint monthly_prices_valid_key check (
    (price_key = 'base' and module_key is null)
    or (price_key <> 'base' and module_key is not null and price_key = module_key)
  ),
  constraint monthly_prices_valid_amount check (amount_cents between 0 and 99999999)
);
alter table public.monthly_prices enable row level security;
revoke all on public.monthly_prices from public, anon, authenticated;
grant select, insert, update on public.monthly_prices to authenticated;
grant select, insert, update, delete on public.monthly_prices to service_role;

create policy "Signed in users read monthly tariffs" on public.monthly_prices
  for select to authenticated using (true);
create policy "Platform admins create monthly tariffs" on public.monthly_prices
  for insert to authenticated with check ((select selfweb_private.is_platform_admin()));
create policy "Platform admins edit monthly tariffs" on public.monthly_prices
  for update to authenticated
  using ((select selfweb_private.is_platform_admin()))
  with check ((select selfweb_private.is_platform_admin()));
