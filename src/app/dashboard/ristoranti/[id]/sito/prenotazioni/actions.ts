"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBookingStatus, type BookingStatus } from "./booking-status";

function bookingsPath(tenantId: string) {
  return `/dashboard/ristoranti/${tenantId}/sito/prenotazioni`;
}

export async function addManualBooking(tenantId: string, form: FormData) {
  const read = (name: string) => String(form.get(name) ?? "").trim();
  const name = read("customer_name");
  const phone = read("customer_phone");
  const email = read("customer_email");
  const people = Number(read("party_size"));
  const localDate = read("requested_local");
  const notes = read("notes");

  if (!name || name.length > 150 || !/^[+0-9(). /-]{3,40}$/.test(phone) || !/\d/.test(phone)
    || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    || !Number.isInteger(people) || people < 1 || people > 30
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDate) || notes.length > 1000) {
    return { success: false, message: "Controlla i dati, la data e l’orario della richiesta." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("selfweb_create_manual_booking", {
    p_tenant_id: tenantId,
    p_customer_name: name,
    p_customer_phone: phone,
    p_customer_email: email || null,
    p_party_size: people,
    p_requested_local: localDate,
    p_notes: notes || null,
  });
  if (error || typeof data !== "string") {
    return { success: false, message: "Impossibile registrare la richiesta. Verifica l’orario e riprova." };
  }
  revalidatePath(bookingsPath(tenantId));
  return { success: true, message: "Richiesta registrata. La trovi tra quelle da valutare." };
}

export async function updateBookingStatus(
  tenantId: string, bookingId: string, expected: BookingStatus, form: FormData,
) {
  const next = form.get("status");
  if (!isBookingStatus(expected) || !isBookingStatus(next)) {
    return { success: false, message: "Stato della prenotazione non valido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("selfweb_change_booking_status", {
    p_tenant_id: tenantId,
    p_booking_id: bookingId,
    p_expected_status: expected,
    p_new_status: next,
  });
  revalidatePath(bookingsPath(tenantId));
  return !error && data === true
    ? { success: true, message: "Stato aggiornato." }
    : { success: false, message: "Impossibile aggiornare la richiesta. Verifica lo stato corrente." };
}
