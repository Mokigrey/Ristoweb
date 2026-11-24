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
  return { success: true, message: "Richiesta registrata. La trovi in «In attesa di conferma»." };
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
  if (error?.code === "23P01") {
    return { success: false, message: "Non puoi confermare la richiesta. C’è già un appuntamento a quell’ora." };
  }
  return !error && data === true
    ? { success: true, message: "Stato aggiornato." }
    : { success: false, message: "Impossibile aggiornare la richiesta. Verifica lo stato corrente." };
}

export async function saveBookingRules(tenantId: string, form: FormData) {
  const duration_minutes = Number(form.get("duration_minutes"));
  const notice_minutes = Number(form.get("notice_minutes"));
  const horizon_days = Number(form.get("horizon_days"));
  const max_party_size = Number(form.get("max_party_size"));
  const confirmation_mode = form.get("confirmation_mode");
  if (![15, 30, 45, 60, 90, 120].includes(duration_minutes)
    || ![0, 60, 120, 240, 1440].includes(notice_minutes) || ![7, 14, 30, 60].includes(horizon_days)
    || !Number.isInteger(max_party_size) || max_party_size < 1 || max_party_size > 30
    || (confirmation_mode !== "manual" && confirmation_mode !== "automatic")) {
    return { success: false, message: "Controlla le impostazioni della prenotazione." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("booking_rules").upsert({
    tenant_id: tenantId,
    enabled: form.get("enabled") === "on",
    duration_minutes, notice_minutes, horizon_days, max_party_size, confirmation_mode,
  }).select("tenant_id").single();
  if (error || !data) return { success: false, message: "Impossibile salvare le impostazioni." };
  revalidatePath(bookingsPath(tenantId));
  return { success: true, message: "Impostazioni salvate." };
}
