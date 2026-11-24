"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { reserveVisitorSlot } from "./actions";

const hour = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const appointment = new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });
const inputStyle = "mt-1 w-full rounded-lg border border-gray-400 bg-white px-3 py-2 font-normal text-gray-900";

export default function VisitorBookingForm({ slug, slots, maxPartySize }: {
  slug: string;
  slots: string[];
  maxPartySize: number;
}) {
  const router = useRouter();
  const request = useRef<{ slot: string; id: string } | null>(null);
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<string>();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = new FormData(event.currentTarget);
    const slot = String(form.get("slot") ?? "");
    sending.current = true;
    setPending(true);
    setError("");
    try {
      if (request.current?.slot !== slot) request.current = { slot, id: crypto.randomUUID() };
      const result = await reserveVisitorSlot(slug, request.current.id, form);
      if (result.success) setConfirmedSlot(slot);
      else {
        setError(result.message);
        if (result.refresh) router.refresh();
      }
    } catch {
      setError("Impossibile completare la prenotazione. Riprova.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  if (confirmedSlot) {
    return (
      <section role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
        <h2 className="text-xl font-semibold">Appuntamento confermato</h2>
        <p className="mt-2 capitalize">{appointment.format(new Date(confirmedSlot))}</p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {slots.length ? (
        <fieldset disabled={pending} className="space-y-4">
          <legend className="font-semibold">Orari disponibili</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((slot) => (
              <label key={slot} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-2 py-2 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50">
                <input type="radio" name="slot" value={slot} required />
                {hour.format(new Date(slot))}
              </label>
            ))}
          </div>
          <label className="block font-medium">Nome
            <input name="name" autoComplete="name" maxLength={150} required className={inputStyle} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block font-medium">Telefono
              <input name="phone" type="tel" autoComplete="tel" maxLength={40} required className={inputStyle} />
            </label>
            <label className="block font-medium">Email facoltativa
              <input name="email" type="email" autoComplete="email" maxLength={254} className={inputStyle} />
            </label>
          </div>
          {maxPartySize > 1 ? (
            <label className="block font-medium">Persone
              <input name="people" type="number" min={1} max={maxPartySize} defaultValue={1} required className={inputStyle} />
            </label>
          ) : <input type="hidden" name="people" value="1" />}
          <button type="submit" className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {pending ? "Prenotazione in corso…" : "Conferma appuntamento"}
          </button>
        </fieldset>
      ) : <p className="text-gray-700">Nessun orario disponibile per questa data. Prova un altro giorno.</p>}
    </form>
  );
}
