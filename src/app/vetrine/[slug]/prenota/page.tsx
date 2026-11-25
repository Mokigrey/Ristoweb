import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicBookingCalendar } from "@/lib/public-bookings";
import { isShowcaseSlug, showcasePath, showcaseSubdomainUrl } from "@/lib/showcase-address";
import VisitorBookingForm from "./visitor-booking-form";
import BookingSearch from "./booking-search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prenota un appuntamento", robots: { index: false } };

export default async function PublicBookingPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ data?: string | string[]; servizio?: string | string[] }>;
}) {
  const { slug } = await params;
  if (!isShowcaseSlug(slug)) notFound();
  const { data, servizio } = await searchParams;
  const calendar = await loadPublicBookingCalendar(slug, data, true, servizio);
  if (!calendar) notFound();
  const selectedService = calendar.services.find(({ id }) => id === calendar.serviceId);
  const publicUrl = showcaseSubdomainUrl(slug);
  const statusPath = publicUrl ? new URL("stato-prenotazione", publicUrl).href : showcasePath(slug) + "/stato-prenotazione";

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href={publicUrl ?? showcasePath(slug)} className="font-medium text-emerald-900 underline">
          ← Torna alla vetrina
        </Link>
        <header>
          <p className="text-emerald-900">{calendar.name}</p>
          <h1 className="text-3xl font-bold text-gray-900">Prenota un appuntamento</h1>
          <p className="mt-1 text-sm text-gray-700">
            {selectedService && <>{selectedService.name} · </>}{calendar.durationMinutes} minuti · Ora italiana
          </p>
          {calendar.confirmationMode === "manual" && (
            <p className="mt-2 text-sm text-gray-700">L’appuntamento sarà confermato dal gestore dopo l’invio della richiesta.</p>
          )}
        </header>
        <BookingSearch
          key={`${calendar.selectedDay}/${calendar.serviceId}/${calendar.durationMinutes}`}
          calendar={{ services: calendar.services, serviceId: calendar.serviceId, selectedDay: calendar.selectedDay, firstDay: calendar.firstDay, lastDay: calendar.lastDay }}
        >
          <VisitorBookingForm
            slug={slug} slots={calendar.slots}
            maxPartySize={calendar.maxPartySize} confirmationMode={calendar.confirmationMode} statusPath={statusPath}
            serviceId={calendar.serviceId} serviceName={selectedService?.name} durationMinutes={calendar.durationMinutes}
          />
        </BookingSearch>
      </div>
    </main>
  );
}
