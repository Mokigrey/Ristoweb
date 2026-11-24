import { isBillingDate } from "@/lib/supabase/billing-cycle";
import { createPublicClient } from "@/lib/supabase/public-client";

export type BookingConfirmationMode = "manual" | "automatic";

type BookingCalendar = {
  name: string;
  firstDay: string;
  lastDay: string;
  selectedDay: string;
  durationMinutes: number;
  maxPartySize: number;
  confirmationMode: BookingConfirmationMode;
  slots: string[];
};

export async function loadPublicBookingCalendar(slug: string, date?: unknown, includeSlots = true) {
  const client = createPublicClient();
  const { data, error } = await client.rpc("selfweb_public_booking_calendar", {
    p_slug: slug,
    p_day: isBillingDate(date) ? date : null,
    p_include_slots: includeSlots,
  });
  if (error) throw new Error("Impossibile caricare gli orari delle prenotazioni.");
  return data as BookingCalendar | null;
}
