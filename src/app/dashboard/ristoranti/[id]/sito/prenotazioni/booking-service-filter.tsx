import Link from "next/link";
import type { BookingStatus } from "./booking-status";
import { bookingAgendaHref } from "./booking-agenda-day";

export default function BookingServiceFilter({ queuePath, status, selected, services, agendaDay }: {
  queuePath: string;
  status: BookingStatus;
  selected?: string;
  agendaDay?: string;
  services: { id: string; name: string; enabled: boolean }[];
}) {
  return (
    <form action={queuePath} method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-selfweb-border bg-white p-4">
      {agendaDay ? <>
        <input type="hidden" name="vista" value="agenda" />
        <input type="hidden" name="giorno" value={agendaDay} />
      </> : <input type="hidden" name="stato" value={status} />}
      <label className="w-full text-sm font-semibold sm:max-w-xs">Filtra per servizio
        <select key={selected} name="servizio" defaultValue={selected ?? ""} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">
          <option value="">Tutti i servizi</option>
          <option value="senza-servizio">Senza servizio associato</option>
          {selected && selected !== "senza-servizio" && !services.some(({ id }) => id === selected) && (
            <option value={selected}>Servizio non disponibile</option>
          )}
          {services.map(({ id, name, enabled }) => (
            <option key={id} value={id}>{name}{enabled ? "" : " (disattivato)"}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-xl bg-selfweb-action px-4 py-2 text-sm font-semibold text-white hover:bg-selfweb-hero">
        Applica filtro
      </button>
      {selected && <Link href={agendaDay ? bookingAgendaHref(queuePath, agendaDay) : queuePath + "?stato=" + status}
        className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-selfweb-action hover:underline">Azzera filtro</Link>}
    </form>
  );
}
