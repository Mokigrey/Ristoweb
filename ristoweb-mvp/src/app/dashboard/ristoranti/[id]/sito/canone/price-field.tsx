"use client";

import { useActionState, useState } from "react";
import { saveMonthlyPrice } from "./actions";

export default function PriceField({
  tenantId, priceKey, label, amount,
}: { tenantId: string; priceKey: string; label: string; amount: number | null }) {
  const [value, setValue] = useState(amount === null ? "" : (amount / 100).toFixed(2).replace(".", ","));
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, data: FormData) => {
      try {
        return await saveMonthlyPrice(tenantId, priceKey, data);
      } catch {
        return { success: false, message: "Impossibile salvare la tariffa. Riprova." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={save} className="space-y-2 border-t py-4 first:border-t-0 first:pt-0">
      <label htmlFor={`price-${priceKey}`} className="block text-sm font-medium">
        {label} (€ al mese)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`price-${priceKey}`}
          name="amount"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={pending}
          maxLength={12}
          className="w-32 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" disabled={pending} className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50">
          {pending ? "Salvataggio…" : "Salva tariffa"}
        </button>
      </div>
      {result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-sm text-emerald-800" : "text-sm text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
