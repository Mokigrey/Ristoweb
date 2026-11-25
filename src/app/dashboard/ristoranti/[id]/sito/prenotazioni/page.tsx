import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { bookingsModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";
import { isBookingId } from "@/lib/booking-services";
import BookingControls from "./booking-controls";
import { bookingStatuses, isBookingStatus, type BookingStatus } from "./booking-status";
import ManualBookingForm from "./manual-booking-form";
import BookingRulesForm from "./booking-rules-form";
import BookingServiceForm from "./booking-service-form";
import BookingServiceFilter from "./booking-service-filter";

const perPage = 20;
const bookingDate = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

export default async function BookingsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stato?: string | string[]; pagina?: string | string[]; servizio?: string | string[] }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const status = isBookingStatus(filters.stato) ? filters.stato : "pending";
  const service = filters.servizio === "senza-servizio" || isBookingId(filters.servizio) ? filters.servizio : undefined;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied" || !await isSiteModuleEnabled(supabase, id, bookingsModule)) notFound();

  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  const queuePath = sitePath + "/prenotazioni";
  const queueHref = (nextStatus: BookingStatus, nextPage?: number) => {
    const query = new URLSearchParams({ stato: nextStatus });
    if (service) query.set("servizio", service);
    if (nextPage) query.set("pagina", String(nextPage));
    return queuePath + "?" + query.toString();
  };
  const requestedPage = Number(filters.pagina ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= Math.floor(2_147_483_647 / perPage)
    ? requestedPage : 1;
  const start = (page - 1) * perPage;
  const bookings = supabase.from("bookings")
    .select("id, customer_name, customer_phone, customer_email, party_size, requested_at, notes, management_note, status, slot_ends_at, booking_service_name", { count: "exact" })
    .eq("tenant_id", id).eq("status", status);
  if (service === "senza-servizio") bookings.is("booking_service_id", null);
  else if (service) bookings.eq("booking_service_id", service);

  const [list, config, services] = await Promise.all([
    bookings
      .order("requested_at", { ascending: status === "pending" }).order("id").range(start, start + perPage - 1),
    supabase.from("booking_rules").select("enabled, duration_minutes, notice_minutes, horizon_days, max_party_size, confirmation_mode")
      .eq("tenant_id", id).maybeSingle(),
    supabase.from("booking_services").select("id, name, duration_minutes, enabled")
      .eq("tenant_id", id).order("name").order("id"),
  ]);
  const { data, count } = list;
  if (list.error || config.error || services.error || count === null) throw new Error("Impossibile caricare le prenotazioni.");

  const lastPage = Math.max(1, Math.ceil(count / perPage));
  if (page > lastPage) redirect(queueHref(status, lastPage));

  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href={sitePath} className="text-selfweb-action hover:underline">← Gestione sito</Link>
        <h1 className="rounded-2xl bg-selfweb-hero px-5 py-8 text-3xl font-bold tracking-tight text-white sm:px-8 sm:text-4xl">Prenotazioni</h1>
        <details className="rounded-xl border border-selfweb-border bg-white p-5">
          <summary className="cursor-pointer font-semibold text-selfweb-ink">
            Appuntamenti online · {config.data?.enabled ? "Attivi" : "Disattivati"}
          </summary>
          <BookingRulesForm tenantId={id} hoursHref={sitePath + "/orari"} rules={config.data} />
        </details>
        <details className="rounded-xl border border-selfweb-border bg-white p-5">
          <summary className="cursor-pointer font-semibold text-selfweb-ink">Servizi prenotabili · {services.data.filter(({ enabled }) => enabled).length} attivi</summary>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">Ogni servizio ha la propria durata. Senza servizi attivi, la vetrina usa la durata predefinita degli appuntamenti.</p>
            {services.data.map((service) => <BookingServiceForm key={service.id} tenantId={id} service={service} />)}
            <BookingServiceForm tenantId={id} />
          </div>
        </details>
        <details className="rounded-xl border border-selfweb-border bg-white p-5">
          <summary className="cursor-pointer font-semibold text-selfweb-ink">Registra una richiesta</summary>
          <ManualBookingForm tenantId={id} />
        </details>
        <nav aria-label="Stato delle prenotazioni" className="flex flex-wrap gap-2">
          {Object.keys(bookingStatuses).filter(isBookingStatus).map((key) => (
            <Link
              key={key} href={queueHref(key)} aria-current={key === status ? "page" : undefined}
              className={key === status
                ? "inline-flex min-h-11 items-center rounded-full bg-selfweb-action px-4 py-2 text-sm font-semibold text-white"
                : "inline-flex min-h-11 items-center rounded-full border border-selfweb-border bg-white px-4 py-2 text-sm font-medium text-selfweb-ink hover:bg-selfweb-accent"}
            >
              {bookingStatuses[key]}
            </Link>
          ))}
        </nav>
        {(services.data.length > 0 || service) && (
          <BookingServiceFilter queuePath={queuePath} status={status} selected={service} services={services.data} />
        )}
        {data.length ? (
          <ul className="space-y-3">
            {data.map((booking) => (
              <li key={booking.id} className="rounded-xl border border-selfweb-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{booking.customer_name}</h2>
                  <time dateTime={booking.requested_at} className="text-sm font-medium text-gray-700">
                    {bookingDate.format(new Date(booking.requested_at))}
                  </time>
                </div>
                <p className="mt-1 text-sm text-gray-700">{booking.party_size} {booking.party_size === 1 ? "persona" : "persone"}</p>
                {booking.booking_service_name && <p className="mt-1 font-medium text-selfweb-ink">{booking.booking_service_name}</p>}
                {booking.slot_ends_at && <p className="mt-1 text-sm text-emerald-900">Prenotata online</p>}
                <p className="mt-2 break-words text-sm text-gray-700">
                  {booking.customer_phone}{booking.customer_email && ` · ${booking.customer_email}`}
                </p>
                {booking.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-700">{booking.notes}</p>}
                {booking.management_note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-700">Nota interna · {booking.management_note}</p>}
                {(status === "pending" || status === "confirmed") && (
                  <BookingControls tenantId={id} bookingId={booking.id} status={status} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-selfweb-border bg-white p-5 text-gray-700">
            {service ? "Nessuna richiesta per il servizio e lo stato selezionati." : "Nessuna richiesta in questo stato."}
          </p>
        )}
        {lastPage > 1 && (
          <nav aria-label="Pagine delle prenotazioni" className="flex flex-wrap items-center gap-4 text-sm">
            {page > 1 && <Link className="text-selfweb-action underline" href={queueHref(status, page - 1)}>Precedente</Link>}
            <span>Pagina {page} di {lastPage}</span>
            {page < lastPage && <Link className="text-selfweb-action underline" href={queueHref(status, page + 1)}>Successiva</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}
