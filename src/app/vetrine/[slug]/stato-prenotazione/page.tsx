import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isShowcaseSlug, showcasePath, showcaseSubdomainUrl } from "@/lib/showcase-address";
import BookingStatusPanel from "./booking-status-panel";

export const metadata: Metadata = {
  title: "Stato della prenotazione",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function BookingStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isShowcaseSlug(slug)) notFound();
  return (
    <main className="min-h-screen bg-emerald-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href={showcaseSubdomainUrl(slug) ?? showcasePath(slug)} className="font-medium text-emerald-900 underline">
          ← Torna alla vetrina
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Stato della prenotazione</h1>
        <BookingStatusPanel slug={slug} />
      </div>
    </main>
  );
}
