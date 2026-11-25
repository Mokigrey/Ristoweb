import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { bookingsModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";
import BookingControls from "./booking-controls";
import { bookingStatuses, isBookingStatus } from "./booking-status";
import ManualBookingForm from "./manual-booking-form";
import BookingRulesForm from "./booking-rules-form";

const perPage = 20;
const bookingDate = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

export default async function BookingsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stato?: string | string[]; pagina?: string | string[] }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const status = isBookingStatus(filters.stato) ? filters.stato : "pending";
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied" || !await isSiteModuleEnabled(supabase, id, bookingsModule)) notFound();

  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  const queuePath = sitePath + "/prenotazioni";
  const requestedPage = Number(filters.pagina ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= Math.floor(2_147_483_647 / perPage)
    ? requestedPage : 1;
  const start = (page - 1) * perPage;
  const [list, config] = await Promise.all([
    supabase.from("bookings")
      .select("id, customer_name, customer_phone, customer_email, party_size, requested_at, notes, management_note, status, slot_ends_at", { count: "exact" })
      .eq("tenant_id", id).eq("status", status)
      .order("requested_at", { ascending: status === "pending" }).order("id").range(start, start + perPage - 1),
    supabase.from("booking_rules").select("enabled, duration_minutes, notice_minutes, horizon_days, max_party_size, confirmation_mode")
      .eq("tenant_id", id).maybeSingle(),
  ]);
  const { data, count } = list;
  if (list.error || config.error || count === null) throw new Error("Impossibile caricare le prenotazioni.");

  const lastPage = Math.max(1, Math.ceil(count / perPage));
  if (page > lastPage) redirect(`${queuePath}?stato=${status}&pagina=${lastPage}`);

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
          <summary className="cursor-pointer font-semibold text-selfweb-ink">Registra una richiesta</summary>
          <ManualBookingForm tenantId={id} />
        </details>
        <nav aria-label="Stato delle prenotazioni" className="flex flex-wrap gap-2">
          {Object.entries(bookingStatuses).map(([key, label]) => (
            <Link
              key={key} href={`${queuePath}?stato=${key}`} aria-current={key === status ? "page" : undefined}
              className={key === status
                ? "inline-flex min-h-11 items-center rounded-full bg-selfweb-action px-4 py-2 text-sm font-semibold text-white"
                : "inline-flex min-h-11 items-center rounded-full border border-selfweb-border bg-white px-4 py-2 text-sm font-medium text-selfweb-ink hover:bg-selfweb-accent"}
            >
              {label}
            </Link>
          ))}
        </nav>
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
          <p className="rounded-xl border border-selfweb-border bg-white p-5 text-gray-700">Nessuna richiesta in questo stato.</p>
        )}
        {lastPage > 1 && (
          <nav aria-label="Pagine delle prenotazioni" className="flex flex-wrap items-center gap-4 text-sm">
            {page > 1 && <Link className="text-emerald-800 underline" href={`${queuePath}?stato=${status}&pagina=${page - 1}`}>Precedente</Link>}
            <span>Pagina {page} di {lastPage}</span>
            {page < lastPage && <Link className="text-emerald-800 underline" href={`${queuePath}?stato=${status}&pagina=${page + 1}`}>Successiva</Link>}
          </nav>
        )}
      </div>
    </main>
  );
}
