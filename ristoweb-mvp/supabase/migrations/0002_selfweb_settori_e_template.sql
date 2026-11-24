-- Selfweb. Applicare dopo lo schema iniziale, prima su un progetto di prova.
-- I valori e i default esistenti di tenants restano compatibili durante il passaggio.
begin;

set local lock_timeout = '5s';
lock table public.tenants in access exclusive mode;

create table public.business_sectors (
  sector_key text primary key
);

create table public.site_templates (
  template_key text primary key
);

create table public.sector_templates (
  sector_key text not null references public.business_sectors(sector_key),
  template_key text not null references public.site_templates(template_key),
  primary key (sector_key, template_key)
);

insert into public.business_sectors (sector_key)
values ('restaurant'), ('pizzeria'), ('restaurant_pizzeria'),
       ('beauty'), ('retail'), ('professional');

-- Entrambe le varianti storiche sono registrate per supportare lo starter
-- GitHub (mediterraneo) e lo schema Supabase rilevato (elegante).
insert into public.site_templates (template_key)
values ('tradizionale'), ('moderno'), ('mediterraneo'), ('elegante');

insert into public.business_sectors (sector_key)
select distinct business_type from public.tenants
on conflict do nothing;

insert into public.site_templates (template_key)
select distinct template_key from public.tenants
on conflict do nothing;

-- Il pannello esistente permette di scegliere liberamente un template per
-- ciascuna delle tre tipologie di ristorazione. Conserva queste combinazioni.
insert into public.sector_templates (sector_key, template_key)
select s.sector_key, t.template_key
from public.business_sectors s
cross join public.site_templates t
where s.sector_key in ('restaurant', 'pizzeria', 'restaurant_pizzeria')
  and t.template_key in ('tradizionale', 'moderno', 'mediterraneo', 'elegante');

-- Verificare il renderer prima di esporre le nuove associazioni nell'onboarding.
insert into public.sector_templates (sector_key, template_key)
values ('beauty', 'moderno'), ('retail', 'moderno'), ('professional', 'moderno');

insert into public.sector_templates (sector_key, template_key)
select distinct business_type, template_key from public.tenants
on conflict do nothing;

-- Lo starter e il database esistente possono avere CHECK con nome diverso.
-- Sostituisce solo il CHECK a colonna singola, fermandosi in caso di ambiguità.
do $$
declare
  legacy_constraint text;
  constraint_count integer;
begin
  select min(c.conname::text), count(*)
    into legacy_constraint, constraint_count
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_attribute a
    on a.attrelid = c.conrelid and c.conkey = array[a.attnum]
  where c.conrelid = 'public.tenants'::regclass
    and c.contype = 'c' and a.attname = 'template_key';

  if constraint_count <> 1 then
    raise exception 'Atteso un solo CHECK esistente sulla colonna tenants.template_key';
  end if;

  execute format('alter table public.tenants drop constraint %I', legacy_constraint);
end $$;

alter table public.tenants
  add constraint tenants_sector_template_fk
  foreign key (business_type, template_key)
  references public.sector_templates(sector_key, template_key);

-- Un menu deve fare riferimento a una categoria dello stesso cliente.
-- La validazione interrompe tutta la migrazione se trova dati incompatibili.
alter table public.menu_categories
  add constraint menu_categories_tenant_id_id_key unique (tenant_id, id);

-- Mantiene il nome storico e una sola relazione tra le due tabelle,
-- così le richieste PostgREST che includono la categoria restano univoche.
do $$
declare
  legacy_constraint text;
  constraint_count integer;
begin
  select min(c.conname::text), count(*)
    into legacy_constraint, constraint_count
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_attribute a
    on a.attrelid = c.conrelid and c.conkey = array[a.attnum]
  where c.conrelid = 'public.menu_items'::regclass
    and c.confrelid = 'public.menu_categories'::regclass
    and c.contype = 'f' and a.attname = 'category_id';

  if constraint_count <> 1 then
    raise exception 'Attesa una sola FK storica da menu_items.category_id a menu_categories';
  end if;

  execute format('alter table public.menu_items drop constraint %I', legacy_constraint);
  execute format(
    'alter table public.menu_items add constraint %I
       foreign key (tenant_id, category_id)
       references public.menu_categories(tenant_id, id) on delete cascade',
    legacy_constraint
  );
end $$;

alter table public.business_sectors enable row level security;
alter table public.site_templates enable row level security;
alter table public.sector_templates enable row level security;

revoke all on public.business_sectors, public.site_templates, public.sector_templates
  from public, anon, authenticated;
grant select on public.business_sectors, public.site_templates, public.sector_templates
  to authenticated;
grant select, insert, update, delete
  on public.business_sectors, public.site_templates, public.sector_templates to service_role;

create policy business_sectors_read on public.business_sectors
  for select to authenticated using (true);
create policy site_templates_read on public.site_templates
  for select to authenticated using (true);
create policy sector_templates_read on public.sector_templates
  for select to authenticated using (true);

commit;
