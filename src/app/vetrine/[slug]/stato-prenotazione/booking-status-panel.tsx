"use client";

import { useEffect, useState } from "react";
import { readBookingStatus } from "./actions";

const labels = {
  pending: "In attesa di conferma",
  confirmed: "Appuntamento confermato",
  declined: "Richiesta rifiutata",
  cancelled: "Appuntamento annullato",
};
const appointment = new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });

export default function BookingStatusPanel({ slug }: { slug: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof readBookingStatus>>>();
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const reference = window.location.hash.slice(1);
    readBookingStatus(slug, reference)
      .then((data) => { if (active) setResult(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [slug, attempt]);

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div role="status">
        {pending ? <p>Sto controllando lo stato…</p> : error ? (
          <p>Impossibile controllare lo stato in questo momento. Riprova.</p>
        ) : result ? (
          <>
            <h2 className="text-xl font-semibold text-emerald-950">{labels[result.status]}</h2>
            <p className="mt-2">{result.name}</p>
            <p className="capitalize text-gray-700">{appointment.format(new Date(result.startsAt))} · Ora italiana</p>
          </>
        ) : <p>Prenotazione non disponibile. Apri il link che hai ricevuto dopo l’invio.</p>}
      </div>
      <button type="button" disabled={pending} onClick={() => {
        setPending(true);
        setError(false);
        setAttempt((previous) => previous + 1);
      }} className="rounded-lg border border-emerald-800 px-4 py-2 font-medium text-emerald-900 disabled:opacity-50">
        Aggiorna stato
      </button>
    </section>
  );
}
