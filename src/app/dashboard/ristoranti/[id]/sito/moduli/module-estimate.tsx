"use client";

import { useState } from "react";
import { estimatedMonthlyTotal, formatCents } from "@/lib/billing/estimate";

type ModuleOption = { key: string; label: string; price: number | null };

export default function ModuleEstimate({ options, currentPrices, renewalPrices, renewalLabel }: {
  options: ModuleOption[];
  currentPrices: (number | null)[];
  renewalPrices: (number | null)[];
  renewalLabel?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const additions = options.filter(({ key }) => selected.includes(key));
  const addedPrices = additions.map(({ price }) => price);

  return (
    <section className="rounded-2xl border border-selfweb-border bg-white p-5 sm:p-6">
      <h2 id="simulazione" className="text-lg font-semibold">Simula una variazione del canone</h2>
      <p className="mt-1 text-sm text-slate-600">Seleziona i moduli da aggiungere per confrontare le stime. La simulazione è senza impegno.</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-2 text-sm font-semibold">Moduli da aggiungere</legend>
        {options.map(({ key, label, price }) => (
          <label key={key} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-selfweb-border px-3 py-2">
            <input
              type="checkbox"
              className="size-4 accent-selfweb-action"
              disabled={price === null}
              checked={selected.includes(key)}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((previous) => checked ? [...previous, key] : previous.filter((value) => value !== key));
              }}
            />
            <span className="flex-1">{label}</span>
            <span className="text-sm font-medium">{price === null ? "Tariffa da definire" : `${formatCents(price)} al mese`}</span>
          </label>
        ))}
      </fieldset>
      <dl aria-live="polite" className="mt-5 space-y-2 rounded-xl bg-selfweb-canvas p-4 text-sm">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt>Canone attuale stimato</dt><dd>{estimatedMonthlyTotal(currentPrices)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 font-semibold">
          <dt>Stima con la selezione</dt><dd>{estimatedMonthlyTotal([...currentPrices, ...addedPrices])}</dd>
        </div>
        {renewalLabel && (
          <div className="flex flex-wrap justify-between gap-x-4 border-t border-selfweb-border pt-2">
            <dt>Stima dal {renewalLabel} con la selezione</dt>
            <dd>{estimatedMonthlyTotal([...renewalPrices, ...addedPrices])}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-sm text-slate-600">Stime mensili al listino corrente, al netto di imposte ed eventuali conguagli.</p>
    </section>
  );
}
