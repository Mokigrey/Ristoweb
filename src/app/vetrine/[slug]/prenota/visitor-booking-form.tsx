"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BookingConfirmationMode } from "@/lib/public-bookings";
import { reserveVisitorSlot } from "./actions";

const hour = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const appointment = new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });
const inputStyle = "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal text-selfweb-ink focus:border-selfweb-action focus:outline focus:outline-2 focus:outline-selfweb-accent";

export default function VisitorBookingForm({ slug, slots, maxPartySize, confirmationMode, statusPath, serviceId, serviceName, durationMinutes }: {
  slug: string;
  slots: string[];
  maxPartySize: number;
  confirmationMode: BookingConfirmationMode;
  statusPath: string;
  serviceId: string | null;
  serviceName?: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const request = useRef<{ slot: string; id: string } | null>(null);
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState<{ slot: string; status: "pending" | "confirmed"; id: string }>();
  const [error, setError] = useState("");
  useEffect(() => { setReady(true); }, []);

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
      const requestId = request.current.id;
      const result = await reserveVisitorSlot(slug, requestId, serviceId, durationMinutes, form);
      if (result.success) setSubmitted({ slot, status: result.status, id: requestId });
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

  if (submitted) {
    const confirmed = submitted.status === "confirmed";
    return (
      <section
        role="status"
        className={confirmed
          ? "rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950"
          : "rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"}
      >
        <h2 className="text-xl font-semibold">{confirmed ? "Appuntamento confermato" : "In attesa di conferma"}</h2>
        {serviceName && <p className="mt-2 font-medium">{serviceName} · {durationMinutes} minuti</p>}
        <p className="mt-2 capitalize">{appointment.format(new Date(submitted.slot))}</p>
        {!confirmed && <p className="mt-2 text-sm">La richiesta è stata inviata. Il gestore deve ancora confermare l’appuntamento.</p>}
        <p className="mt-3 text-sm">
          Conserva questo link per controllare l’esito anche in seguito.
        </p>
        <a href={statusPath + "#" + submitted.id} className="mt-2 inline-block font-semibold underline">Controlla lo stato</a>
      </section>
    );
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-5 rounded-3xl border border-selfweb-border bg-white p-5 shadow-sm shadow-teal-950/5 sm:p-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {slots.length ? (
        <fieldset disabled={pending} className="space-y-5">
          <legend className="mb-3 text-lg font-bold tracking-tight">Orari disponibili</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((slot) => (
              <label key={slot} className="block cursor-pointer">
                <input type="radio" name="slot" value={slot} required className="peer sr-only" />
                <span className="grid min-h-11 place-items-center rounded-xl border border-selfweb-border bg-selfweb-canvas px-2 py-2 text-sm font-semibold tabular-nums text-selfweb-action hover:border-selfweb-action peer-checked:border-selfweb-action peer-checked:bg-selfweb-action peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-selfweb-action">
                  {hour.format(new Date(slot))}
                </span>
              </label>
            ))}
          </div>
          <div className="space-y-4 border-t border-selfweb-border pt-5">
            <h2 className="text-lg font-bold tracking-tight">I tuoi recapiti</h2>
            <label className="block text-sm font-semibold">Nome
              <input name="name" autoComplete="name" maxLength={150} required className={inputStyle} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Telefono
                <input name="phone" type="tel" autoComplete="tel" maxLength={40} required className={inputStyle} />
              </label>
              <label className="block text-sm font-semibold">Email facoltativa
                <input name="email" type="email" autoComplete="email" maxLength={254} className={inputStyle} />
              </label>
            </div>
            {maxPartySize > 1 ? (
              <label className="block text-sm font-semibold">Persone
                <input name="people" type="number" min={1} max={maxPartySize} defaultValue={1} required className={inputStyle} />
              </label>
            ) : <input type="hidden" name="people" value="1" />}
          </div>
          <button type="submit" disabled={!ready || pending} className="min-h-12 w-full rounded-xl bg-selfweb-action px-5 py-3 font-semibold text-white hover:bg-selfweb-hero disabled:opacity-50 sm:w-auto">
            {pending ? "Invio in corso…" : confirmationMode === "automatic" ? "Prenota appuntamento" : "Invia richiesta"}
          </button>
        </fieldset>
      ) : <p className="text-gray-700">Nessun orario disponibile per questa data. Prova un altro giorno.</p>}
    </form>
  );
}
