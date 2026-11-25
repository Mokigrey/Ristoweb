import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isShowcaseSlug, showcasePath, showcaseSubdomainUrl } from "@/lib/showcase-address";
import BookingStatusPanel from "./booking-status-panel";
import BookingPageShell from "../booking-page-shell";

export const metadata: Metadata = {
  title: "Stato della prenotazione",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function BookingStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isShowcaseSlug(slug)) notFound();
  return (
    <BookingPageShell title="Stato della prenotazione" backHref={showcaseSubdomainUrl(slug) ?? showcasePath(slug)}>
      <BookingStatusPanel slug={slug} />
    </BookingPageShell>
  );
}
