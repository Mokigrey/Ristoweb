create function selfweb_private.public_site(p_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', coalesce(nullif(btrim(settings.public_name), ''), site.name),
    'template', site.template_key,
    'settings', jsonb_build_object(
      'tagline', settings.tagline,
      'description', case when coalesce(settings.show_about, true) then settings.description end,
      'address', settings.address, 'city', settings.city, 'phone', settings.phone,
      'whatsapp', settings.whatsapp, 'email', settings.email,
      'opening_hours', case when coalesce(settings.show_opening_hours, true) then settings.opening_hours end,
      'social_links', settings.social_links
    ),
    'appearance', case when settings.tenant_id is not null then jsonb_build_object(
      'color_palette', settings.color_palette, 'show_about', settings.show_about,
      'show_gallery', settings.show_gallery, 'show_opening_hours', settings.show_opening_hours
    ) end,
    'logoPath', case when starts_with(settings.logo_path, site.id::text || '/logo/') then settings.logo_path end,
    'heroPath', case when starts_with(settings.hero_image_path, site.id::text || '/hero/') then settings.hero_image_path end,
    'gallery', coalesce((
      select jsonb_agg(jsonb_build_object('id', image.id, 'path', image.image_path, 'alt', coalesce(image.alt_text, ''))
        order by image.sort_order, image.created_at, image.id)
      from public.gallery_images as image
      where image.tenant_id = site.id and image.is_visible and coalesce(settings.show_gallery, true)
        and starts_with(image.image_path, site.id::text || '/gallery/')
    ), '[]'::jsonb),
    'menu', coalesce((
      select jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name, 'description', category.description, 'items', items.visible_items)
        order by category.sort_order, category.name, category.id)
      from public.menu_categories as category
      cross join lateral (
        select jsonb_agg(jsonb_build_object('id', item.id, 'name', item.name, 'description', item.description, 'price', item.price)
          order by item.sort_order, item.name, item.id) as visible_items
        from public.menu_items as item
        where item.category_id = category.id and item.tenant_id = site.id and item.is_available
      ) as items
      where category.tenant_id = site.id and category.is_visible and items.visible_items is not null
        and exists (select 1 from public.tenant_modules as module
          where module.tenant_id = site.id and module.module_key = 'digital_menu' and module.enabled)
    ), '[]'::jsonb)
  )
  from public.tenants as site
  left join public.site_settings as settings on settings.tenant_id = site.id
  where site.slug = p_slug and site.is_published;
$$;

revoke execute on function selfweb_private.public_site(text) from public, anon, authenticated, service_role;
grant execute on function selfweb_private.public_site(text) to anon, authenticated;

create function public.selfweb_public_site(p_slug text)
returns jsonb
language sql stable security invoker
set search_path = ''
begin atomic
  select selfweb_private.public_site(p_slug);
end;

revoke execute on function public.selfweb_public_site(text) from public, anon, authenticated, service_role;
grant execute on function public.selfweb_public_site(text) to anon, authenticated;

-- Only media referenced by a published page may be downloaded anonymously.
create function selfweb_private.is_published_media(p_path text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenants as site
    left join public.site_settings as settings on settings.tenant_id = site.id
    where site.id = case when p_path ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/(logo|hero|gallery)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|png|webp)$'
                    then split_part(p_path, '/', 1)::uuid end
      and site.is_published
      and (
        (split_part(p_path, '/', 2) = 'logo' and settings.logo_path = p_path)
        or (split_part(p_path, '/', 2) = 'hero' and settings.hero_image_path = p_path)
        or (split_part(p_path, '/', 2) = 'gallery' and coalesce(settings.show_gallery, true) and exists (
          select 1 from public.gallery_images as image
          where image.tenant_id = site.id and image.image_path = p_path and image.is_visible
        ))
      )
  );
$$;

revoke execute on function selfweb_private.is_published_media(text) from public, anon, authenticated, service_role;
grant execute on function selfweb_private.is_published_media(text) to anon;

create policy "Selfweb public visitors download published media"
  on storage.objects for select to anon
  using (
    bucket_id = 'selfweb-site-media'
    and storage.allow_only_operation('object.get_authenticated')
    and selfweb_private.is_published_media(name)
  );
