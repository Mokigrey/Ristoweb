"use server";

import { revalidatePath } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public-client";
import { isShowcaseSlug, showcasePath } from "@/lib/showcase-address";
import { isAppointmentDuration, isBookingId } from "@/lib/booking-services";

type BookingResult = { success: true; status: "pending" | "confirmed" }
  | { success: false; refresh: boolean; message: string };

export async function reserveVisitorSlot(
  slug: string, requestId: string, serviceId: string | null, expectedDuration: number, form: FormData,
): Promise<BookingResult> {
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const slot = String(form.get("slot") ?? "");
  const partySize = Number(form.get("people"));
  if (!isShowcaseSlug(slug) || !isBookingId(requestId) || (serviceId !== null && !isBookingId(serviceId))
    || !isAppointmentDuration(expectedDuration) || !name || name.length > 150
    || !/^[+0-9(). /-]{6,40}$/.test(phone) || !Number.isFinite(Date.parse(slot))
    || !Number.isInteger(partySize) || partySize < 1 || partySize > 30
    || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) {
    return { success: false, refresh: false, message: "Controlla orario, nome e recapito." };
  }

  const client = createPublicClient();
  const { data, error } = await client.rpc("selfweb_reserve_public_service", {
    p_slug: slug,
    p_slot: slot,
    p_request_id: requestId,
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_party_size: partySize,
    p_service_id: serviceId,
    p_expected_duration: expectedDuration,
  });
  if ((data === "pending" || data === "confirmed") && !error) {
    revalidatePath(showcasePath(slug) + "/prenota");
    return { success: true, status: data };
  }
  if (data === "unavailable" || error?.code === "23P01") {
    return { success: false, refresh: true, message: "La disponibilità del servizio è cambiata. Controlla gli orari aggiornati." };
  }
  if (data === "limit_reached") {
    return { success: false, refresh: false, message: "Hai raggiunto il limite di richieste. Contatta direttamente l’attività." };
  }
  if (data === "invalid") {
    return { success: false, refresh: false, message: "Controlla i recapiti e il numero di persone." };
  }
  return { success: false, refresh: false, message: "Impossibile completare la prenotazione. Riprova." };
}
