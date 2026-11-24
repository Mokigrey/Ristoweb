import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicBookingCalendar } from "@/lib/public-bookings";
import { isShowcaseSlug, showcasePath, showcaseSubdomainUrl } from "@/lib/showcase-address";
import VisitorBookingForm from "./visitor-booking-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prenota un appuntamento", robots: { index: false } };

export default async function PublicBookingPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ data?: string | string[] }>;
}) {
  const { slug } = await params;
  if (!isShowcaseSlug(slug)) notFound();
  const { data } = await searchParams;
  const calendar = await loadPublicBookingCalendar(slug, data);
  if (!calendar) notFound();

  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href={showcaseSubdomainUrl(slug) ?? showcasePath(slug)} className="font-medium text-emerald-900 underline">
          ← Torna alla vetrina
        </Link>
        <header>
          <p className="text-emerald-900">{calendar.name}</p>
          <h1 className="text-3xl font-bold text-gray-900">Prenota un appuntamento</h1>
          <p className="mt-1 text-sm text-gray-700">{calendar.durationMinutes} minuti · Ora italiana</p>
          {calendar.confirmationMode === "manual" && (
            <p className="mt-2 text-sm text-gray-700">L’appuntamento sarà confermato dal gestore dopo l’invio della richiesta.</p>
          )}
        </header>
        <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5">
          <label className="font-medium">Giorno
            <input
              type="date" name="data" defaultValue={calendar.selectedDay} min={calendar.firstDay} max={calendar.lastDay}
              required className="mt-1 block rounded-lg border border-gray-400 px-3 py-2 font-normal"
            />
          </label>
          <button type="submit" className="rounded-lg border border-emerald-800 px-4 py-2 font-medium text-emerald-900">Cerca orari</button>
        </form>
        <VisitorBookingForm
          key={calendar.selectedDay} slug={slug} slots={calendar.slots}
          maxPartySize={calendar.maxPartySize} confirmationMode={calendar.confirmationMode}
        />
      </div>
    </main>
  );
}
