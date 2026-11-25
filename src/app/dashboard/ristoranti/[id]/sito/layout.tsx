import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { bookingsModule, digitalMenuModule } from "@/lib/supabase/site-modules";
import WorkspaceShell, { type WorkspaceLink } from "../../../../ui/workspace-shell";

export default async function SitoLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [siteResult, moduleResult] = await Promise.all([
    supabase.from("tenants").select("name, plan_type, subscription_status, is_published").eq("id", id).maybeSingle(),
    supabase.from("tenant_modules").select("module_key").eq("tenant_id", id).eq("enabled", true),
  ]);
  if (siteResult.error || moduleResult.error) throw new Error("Impossibile caricare la vetrina.");
  const site = siteResult.data;
  if (!site) notFound();
  const enabledModules = new Set(moduleResult.data.map(({ module_key }) => module_key));

  const base = `/dashboard/ristoranti/${id}/sito`;
  const toDraftPlan = !site.is_published && site.plan_type === "subscription" && site.subscription_status === "trialing";
  const homeHref = access === "platform" ? "/dashboard" : "/cliente";
  const links: WorkspaceLink[] = [
    { label: "Panoramica vetrina", href: base },
    { label: "Informazioni", href: `${base}/informazioni` },
    { label: "Immagini", href: `${base}/immagini` },
    { label: "Orari e social", href: `${base}/orari` },
    { label: "Aspetto", href: `${base}/aspetto` },
    ...(enabledModules.has(digitalMenuModule) ? [{ label: "Menu digitale", href: `${base}/menu` }] : []),
    ...(enabledModules.has(bookingsModule) ? [{ label: "Prenotazioni", href: `${base}/prenotazioni`, mobilePrimary: true }] : []),
    { label: "Moduli", href: `${base}/moduli` },
    ...(toDraftPlan ? [{ label: "Piano della bozza", href: `${base}/piano` }] : []),
    { label: "Canone mensile", href: `${base}/canone` },
  ];

  return <WorkspaceShell area="site" title={site.name} homeHref={homeHref} links={links}>{children}</WorkspaceShell>;
}
