"use client";

import { useActionState } from "react";
import { appointmentDurations } from "@/lib/booking-services";
import { saveBookingService } from "./actions";

type Service = { id: string; name: string; duration_minutes: number; enabled: boolean };
const inputStyle = "mt-1 block min-h-11 w-full rounded-lg border border-gray-400 bg-white px-3 py-2 font-normal";

export default function BookingServiceForm({ tenantId, service }: { tenantId: string; service?: Service }) {
  const [result, action, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, form: FormData) => {
      try {
        return await saveBookingService(tenantId, service?.id ?? null, form);
      } catch {
        return { success: false, message: "Impossibile salvare il servizio. Riprova." };
      }
    },
    { success: false, message: "" },
  );

  return (
    <form action={action} className="space-y-3 rounded-xl border border-selfweb-border bg-white p-4">
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <legend className="mb-2 font-semibold text-selfweb-ink">{service?.name ?? "Nuovo servizio"}</legend>
        <label className="text-sm font-medium">Nome
          <input name="name" maxLength={100} required defaultValue={service?.name} className={inputStyle} />
        </label>
        <label className="text-sm font-medium">Durata
          <select name="duration_minutes" defaultValue={service?.duration_minutes ?? 30} className={inputStyle}>
            {appointmentDurations.map((duration) => <option key={duration} value={duration}>{duration} minuti</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium sm:col-span-2">
          <input name="enabled" type="checkbox" defaultChecked={service?.enabled ?? true} className="size-4 accent-selfweb-action" />
          Disponibile sulla vetrina
        </label>
      </fieldset>
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-selfweb-action px-4 py-2 font-medium text-white hover:bg-selfweb-hero disabled:opacity-50">
        {pending ? "Salvataggio…" : service ? "Salva servizio" : "Aggiungi servizio"}
      </button>
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
