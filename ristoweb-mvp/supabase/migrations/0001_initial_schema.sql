-- RistoWeb MVP: schema iniziale multi-tenant.
-- Applicare in un progetto Supabase di sviluppo, dopo aver verificato il modello.

create extension if not exists pgcrypto;

create type public.platform_role as enum ('platform_admin');
create type public.tenant_role as enum ('tenant_admin', 'tenant_editor');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
create type public.booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  business_type text not null default 'restaurant',
  plan_type text not null default 'subscription' check (plan_type in ('license', 'subscription')),
  subscription_status public.subscription_status not null default 'trialing',
  template_key text not null default 'tradizionale' check (template_key in ('tradizionale', 'moderno', 'mediterraneo')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'tenant_editor',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.platform_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.platform_role not null default 'platform_admin'
);

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname text not null unique,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  public_name text not null,
  tagline text,
  description text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  opening_hours jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  logo_path text,
  hero_image_path text,
  updated_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(8,2) check (price is null or price >= 0),
  image_path text,
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  image_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  party_size integer not null check (party_size between 1 and 30),
  requested_at timestamptz not null,
  notes text,
  status public.booking_status not null default 'pending',
  management_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_tenant_requested_at_idx on public.bookings(tenant_id, requested_at);
create index menu_items_tenant_category_idx on public.menu_items(tenant_id, category_id);
create index domains_hostname_idx on public.domains(hostname);

-- Funzioni di autorizzazione usate dalle policy RLS.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.platform_members pm where pm.user_id = auth.uid()); $$;

create or replace function public.has_tenant_role(target_tenant uuid, allowed_roles public.tenant_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = target_tenant
      and tm.user_id = auth.uid()
      and tm.role = any(allowed_roles)
  );
$$;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.platform_members enable row level security;
alter table public.domains enable row level security;
alter table public.site_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.gallery_images enable row level security;
alter table public.bookings enable row level security;

-- Amministrazione piattaforma e membri del singolo tenant.
create policy "platform admins manage tenants" on public.tenants for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "members read own tenant" on public.tenants for select to authenticated
using (exists (select 1 from public.tenant_members tm where tm.tenant_id = id and tm.user_id = auth.uid()));

create policy "platform admins manage tenant members" on public.tenant_members for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "members read own membership" on public.tenant_members for select to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

create policy "platform admins manage platform members" on public.platform_members for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Tabelle di configurazione: il cliente può modificare solo il proprio tenant.
create policy "tenant members read domains" on public.domains for select to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));
create policy "tenant admins manage domains" on public.domains for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin']::public.tenant_role[]));

create policy "tenant members read site settings" on public.site_settings for select to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));
create policy "tenant members edit site settings" on public.site_settings for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));

create policy "tenant members manage menu categories" on public.menu_categories for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));
create policy "tenant members manage menu items" on public.menu_items for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));
create policy "tenant members manage gallery" on public.gallery_images for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));
create policy "tenant members manage bookings" on public.bookings for all to authenticated
using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]))
with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['tenant_admin','tenant_editor']::public.tenant_role[]));

-- NOTA: le letture pubbliche dei siti e l'invio pubblico delle prenotazioni
-- devono passare da endpoint server-side controllati. Non abilitare anon access
-- diretto alle tabelle private. Le policy pubbliche verranno aggiunte solo dopo
-- aver definito con precisione i campi pubblicabili e i controlli anti-spam.
