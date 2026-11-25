"use client";

import { useActionState } from "react";
import { saveBillingCycle } from "./cycle-actions";

export default function CycleForm({ tenantId, expectedEnd }: { tenantId: string; expectedEnd: string | null }) {
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, formData: FormData) => {
      try {
        return await saveBillingCycle(tenantId, expectedEnd, formData);
      } catch {
        return { success: false, message: "Impossibile salvare il ciclo." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={save} className="mt-4 space-y-3">
      {expectedEnd === null && (
        <label className="block text-sm font-medium">
          Inizio del ciclo
          <input type="date" name="period_start" required className="mt-1 block rounded border px-3 py-2" />
        </label>
      )}
      <label className="block text-sm font-medium">
        {expectedEnd ? "Fine del nuovo ciclo" : "Data del prossimo rinnovo"}
        <input type="date" name="period_end" required className="mt-1 block rounded border px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50">
        {pending ? "Salvataggio…" : expectedEnd ? "Registra rinnovo" : "Configura ciclo"}
      </button>
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
