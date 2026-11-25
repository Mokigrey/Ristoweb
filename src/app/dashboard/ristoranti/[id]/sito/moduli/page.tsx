import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { getEnabledSiteModules, siteModulePanels } from "@/lib/supabase/site-modules";
import { formatBillingDate } from "@/lib/supabase/billing-cycle";
import { formatCents } from "@/lib/billing/estimate";
import ModuleEstimate from "./module-estimate";
import ModuleToggle from "./module-toggle";

export default async function ModuliPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, catalog, active, prices, cycle, removals, owner] = await Promise.all([
    supabase.from("tenants").select("name, plan_type, subscription_status, is_published").eq("id", id).maybeSingle(),
    supabase.from("module_catalog").select("module_key, label, description").order("label"),
    getEnabledSiteModules(supabase, id),
    supabase.from("monthly_prices").select("price_key, amount_cents"),
    supabase.from("tenant_billing_cycles").select("period_end").eq("tenant_id", id).maybeSingle(),
    supabase.from("tenant_module_removals").select("module_key, period_end").eq("tenant_id", id),
    access === "tenant"
      ? supabase.from("tenant_members").select("role").eq("tenant_id", id).eq("role", "tenant_admin").maybeSingle()
      : { data: null, error: null },
  ]);
  if (tenant.error || catalog.error || prices.error || cycle.error || removals.error || owner.error) {
    throw new Error("Impossibile caricare i moduli.");
  }
  if (!tenant.data) notFound();

  const canSchedule = access === "platform" || owner.data?.role === "tenant_admin";
  const isSubscription = tenant.data.plan_type === "subscription";
  const isDraftPlan = isSubscription && tenant.data.subscription_status === "trialing" && !tenant.data.is_published;
  const renewalDate = isSubscription ? cycle.data?.period_end : undefined;
  const scheduled = new Set(removals.data
    .filter(({ module_key, period_end }) => period_end === renewalDate && active.has(module_key))
    .map(({ module_key }) => module_key));
  const priceMap = new Map(prices.data.map(({ price_key, amount_cents }) => [price_key, amount_cents]));
  const priceOf = (key: string) => priceMap.get(key) ?? null;
  const available = catalog.data.filter(({ module_key }) => !active.has(module_key))
    .map(({ module_key, label }) => ({ key: module_key, label, price: priceOf(module_key) }));
  const activeKeys = [...active];
  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={sitePath} className="text-selfweb-action hover:underline">← Gestione sito</Link>
        <header className="rounded-2xl bg-selfweb-hero px-5 py-8 text-white sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Moduli della vetrina</h1>
          <p className="mt-2 break-words text-selfweb-accent">{tenant.data.name}</p>
          {isDraftPlan && (
            <Link href={sitePath + "/piano"} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-selfweb-accent px-4 font-semibold text-selfweb-ink hover:bg-teal-50">
              Configura il piano della bozza
            </Link>
          )}
        </header>
        {isSubscription && !isDraftPlan && available.length > 0 && (
          <ModuleEstimate
            options={available}
            currentPrices={["base", ...activeKeys].map(priceOf)}
            renewalPrices={["base", ...activeKeys.filter((key) => !scheduled.has(key))].map(priceOf)}
            renewalLabel={renewalDate && scheduled.size ? formatBillingDate(renewalDate) : undefined}
          />
        )}
        <ul className="space-y-4">
          {catalog.data.map(({ module_key, label, description }) => {
            const enabled = active.has(module_key);
            const panel = siteModulePanels.find(({ key }) => key === module_key);
            const price = priceOf(module_key);
            return (
              <li key={module_key} className="rounded-xl border border-selfweb-border bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <span className={enabled ? "text-sm font-medium text-emerald-800" : "text-sm text-gray-600"}>
                    {enabled ? "Attivo" : "Non attivo"}
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{description}</p>
                {isSubscription && <p className="mt-2 text-sm font-medium">{price === null ? "Tariffa da definire" : `${formatCents(price)} al mese`}</p>}
                {enabled && renewalDate && scheduled.has(module_key) && (
                  <p className="mt-2 text-sm text-gray-700">Disattivazione prevista al rinnovo del {formatBillingDate(renewalDate)}.</p>
                )}
                {enabled && panel && (
                  <Link href={sitePath + panel.path} className="mt-3 inline-block font-medium text-selfweb-action hover:underline">
                    {panel.actionLabel}
                  </Link>
                )}
                {enabled && renewalDate
                  ? canSchedule && <ModuleToggle tenantId={id} moduleKey={module_key} enabled renewal scheduled={scheduled.has(module_key)} />
                  : access === "platform" && <ModuleToggle tenantId={id} moduleKey={module_key} enabled={enabled} />}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
