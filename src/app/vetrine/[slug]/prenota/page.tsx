import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicBookingCalendar } from "@/lib/public-bookings";
import { isBookingId } from "@/lib/booking-services";
import { isShowcaseSlug, showcasePath, showcaseSubdomainUrl } from "@/lib/showcase-address";
import VisitorBookingForm from "./visitor-booking-form";
import BookingSearch from "./booking-search";
import BookingPageShell from "../booking-page-shell";

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
    <BookingPageShell title="Prenota un appuntamento" backHref={publicUrl ?? showcasePath(slug)}
      summary={
        <>
          <p className="mt-2 break-words font-semibold text-selfweb-accent">{calendar.name}</p>
          <p className="mt-3 text-sm font-medium text-teal-50">
            {selectedService && <>{selectedService.name} · </>}{calendar.durationMinutes} minuti · Ora italiana
          </p>
          {calendar.confirmationMode === "manual" && (
            <p className="mt-2 text-sm leading-relaxed text-teal-50">Il gestore confermerà l’appuntamento dopo aver ricevuto la richiesta.</p>
          )}
        </>
      }>
      <BookingSearch
        key={`${calendar.selectedDay}/${calendar.serviceId}/${calendar.durationMinutes}/${isBookingId(servizio) ? servizio : ""}`}
        calendar={{ services: calendar.services, serviceId: calendar.serviceId, selectedDay: calendar.selectedDay, firstDay: calendar.firstDay, lastDay: calendar.lastDay }}
      >
        <VisitorBookingForm
          slug={slug} slots={calendar.slots}
          maxPartySize={calendar.maxPartySize} confirmationMode={calendar.confirmationMode} statusPath={statusPath}
          serviceId={calendar.serviceId} serviceName={selectedService?.name} durationMinutes={calendar.durationMinutes}
        />
      </BookingSearch>
    </BookingPageShell>
  );
}
