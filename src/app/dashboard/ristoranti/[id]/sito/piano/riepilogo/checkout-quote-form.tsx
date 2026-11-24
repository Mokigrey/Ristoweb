"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveCheckoutQuote } from "./actions";

export default function CheckoutQuoteForm({ tenantId, prices }: {
  tenantId: string;
  prices: Record<string, number>;
}) {
  const router = useRouter();
  const [result, save, pending] = useActionState(
    async (_previous: { success: boolean; message: string }) => {
      try {
        const saved = await saveCheckoutQuote(tenantId, prices);
        if (saved.refresh) router.refresh();
        return { success: saved.success, message: saved.message };
      } catch {
        return { success: false, message: "Impossibile salvare il riepilogo. Riprova." };
      }
    },
    { success: false, message: "" },
  );

  return (
    <form action={save} className="space-y-3">
      <button type="submit" disabled={pending || result.success} className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Salvataggio…" : result.success ? "Riepilogo salvato" : "Salva riepilogo"}
      </button>
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
