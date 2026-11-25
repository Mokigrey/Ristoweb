"use client";

import { useActionState, useState } from "react";
import { estimatedMonthlyTotal, formatCents } from "@/lib/billing/estimate";
import { saveDraftPlan } from "./actions";

type PlanModule = {
  key: string;
  label: string;
  description: string;
  price: number | null;
  active: boolean;
};

export default function DraftPlanForm({
  tenantId, basePrice, modules, initialKeys, canEdit,
}: {
  tenantId: string;
  basePrice: number | null;
  modules: PlanModule[];
  initialKeys: string[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState(() => new Set(initialKeys));
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, form: FormData) => {
      try {
        return await saveDraftPlan(tenantId, form);
      } catch {
        return { success: false, message: "Impossibile salvare il piano. Riprova." };
      }
    },
    { success: true, message: "" },
  );
  const included = modules.filter((module) => module.active || selected.has(module.key));
  const total = estimatedMonthlyTotal([basePrice, ...included.map((module) => module.price)]);
  const showPrice = (price: number | null) => price === null ? "Da definire" : `${formatCents(price)} al mese`;

  return (
    <form action={save} className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-semibold">Sito vetrina base</h2>
          <span>{showPrice(basePrice)}</span>
        </div>
      </div>
      <fieldset disabled={pending || !canEdit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-2 text-lg font-semibold">Moduli opzionali</legend>
        {modules.map((module) => (
          <label key={module.key} className="flex items-start gap-3 rounded-lg border px-3 py-3">
            <input
              type="checkbox" name="module" value={module.key}
              checked={module.active || selected.has(module.key)} disabled={module.active}
              onChange={(event) => {
                const enabled = event.target.checked;
                setSelected((current) => {
                  const next = new Set(current);
                  if (enabled) next.add(module.key);
                  else next.delete(module.key);
                  return next;
                });
              }}
              className="mt-1"
            />
            <span className="grow">
              <span className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{module.label}{module.active && " · Già attivo"}</span>
                <span>{showPrice(module.price)}</span>
              </span>
              <span className="mt-1 block text-sm text-gray-600">{module.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-2 font-semibold" aria-live="polite">
          <span>Canone mensile stimato</span><span>{total}</span>
        </div>
        <p className="mt-2 text-sm text-gray-600">Le scelte si salvano nella bozza. Il checkout sarà disponibile in un passaggio successivo.</p>
      </div>
      {canEdit && (
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
          {pending ? "Salvataggio…" : "Salva scelta"}
        </button>
      )}
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
