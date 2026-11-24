import Link from "next/link";
import { estimatedMonthlyTotal, formatCents } from "@/lib/billing/estimate";
import { sectorLabel } from "../../../../site-catalog";
import { loadDraftPlan } from "../load-draft-plan";
import CheckoutQuoteForm from "./checkout-quote-form";

export default async function RiepilogoPianoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, sitePath, basePrice, modules, initialKeys, canEdit } = await loadDraftPlan(id);
  const selected = new Set(initialKeys);
  const lines = [
    { key: "base", label: "Sito vetrina base", price: basePrice },
    ...modules.filter((module) => module.active || selected.has(module.key)),
  ];
  const amounts = lines.map(({ price }) => price);
  const pricedLines = lines.flatMap(({ key, price }) => price === null ? [] : [[key, price] as const]);
  const complete = pricedLines.length === lines.length;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href={sitePath + "/piano"} className="text-emerald-800 hover:underline">← Configura il piano</Link>
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Riepilogo del piano</h1>
          <p className="mt-1 text-gray-600">{tenant.name} · {sectorLabel(tenant.business_type)} · Bozza</p>
        </header>
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6" aria-labelledby="piano-voci">
          <h2 id="piano-voci" className="text-xl font-semibold text-gray-900">Cosa include il tuo piano</h2>
          <dl className="mt-4 divide-y divide-gray-200">
            {lines.map(({ key, label, price }) => (
              <div key={key} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                <dt>{label}</dt>
                <dd className="font-medium">{price === null ? "Da definire" : `${formatCents(price)} al mese`}</dd>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 pt-4 font-semibold">
              <dt>Canone mensile stimato</dt>
              <dd>{estimatedMonthlyTotal(amounts)}</dd>
            </div>
          </dl>
        </section>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {!complete && "Il canone sarà disponibile quando tutte le voci del piano avranno un prezzo. "}
          Il pagamento sarà disponibile in una fase successiva.
        </p>
        {canEdit && complete && <CheckoutQuoteForm tenantId={id} prices={Object.fromEntries(pricedLines)} />}
        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <Link href={sitePath + "/piano"} className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800">
              Modifica il piano
            </Link>
          )}
          <Link href={sitePath + "/anteprima"} className="rounded-lg border border-emerald-800 px-5 py-3 font-medium text-emerald-800 hover:bg-emerald-50">
            Apri anteprima della vetrina
          </Link>
        </div>
      </div>
    </main>
  );
}
