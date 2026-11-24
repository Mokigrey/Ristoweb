import { getSiteAccess } from "@/lib/supabase/site-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppearanceForm from "./appearance-form";
import { defaultAppearance } from "./appearance";
import TemplateForm from "./template-form";

export default async function AspettoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const { id } = await params;
  const { template } = await searchParams;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, settings] = await Promise.all([
    supabase.from("tenants")
      .select("name, business_type, template_key, is_published, plan_type, subscription_status").eq("id", id).maybeSingle(),
    supabase.from("site_settings")
      .select("color_palette, show_about, show_gallery, show_opening_hours").eq("tenant_id", id).maybeSingle(),
  ]);
  if (tenant.error || settings.error) throw new Error("Impossibile caricare l’aspetto del sito.");
  if (!tenant.data) notFound();

  const site = tenant.data;
  const isDraft = !site.is_published && site.plan_type === "subscription" && site.subscription_status === "trialing";
  let templates: string[] = [];
  if (isDraft) {
    const { data, error } = await supabase.from("sector_templates").select("template_key")
      .eq("sector_key", site.business_type).order("template_key");
    if (error) throw new Error("Impossibile caricare i template della vetrina.");
    templates = data.map(({ template_key }) => template_key);
  }

  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={sitePath} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <div className="my-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Aspetto della vetrina</h1>
            <p className="mt-1 text-gray-600">{tenant.data.name}</p>
          </div>
          <Link href={`${sitePath}/anteprima`} className="font-medium text-emerald-800 hover:underline">
            Apri anteprima
          </Link>
        </div>
        <div className="space-y-8">
          {templates.length > 1 && (
            <TemplateForm
              tenantId={id}
              previewPath={sitePath + "/anteprima"}
              current={site.template_key}
              initial={typeof template === "string" && templates.includes(template) ? template : site.template_key}
              templates={templates}
            />
          )}
          <AppearanceForm tenantId={id} initial={settings.data ?? defaultAppearance} />
        </div>
      </div>
    </main>
  );
}
