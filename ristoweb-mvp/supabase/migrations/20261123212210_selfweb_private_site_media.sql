insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('selfweb-site-media', 'selfweb-site-media', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "Selfweb admins read site media" on storage.objects
  for select to authenticated
  using (bucket_id = 'selfweb-site-media' and (select selfweb_private.is_platform_admin()));

create policy "Selfweb admins upload site media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'selfweb-site-media'
    and (select selfweb_private.is_platform_admin())
    and name ~ '^[0-9a-f-]{36}/(logo|hero|gallery)/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );