import { getSiteAccess } from "@/lib/supabase/site-access";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { digitalMenuModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";
import { defaultAppearance } from "../aspetto/appearance";
import { loadSiteImages } from "../immagini/media";
import SitePreview from "./site-preview";
import styles from "./preview.module.css";

export const metadata: Metadata = {
  title: "Anteprima sito | Selfweb",
  robots: { index: false, follow: false },
};

export default async function AnteprimaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const { id } = await params;
  const { template: requestedTemplate } = await searchParams;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenantResult, settingsResult] = await Promise.all([
    supabase.from("tenants")
      .select("name, template_key, business_type, is_published, plan_type, subscription_status").eq("id", id).maybeSingle(),
    supabase.from("site_settings").select(
      "public_name, tagline, description, address, city, phone, whatsapp, email, opening_hours, social_links, logo_path, hero_image_path, color_palette, show_about, show_gallery, show_opening_hours",
    ).eq("tenant_id", id).maybeSingle(),
  ]);
  if (tenantResult.error || settingsResult.error) {
    throw new Error("Impossibile caricare l’anteprima del sito.");
  }
  const tenant = tenantResult.data;
  if (!tenant) notFound();
  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  const isDraft = !tenant.is_published && tenant.plan_type === "subscription" && tenant.subscription_status === "trialing";
  let previewTemplate = tenant.template_key;
  if (isDraft && typeof requestedTemplate === "string" && requestedTemplate !== previewTemplate) {
    const { data, error } = await supabase.from("sector_templates").select("template_key")
      .eq("sector_key", tenant.business_type).eq("template_key", requestedTemplate).maybeSingle();
    if (error) throw new Error("Impossibile caricare il template dell’anteprima.");
    if (data) previewTemplate = data.template_key;
  }
  const temporaryPreview = previewTemplate !== tenant.template_key;
  const appearance = settingsResult.data ?? defaultAppearance;
  const images = await loadSiteImages(supabase, id, settingsResult.data, { includeGallery: appearance.show_gallery });

  let menu: {
    id: string;
    name: string;
    description: string | null;
    items: { id: string; name: string; description: string | null; price: number | null }[];
  }[] = [];

  if (await isSiteModuleEnabled(supabase, id, digitalMenuModule)) {
    const { data: categories, error: menuError } = await supabase
      .from("menu_categories")
      .select("id, name, description, items:menu_items(id, name, description, price)")
      .eq("tenant_id", id)
      .eq("is_visible", true)
      .eq("items.is_available", true)
      .order("sort_order")
      .order("name")
      .order("sort_order", { referencedTable: "items" })
      .order("name", { referencedTable: "items" });
    if (menuError) throw new Error("Impossibile caricare il menu dell’anteprima.");
    menu = categories.filter((category) => category.items.length > 0);
  }

  return (
    <main className={styles.frame}>
      <div className={styles.toolbar}>
        <Link href={temporaryPreview ? { pathname: sitePath + "/aspetto", query: { template: previewTemplate } } : sitePath}>
          {temporaryPreview ? "← Torna all’aspetto" : "← Gestione sito"}
        </Link>
        <span>{temporaryPreview ? `Prova template · ${previewTemplate}` : "Anteprima privata"}</span>
      </div>
      <SitePreview
        name={settingsResult.data?.public_name || tenant.name}
        template={previewTemplate}
        settings={settingsResult.data}
        appearance={appearance}
        menu={menu}
        images={images}
      />
    </main>
  );
}
