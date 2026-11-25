"use client";

import { useEffect, useRef, useState } from "react";
import { cancelBooking, readBookingStatus } from "./actions";

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
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const displayedReference = useRef("");

  useEffect(() => {
    let active = true;
    const reference = window.location.hash.slice(1);
    readBookingStatus(slug, reference)
      .then((data) => {
        if (!active) return;
        displayedReference.current = reference;
        setResult(data);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [slug, attempt]);

  function refresh() {
    setPending(true);
    setError(false);
    setAttempt((previous) => previous + 1);
  }

  async function cancel() {
    const reference = displayedReference.current;
    if (reference !== window.location.hash.slice(1)) {
      setConfirming(false);
      refresh();
      return;
    }
    setCancelling(true);
    setCancelError(false);
    try {
      setResult(await cancelBooking(slug, reference));
      setConfirming(false);
    } catch {
      setCancelError(true);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-selfweb-border bg-white p-5 shadow-sm shadow-teal-950/5 sm:p-6">
      <div role="status">
        {pending ? <p>Sto controllando lo stato…</p> : error ? (
          <p>Impossibile controllare lo stato in questo momento. Riprova.</p>
        ) : result ? (
          <>
            <h2 className="text-xl font-bold tracking-tight">{labels[result.status]}</h2>
            <p className="mt-2 break-words text-slate-700">{result.name}</p>
            <dl className="mt-4 grid gap-4 rounded-2xl bg-selfweb-canvas p-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-600">Quando</dt>
                <dd className="mt-1 font-semibold capitalize">{appointment.format(new Date(result.startsAt))}</dd>
                <dd className="mt-1 text-sm text-slate-600">Ora italiana</dd>
              </div>
              {(result.serviceName || result.durationMinutes) && (
                <div>
                  <dt className="text-sm font-medium text-slate-600">{result.serviceName ? "Servizio" : "Durata"}</dt>
                  {result.serviceName && <dd className="mt-1 break-words font-semibold">{result.serviceName}</dd>}
                  {result.durationMinutes && <dd className="mt-1">{result.durationMinutes} minuti</dd>}
                </div>
              )}
            </dl>
          </>
        ) : <p>Prenotazione non disponibile. Apri il link che hai ricevuto dopo l’invio.</p>}
      </div>
      {confirming ? (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <p>Vuoi annullare? L’orario sarà disponibile per un’altra prenotazione.</p>
          {cancelError && <p role="alert">Impossibile annullare la prenotazione. Riprova.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={cancelling} onClick={cancel} className="rounded-lg bg-red-800 px-4 py-2 font-medium text-white disabled:opacity-50">
              {cancelling ? "Annullamento…" : "Sì, annulla"}
            </button>
            <button type="button" disabled={cancelling} onClick={() => setConfirming(false)} className="rounded-lg border border-red-800 px-4 py-2 font-medium text-red-900 disabled:opacity-50">
              Mantieni prenotazione
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={pending} onClick={refresh} className="min-h-11 rounded-xl border border-selfweb-action px-4 py-2 font-semibold text-selfweb-action hover:bg-selfweb-canvas disabled:opacity-50">
            Aggiorna stato
          </button>
          {!pending && !error && result?.canCancel && (
            <button type="button" onClick={() => {
              setCancelError(false);
              setConfirming(true);
            }} className="rounded-lg border border-red-700 px-4 py-2 font-medium text-red-800">
              Annulla prenotazione
            </button>
          )}
        </div>
      )}
    </section>
  );
}
