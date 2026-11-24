"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { isBillingDate } from "@/lib/supabase/billing-cycle";

export async function saveBillingCycle(tenantId: string, expectedEnd: string | null, formData: FormData) {
  const supabase = await createClient();
  if (await getSiteAccess(supabase, tenantId) !== "platform") {
    return { success: false, message: "Il ciclo è gestito dall’amministratore della piattaforma." };
  }

  const end = formData.get("period_end");
  const start = expectedEnd ?? formData.get("period_start");
  if (!isBillingDate(end) || !isBillingDate(start) || start >= end) {
    return { success: false, message: "La data del prossimo rinnovo deve essere successiva all’inizio del ciclo." };
  }

  if (expectedEnd) {
    const { data, error } = await supabase.rpc("selfweb_record_renewal", {
      p_tenant_id: tenantId, p_expected_end: expectedEnd, p_next_end: end,
    });
    if (error || data !== true) {
      return { success: false, message: "Rinnovo non registrato. Verifica la scadenza del ciclo e ricarica la pagina." };
    }
  } else {
    const { error } = await supabase.from("tenant_billing_cycles").insert({
      tenant_id: tenantId, period_start: start, period_end: end,
    });
    if (error) return { success: false, message: "Impossibile configurare il ciclo. Ricarica la pagina e riprova." };
  }

  const base = `/dashboard/ristoranti/${tenantId}/sito`;
  revalidatePath(base, "layout");
  for (const suffix of ["", "/canone", "/moduli", "/menu", "/anteprima"]) revalidatePath(base + suffix);
  return { success: true, message: expectedEnd ? "Rinnovo registrato." : "Ciclo configurato." };
}
