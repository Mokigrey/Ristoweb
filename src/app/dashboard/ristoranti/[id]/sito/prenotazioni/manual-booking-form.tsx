"use client";

import { useState, type FormEvent } from "react";
import { addManualBooking } from "./actions";

const field = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal";

export default function ManualBookingForm({ tenantId }: { tenantId: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      const saved = await addManualBooking(tenantId, data);
      if (saved.success) form.reset();
      setResult(saved);
    } catch {
      setResult({ success: false, message: "Impossibile registrare la richiesta. Riprova." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Dati della prenotazione</legend>
        <label className="font-medium">Nome
          <input name="customer_name" required maxLength={150} className={field} />
        </label>
        <label className="font-medium">Telefono
          <input name="customer_phone" type="tel" required maxLength={40} className={field} />
        </label>
        <label className="font-medium">Email facoltativa
          <input name="customer_email" type="email" maxLength={254} className={field} />
        </label>
        <label className="font-medium">Persone
          <input name="party_size" type="number" required min={1} max={30} defaultValue={1} className={field} />
        </label>
        <label className="font-medium sm:col-span-2">Data e ora richieste <span className="font-normal text-gray-600">(ora italiana)</span>
          <input name="requested_local" type="datetime-local" required className={field} />
        </label>
        <label className="font-medium sm:col-span-2">Note facoltative
          <textarea name="notes" rows={2} maxLength={1000} className={field} />
        </label>
      </fieldset>
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Registrazione…" : "Registra richiesta"}
      </button>
      {result && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
