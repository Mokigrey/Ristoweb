insert into public.site_templates (template_key)
values ('editoriale'), ('galleria')
on conflict (template_key) do nothing;

-- Both layouts use the existing general-purpose showcase sections.
insert into public.sector_templates (sector_key, template_key)
select catalog.sector_key, additions.template_key
from public.sector_templates as catalog
cross join (values ('editoriale'), ('galleria')) as additions(template_key)
where catalog.template_key = 'moderno'
on conflict (sector_key, template_key) do nothing;
