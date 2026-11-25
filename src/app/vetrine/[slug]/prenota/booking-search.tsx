"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { BookingCalendar } from "@/lib/public-bookings";

export default function BookingSearch({ calendar, children }: {
  calendar: Pick<BookingCalendar, "services" | "serviceId" | "selectedDay" | "firstDay" | "lastDay">;
  children: ReactNode;
}) {
  const router = useRouter();
  const [searching, startSearch] = useTransition();
  const [day, setDay] = useState(calendar.selectedDay);
  const [serviceId, setServiceId] = useState(calendar.serviceId ?? "");
  const changed = day !== calendar.selectedDay || serviceId !== (calendar.serviceId ?? "");
  const input = "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal focus:border-selfweb-action focus:outline focus:outline-2 focus:outline-selfweb-accent";

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams({ data: day });
    if (serviceId) query.set("servizio", serviceId);
    startSearch(() => router.push("?" + query.toString(), { scroll: false }));
  }

  return (
    <>
      <form method="get" onSubmit={search} className="grid grid-cols-1 items-end gap-4 rounded-3xl border border-selfweb-border bg-white p-5 shadow-sm shadow-teal-950/5 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto] sm:p-6">
        {calendar.services.length > 0 && (
          <label className="min-w-0 text-sm font-semibold">Servizio
            <select name="servizio" value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={input}>
              {calendar.services.map(({ id, name, durationMinutes }) => (
                <option key={id} value={id}>{name} · {durationMinutes} min</option>
              ))}
            </select>
          </label>
        )}
        <label className="min-w-0 text-sm font-semibold">Giorno
          <input type="date" name="data" value={day} onChange={(event) => setDay(event.target.value)}
            min={calendar.firstDay} max={calendar.lastDay} required className={input} />
        </label>
        <button type="submit" disabled={searching} className="min-h-12 rounded-xl border border-selfweb-action px-4 py-2 text-sm font-semibold text-selfweb-action hover:bg-selfweb-canvas disabled:opacity-50">
          {searching ? "Cerco gli orari…" : "Cerca orari"}
        </button>
      </form>
      {changed && <p role="status" className="rounded-2xl border border-selfweb-border bg-white p-5 text-sm">Premi «Cerca orari» per aggiornare la disponibilità.</p>}
      <div hidden={changed}>{children}</div>
    </>
  );
}
