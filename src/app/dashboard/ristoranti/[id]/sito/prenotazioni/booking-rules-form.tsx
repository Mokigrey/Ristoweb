"use client";

import Link from "next/link";
import { useActionState } from "react";
import { appointmentDurations } from "@/lib/booking-services";
import type { BookingConfirmationMode } from "@/lib/public-bookings";
import { saveBookingRules } from "./actions";

const defaultBookingRules = {
  enabled: false,
  duration_minutes: 30,
  notice_minutes: 60,
  horizon_days: 14,
  max_party_size: 1,
  confirmation_mode: "manual" as BookingConfirmationMode,
};

const inputStyle = "mt-1 block w-full rounded-lg border border-gray-400 px-3 py-2 font-normal";

export default function BookingRulesForm({ tenantId, hoursHref, rules }: {
  tenantId: string;
  hoursHref: string;
  rules: typeof defaultBookingRules | null;
}) {
  const settings = rules ?? defaultBookingRules;
  const [result, action, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, form: FormData) => {
      try {
        return await saveBookingRules(tenantId, form);
      } catch {
        return { success: false, message: "Impossibile salvare le impostazioni. Riprova." };
      }
    },
    { success: false, message: "" },
  );
  return (
    <form action={action} className="mt-4 space-y-4">
      <p className="text-sm text-gray-700">
        Gli appuntamenti usano le fasce di <Link href={hoursHref} className="font-medium text-emerald-800 underline">Orari e social</Link>.
      </p>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Disponibilità degli appuntamenti</legend>
        <label className="flex items-center gap-2 font-medium sm:col-span-2">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
          Accetta appuntamenti dalla vetrina pubblicata
        </label>
        <div className="sm:col-span-2">
          <label className="font-medium">Modalità di conferma
            <select
              name="confirmation_mode" defaultValue={settings.confirmation_mode} className={inputStyle}
              aria-describedby="booking-confirmation-help"
            >
              <option value="manual">Manuale</option>
              <option value="automatic">Automatica</option>
            </select>
          </label>
          <p id="booking-confirmation-help" className="mt-1 text-sm text-gray-600">
            Con la conferma manuale, decidi dal pannello se accettare o rifiutare. Con quella automatica, la richiesta viene confermata subito.
          </p>
        </div>
        <label className="font-medium">Durata senza servizi attivi
          <select name="duration_minutes" defaultValue={settings.duration_minutes} className={inputStyle}>
            {appointmentDurations.map((n) => <option key={n} value={n}>{n} minuti</option>)}
          </select>
        </label>
        <label className="font-medium">Preavviso minimo
          <select name="notice_minutes" defaultValue={settings.notice_minutes} className={inputStyle}>
            {[0, 60, 120, 240, 1440].map((n) => <option key={n} value={n}>{n === 0 ? "Nessuno" : `${n / 60} h`}</option>)}
          </select>
        </label>
        <label className="font-medium">Giorni prenotabili
          <select name="horizon_days" defaultValue={settings.horizon_days} className={inputStyle}>
            {[7, 14, 30, 60].map((n) => <option key={n} value={n}>{n} giorni</option>)}
          </select>
        </label>
        <label className="font-medium">Persone per appuntamento
          <input name="max_party_size" type="number" min={1} max={30} defaultValue={settings.max_party_size} required className={inputStyle} />
        </label>
      </fieldset>
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2 font-medium text-white disabled:opacity-50">
        {pending ? "Salvataggio…" : "Salva impostazioni"}
      </button>
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
