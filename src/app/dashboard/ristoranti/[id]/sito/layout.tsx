import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { getEnabledSiteModules, siteModulePanels } from "@/lib/supabase/site-modules";
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

  const [siteResult, enabledModules] = await Promise.all([
    supabase.from("tenants").select("name, plan_type, subscription_status, is_published").eq("id", id).maybeSingle(),
    getEnabledSiteModules(supabase, id),
  ]);
  if (siteResult.error) throw new Error("Impossibile caricare la vetrina.");
  const site = siteResult.data;
  if (!site) notFound();

  const base = `/dashboard/ristoranti/${id}/sito`;
  const toDraftPlan = !site.is_published && site.plan_type === "subscription" && site.subscription_status === "trialing";
  const homeHref = access === "platform" ? "/dashboard" : "/cliente";
  const links: WorkspaceLink[] = [
    { label: "Panoramica vetrina", href: base },
    { label: "Informazioni", href: `${base}/informazioni` },
    { label: "Immagini", href: `${base}/immagini` },
    { label: "Orari e social", href: `${base}/orari` },
    { label: "Aspetto", href: `${base}/aspetto` },
    ...siteModulePanels.filter(({ key }) => enabledModules.has(key)).map((module) => ({
      label: module.label,
      href: base + module.path,
      mobilePrimary: "mobilePrimary" in module && module.mobilePrimary,
    })),
    { label: "Moduli", href: `${base}/moduli` },
    ...(toDraftPlan ? [{ label: "Piano della bozza", href: `${base}/piano` }] : []),
    { label: "Canone mensile", href: `${base}/canone` },
  ];

  return <WorkspaceShell area="site" title={site.name} homeHref={homeHref} links={links}>{children}</WorkspaceShell>;
}
