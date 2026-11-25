"use client";

import { useActionState } from "react";
import { setModuleEnabled, setRemovalAtRenewal } from "./actions";

export default function ModuleToggle({
  tenantId, moduleKey, enabled, renewal = false, scheduled = false,
}: { tenantId: string; moduleKey: string; enabled: boolean; renewal?: boolean; scheduled?: boolean }) {
  const [result, toggle, pending] = useActionState(
    async () => {
      try {
        return renewal
          ? await setRemovalAtRenewal(tenantId, moduleKey, !scheduled)
          : await setModuleEnabled(tenantId, moduleKey, !enabled);
      } catch {
        return { success: false, message: "Impossibile aggiornare il modulo. Riprova." };
      }
    },
    { success: true, message: "" },
  );
  return (
    <form action={toggle} className="mt-4 space-y-2">
      <button
        type="submit"
        disabled={pending}
        className={enabled
          ? "rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          : "rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"}
      >
        {pending ? "Aggiornamento…"
          : renewal ? (scheduled ? "Annulla disattivazione" : "Disattiva al rinnovo")
          : enabled ? "Disattiva" : "Attiva"}
      </button>
      {result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-sm text-emerald-800" : "text-sm text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
