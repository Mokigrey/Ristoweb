"use client";

import { useActionState } from "react";
import { updateBookingStatus } from "./actions";
import type { BookingStatus } from "./booking-status";

const buttonStyle = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50";

export default function BookingControls({ tenantId, bookingId, status }: {
  tenantId: string;
  bookingId: string;
  status: BookingStatus;
}) {
  const [result, action, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, form: FormData) => {
      try {
        return await updateBookingStatus(tenantId, bookingId, status, form);
      } catch {
        return { success: false, message: "Impossibile aggiornare la richiesta. Riprova." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={action} aria-label="Azioni sulla prenotazione" className="mt-4 space-y-3 border-t border-selfweb-border pt-4">
      {status === "pending" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" name="status" value="confirmed" disabled={pending}
            className={buttonStyle + " bg-selfweb-action text-white hover:bg-selfweb-hero"}>
            Conferma richiesta
          </button>
          <button type="submit" name="status" value="declined" disabled={pending}
            className={buttonStyle + " border border-red-700 bg-white text-red-800 hover:bg-red-50"}>
            Rifiuta richiesta
          </button>
        </div>
      )}
      {status === "confirmed" && (
        <button type="submit" name="status" value="cancelled" disabled={pending}
          className={buttonStyle + " border border-red-700 bg-white text-red-800 hover:bg-red-50"}>
          Annulla prenotazione
        </button>
      )}
      {pending ? (
        <p role="status" className="text-sm text-slate-600">Aggiornamento in corso…</p>
      ) : result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-sm text-selfweb-action" : "text-sm text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
