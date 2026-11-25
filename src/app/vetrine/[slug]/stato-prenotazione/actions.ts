"use server";

import { createPublicClient } from "@/lib/supabase/public-client";
import { isShowcaseSlug } from "@/lib/showcase-address";
import { isBookingId } from "@/lib/booking-services";

type BookingState = {
  status: "pending" | "confirmed" | "declined" | "cancelled";
  canCancel: boolean;
  startsAt: string;
  name: string;
  serviceName?: string | null;
  durationMinutes?: number | null;
};

async function requestBookingState(rpc: "selfweb_public_booking_status" | "selfweb_cancel_public_booking",
  slug: string, reference: string,
): Promise<BookingState | null> {
  if (!isShowcaseSlug(slug) || !isBookingId(reference)) return null;
  const client = createPublicClient();
  const { data, error } = await client.rpc(rpc, {
    p_slug: slug,
    p_request_id: reference,
  });
  if (error) throw new Error("Impossibile completare l’operazione sulla prenotazione.");
  return data as BookingState | null;
}

export async function readBookingStatus(slug: string, reference: string) {
  return requestBookingState("selfweb_public_booking_status", slug, reference);
}

export async function cancelBooking(slug: string, reference: string) {
  return requestBookingState("selfweb_cancel_public_booking", slug, reference);
}
