"use client";

import { useState, type ReactNode } from "react";
import type { BookingCalendar } from "@/lib/public-bookings";

export default function BookingSearch({ calendar, children }: {
  calendar: Pick<BookingCalendar, "services" | "serviceId" | "selectedDay" | "firstDay" | "lastDay">;
  children: ReactNode;
}) {
  const [day, setDay] = useState(calendar.selectedDay);
  const [serviceId, setServiceId] = useState(calendar.serviceId ?? "");
  const changed = day !== calendar.selectedDay || serviceId !== (calendar.serviceId ?? "");
  const input = "mt-1 block min-h-11 w-full rounded-lg border border-gray-400 bg-white px-3 py-2 font-normal";

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-selfweb-border bg-white p-5">
        {calendar.services.length > 0 && (
          <label className="w-full font-medium sm:w-auto sm:flex-1">Servizio
            <select name="servizio" value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={input}>
              {calendar.services.map(({ id, name, durationMinutes }) => (
                <option key={id} value={id}>{name} · {durationMinutes} min</option>
              ))}
            </select>
          </label>
        )}
        <label className="min-w-0 font-medium">Giorno
          <input type="date" name="data" value={day} onChange={(event) => setDay(event.target.value)}
            min={calendar.firstDay} max={calendar.lastDay} required className={input} />
        </label>
        <button type="submit" className="min-h-11 rounded-lg border border-selfweb-action px-4 py-2 font-medium text-selfweb-action hover:bg-selfweb-canvas">
          Cerca orari
        </button>
      </form>
      {changed && <p role="status" className="rounded-xl border border-selfweb-border bg-white p-5 text-sm">Selezione aggiornata. Premi «Cerca orari» per vedere la disponibilità.</p>}
      <div hidden={changed}>{children}</div>
    </>
  );
}
