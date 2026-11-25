alter table public.site_settings
  add column color_palette text not null default 'template',
  add column show_about boolean not null default true,
  add column show_gallery boolean not null default true,
  add column show_opening_hours boolean not null default true,
  add constraint site_settings_color_palette_check
    check (color_palette in ('template', 'oliva', 'oceano', 'terracotta'));