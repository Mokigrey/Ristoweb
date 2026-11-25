import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { estimatedMonthlyTotal, formatCents } from "@/lib/billing/estimate";
import { formatBillingDate, todayInRome } from "@/lib/supabase/billing-cycle";
import CycleForm from "./cycle-form";
import PriceField from "./price-field";

export default async function CanonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, catalog, active, prices, cycle, removals] = await Promise.all([
    supabase.from("tenants").select("name, plan_type").eq("id", id).maybeSingle(),
    supabase.from("module_catalog").select("module_key, label").order("label"),
    supabase.from("tenant_modules").select("module_key").eq("tenant_id", id).eq("enabled", true),
    supabase.from("monthly_prices").select("price_key, amount_cents"),
    supabase.from("tenant_billing_cycles").select("period_start, period_end").eq("tenant_id", id).maybeSingle(),
    supabase.from("tenant_module_removals").select("module_key").eq("tenant_id", id),
  ]);
  if (tenant.error || catalog.error || active.error || prices.error || cycle.error || removals.error) {
    throw new Error("Impossibile caricare il canone.");
  }
  if (!tenant.data) notFound();

  const priceMap = new Map(prices.data.map(({ price_key, amount_cents }) => [price_key, amount_cents]));
  const activeKeys = new Set(active.data.map(({ module_key }) => module_key));
  const scheduled = new Set(removals.data.map(({ module_key }) => module_key));
  const tariffLines = [
    { key: "base", label: "Sito vetrina base" },
    ...catalog.data.map(({ module_key, label }) => ({ key: module_key, label })),
  ].map((line) => ({ ...line, amount: priceMap.get(line.key) ?? null }));
  const subtotal = tariffLines.filter((line) => line.key === "base" || activeKeys.has(line.key));
  const totalOf = (lines: typeof subtotal) => estimatedMonthlyTotal(lines.map(({ amount }) => amount));
  const showsNextTotal = subtotal.some(({ key }) => scheduled.has(key));
  const isSubscription = tenant.data.plan_type === "subscription";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={`/dashboard/ristoranti/${id}/sito`} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <header className="my-7">
          <h1 className="text-3xl font-bold text-gray-900">Canone mensile stimato</h1>
          <p className="mt-1 text-gray-600">{tenant.data.name}</p>
        </header>
        {isSubscription ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Vetrina e moduli attivi</h2>
            <dl>
              {subtotal.map(({ key, label, amount }) => (
                <div key={key} className="flex flex-wrap justify-between gap-2 border-t py-3">
                  <dt>
                    {label}
                    {scheduled.has(key) && <span className="block text-sm text-gray-600">Disattivazione al rinnovo</span>}
                  </dt>
                  <dd>{amount === null ? "Da definire" : formatCents(amount)}</dd>
                </div>
              ))}
              <div className="flex flex-wrap justify-between gap-2 border-t pt-4 font-semibold">
                <dt>Totale mensile stimato</dt>
                <dd>{totalOf(subtotal)}</dd>
              </div>
              {showsNextTotal && (
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-4 font-semibold">
                  <dt>Stima dopo il prossimo rinnovo</dt>
                  <dd>{totalOf(subtotal.filter(({ key }) => !scheduled.has(key)))}</dd>
                </div>
              )}
            </dl>
            <p className="mt-4 text-sm text-gray-600">La stima non include imposte o eventuali conguagli e non genera addebiti.</p>
          </section>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-white p-5">Il riepilogo mensile è riservato ai siti in abbonamento.</p>
        )}
        {isSubscription && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Ciclo di abbonamento</h2>
            {cycle.data ? (
              <dl className="mt-3 space-y-2">
                <div><dt className="font-medium">Inizio del ciclo</dt><dd>{formatBillingDate(cycle.data.period_start)}</dd></div>
                <div><dt className="font-medium">Prossimo rinnovo</dt><dd>{formatBillingDate(cycle.data.period_end)}</dd></div>
              </dl>
            ) : <p className="mt-2 text-gray-600">Il ciclo di abbonamento non è ancora configurato.</p>}
            {access === "platform" && (!cycle.data || cycle.data.period_end <= todayInRome()) && (
              <CycleForm key={cycle.data?.period_end ?? "setup"} tenantId={id} expectedEnd={cycle.data?.period_end ?? null} />
            )}
          </section>
        )}
        {access === "platform" && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Listino della piattaforma</h2>
            <p className="mb-4 mt-1 text-sm text-gray-600">Le tariffe valgono per tutte le attività. Lascia vuoto un importo che deve ancora essere definito.</p>
            {tariffLines.map(({ key, label, amount }) => (
              <PriceField key={key} tenantId={id} priceKey={key} label={label} amount={amount} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
