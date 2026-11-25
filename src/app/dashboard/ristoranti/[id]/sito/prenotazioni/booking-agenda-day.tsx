import { firstBookingDay, formatBookingDay, lastBookingDay, shiftBookingDay } from "@/lib/booking-day";
import { todayInRome } from "@/lib/supabase/billing-cycle";

export function bookingAgendaHref(queuePath: string, day: string, service?: string, page?: number) {
  const params = new URLSearchParams({ vista: "agenda", giorno: day });
  if (service) params.set("servizio", service);
  if (page) params.set("pagina", String(page));
  return queuePath + "?" + params.toString();
}

export default function BookingAgendaDay({ queuePath, day, service }: {
  queuePath: string;
  day: string;
  service?: string;
}) {
  const linkStyle = "inline-flex min-h-11 items-center rounded-xl border border-selfweb-border px-3 py-2 text-sm font-semibold text-selfweb-action hover:bg-selfweb-canvas";

  return (
    <section aria-labelledby="booking-day" className="space-y-4 rounded-2xl border border-selfweb-border bg-white p-4 sm:p-5">
      <h2 id="booking-day" className="text-xl font-bold first-letter:uppercase">
        <time dateTime={day}>{formatBookingDay(day)}</time>
      </h2>
      <nav aria-label="Giorni dell’agenda" className="flex flex-wrap gap-2">
        {day > firstBookingDay && <a className={linkStyle} href={bookingAgendaHref(queuePath, shiftBookingDay(day, -1), service)}>Giorno precedente</a>}
        <a className={linkStyle} href={bookingAgendaHref(queuePath, todayInRome(), service)}>Oggi</a>
        {day < lastBookingDay && <a className={linkStyle} href={bookingAgendaHref(queuePath, shiftBookingDay(day, 1), service)}>Giorno successivo</a>}
      </nav>
      <form action={queuePath} method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="vista" value="agenda" />
        {service && <input type="hidden" name="servizio" value={service} />}
        <label className="text-sm font-semibold">Vai alla data
          <input key={day} name="giorno" type="date" required defaultValue={day} min={firstBookingDay} max={lastBookingDay}
            className="mt-1 block min-h-11 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal" />
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-selfweb-action px-4 py-2 text-sm font-semibold text-white hover:bg-selfweb-hero">Mostra giorno</button>
      </form>
    </section>
  );
}
