import { isBillingDate } from "@/lib/supabase/billing-cycle";
import { createPublicClient } from "@/lib/supabase/public-client";
import { isBookingId } from "@/lib/booking-services";

export type BookingConfirmationMode = "manual" | "automatic";

export type BookingCalendar = {
  name: string;
  firstDay: string;
  lastDay: string;
  selectedDay: string;
  durationMinutes: number;
  maxPartySize: number;
  confirmationMode: BookingConfirmationMode;
  services: { id: string; name: string; durationMinutes: number }[];
  serviceId: string | null;
  slots: string[];
};

export async function loadPublicBookingCalendar(slug: string, date?: unknown, includeSlots = true, serviceId?: unknown) {
  const client = createPublicClient();
  const { data, error } = await client.rpc("selfweb_public_service_calendar", {
    p_slug: slug,
    p_day: isBillingDate(date) ? date : null,
    p_include_slots: includeSlots,
    p_service_id: isBookingId(serviceId) ? serviceId : null,
  });
  if (error) throw new Error("Impossibile caricare gli orari delle prenotazioni.");
  return data as BookingCalendar | null;
}
