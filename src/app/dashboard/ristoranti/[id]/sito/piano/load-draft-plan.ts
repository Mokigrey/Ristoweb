import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";

export async function loadDraftPlan(id: string) {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("name, business_type, plan_type, subscription_status, is_published").eq("id", id).maybeSingle();
  if (tenantError) throw new Error("Impossibile caricare la vetrina.");
  if (!tenant) notFound();
  if (tenant.is_published || tenant.plan_type !== "subscription" || tenant.subscription_status !== "trialing") {
    redirect(`${sitePath}/canone`);
  }

  const [catalog, prices, active, choices, owner] = await Promise.all([
    supabase.from("module_catalog").select("module_key, label, description").order("label"),
    supabase.from("monthly_prices").select("price_key, amount_cents"),
    supabase.from("tenant_modules").select("module_key").eq("tenant_id", id).eq("enabled", true),
    supabase.from("tenant_draft_modules").select("module_key").eq("tenant_id", id),
    access === "tenant"
      ? supabase.from("tenant_members").select("role").eq("tenant_id", id).eq("role", "tenant_admin").maybeSingle()
      : { data: null, error: null },
  ]);
  if (catalog.error || prices.error || active.error || choices.error || owner.error) {
    throw new Error("Impossibile caricare il piano della vetrina.");
  }
  const priceMap = new Map(prices.data.map(({ price_key, amount_cents }) => [price_key, amount_cents]));
  const activeKeys = new Set(active.data.map(({ module_key }) => module_key));

  return {
    tenant,
    sitePath,
    basePrice: priceMap.get("base") ?? null,
    modules: catalog.data.map(({ module_key, label, description }) => ({
      key: module_key,
      label,
      description,
      price: priceMap.get(module_key) ?? null,
      active: activeKeys.has(module_key),
    })),
    initialKeys: choices.data.map(({ module_key }) => module_key),
    canEdit: access === "platform" || owner.data?.role === "tenant_admin",
  };
}
