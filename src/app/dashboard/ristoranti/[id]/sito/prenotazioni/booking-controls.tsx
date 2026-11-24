"use client";

import { useActionState } from "react";
import { updateBookingStatus } from "./actions";
import type { BookingStatus } from "./booking-status";

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
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      {status === "pending" && (
        <>
          <button type="submit" name="status" value="confirmed" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
            Conferma
          </button>
          <button type="submit" name="status" value="declined" disabled={pending} className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50">
            Rifiuta
          </button>
        </>
      )}
      {status === "confirmed" && (
        <button type="submit" name="status" value="cancelled" disabled={pending} className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50">
          Annulla prenotazione
        </button>
      )}
      {result.message && <p role={result.success ? "status" : "alert"} className="text-sm">{result.message}</p>}
    </form>
  );
}
