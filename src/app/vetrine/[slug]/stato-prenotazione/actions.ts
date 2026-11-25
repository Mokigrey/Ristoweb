"use server";

import { createPublicClient } from "@/lib/supabase/public-client";
import { isShowcaseSlug } from "@/lib/showcase-address";

const referenceFormat = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type BookingState = {
  status: "pending" | "confirmed" | "declined" | "cancelled";
  startsAt: string;
  name: string;
};

export async function readBookingStatus(slug: string, reference: string): Promise<BookingState | null> {
  if (!isShowcaseSlug(slug) || !referenceFormat.test(reference)) return null;
  const client = createPublicClient();
  const { data, error } = await client.rpc("selfweb_public_booking_status", {
    p_slug: slug,
    p_request_id: reference,
  });
  if (error) throw new Error("Impossibile controllare lo stato della prenotazione.");
  return data as BookingState | null;
}
