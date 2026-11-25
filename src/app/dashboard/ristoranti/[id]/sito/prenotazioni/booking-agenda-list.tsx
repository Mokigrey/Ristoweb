import type { ReactNode } from "react";
import { bookingStatuses, type BookingStatus } from "./booking-status";

type AgendaEntry = {
  id: string;
  requested_at: string;
  slot_ends_at: string | null;
  customer_name: string;
  booking_service_name: string | null;
  customer_phone: string;
  status: BookingStatus;
};

const clock = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });
const statusStyle: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-950",
  confirmed: "bg-emerald-100 text-emerald-950",
  declined: "bg-slate-100 text-slate-800",
  cancelled: "bg-slate-100 text-slate-800",
};

export default function BookingAgendaList({ bookings, filtered, controls }: {
  bookings: AgendaEntry[];
  filtered: boolean;
  controls?: (booking: AgendaEntry) => ReactNode;
}) {
  if (!bookings.length) {
    return <p className="rounded-2xl border border-selfweb-border bg-white p-5 text-slate-700">
      {filtered ? "Nessun appuntamento per questo servizio nella data selezionata." : "Nessun appuntamento o richiesta in attesa per questa data."}
    </p>;
  }

  return (
    <ol aria-label="Appuntamenti in ordine di orario" className="space-y-3">
      {bookings.map((booking) => (
        <li key={booking.id} className="grid gap-3 rounded-2xl border border-selfweb-border bg-white p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:p-5">
          <p className="flex flex-wrap items-start gap-x-1 font-bold tabular-nums text-selfweb-action">
            <time dateTime={booking.requested_at}>{clock.format(new Date(booking.requested_at))}</time>
            {booking.slot_ends_at && <><span aria-hidden="true">–</span><time dateTime={booking.slot_ends_at}>{clock.format(new Date(booking.slot_ends_at))}</time></>}
          </p>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="break-words text-lg font-bold">{booking.customer_name}</h3>
              <span className={"rounded-full px-3 py-1 text-sm font-medium " + statusStyle[booking.status]}>
                {booking.status === "confirmed" ? "Confermato" : bookingStatuses[booking.status]}
              </span>
            </div>
            {booking.booking_service_name && <p className="mt-1 break-words text-slate-700">{booking.booking_service_name}</p>}
            <p className="mt-1 break-words text-sm text-slate-700">{booking.customer_phone}</p>
            {controls?.(booking)}
          </div>
        </li>
      ))}
    </ol>
  );
}
