"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";

function refreshModules(tenantId: string) {
  const base = `/dashboard/ristoranti/${tenantId}/sito`;
  revalidatePath(base, "layout");
  for (const suffix of ["", "/moduli", "/canone", "/menu", "/anteprima", "/piano"]) revalidatePath(base + suffix);
}

export async function setRemovalAtRenewal(tenantId: string, moduleKey: string, schedule: boolean) {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out" || access === "denied" || typeof schedule !== "boolean") {
    return { success: false, message: "Operazione non disponibile." };
  }

  const { data: cycle, error: cycleError } = await supabase.from("tenant_billing_cycles")
    .select("period_end").eq("tenant_id", tenantId).maybeSingle();
  if (cycleError || !cycle) return { success: false, message: "Il ciclo di abbonamento non è configurato." };

  if (schedule) {
    const { error } = await supabase.from("tenant_module_removals").upsert({
      tenant_id: tenantId, module_key: moduleKey, period_end: cycle.period_end,
    }, { onConflict: "tenant_id,module_key", ignoreDuplicates: true });
    if (error) return { success: false, message: "Impossibile programmare la disattivazione." };
  } else {
    const { data, error } = await supabase.from("tenant_module_removals").delete()
      .eq("tenant_id", tenantId).eq("module_key", moduleKey).eq("period_end", cycle.period_end)
      .select("module_key").maybeSingle();
    if (error || !data) return { success: false, message: "Impossibile annullare la disattivazione. Ricarica la pagina." };
  }

  refreshModules(tenantId);
  return { success: true, message: schedule ? "Disattivazione programmata al rinnovo." : "Disattivazione annullata." };
}

export async function setModuleEnabled(tenantId: string, moduleKey: string, enabled: boolean) {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access !== "platform") return { success: false, message: "L’attivazione è riservata all’amministratore." };
  if (typeof enabled !== "boolean") return { success: false, message: "Stato del modulo non valido." };
  if (!enabled) {
    const { data: cycle, error } = await supabase.from("tenant_billing_cycles")
      .select("tenant_id").eq("tenant_id", tenantId).maybeSingle();
    if (error || cycle) return { success: false, message: "Per questo sito la disattivazione va programmata al rinnovo." };
  }

  const { error } = await supabase.from("tenant_modules").upsert({
    tenant_id: tenantId,
    module_key: moduleKey,
    enabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,module_key" });
  if (error) return { success: false, message: "Impossibile aggiornare il modulo." };

  refreshModules(tenantId);
  return { success: true, message: enabled ? "Modulo attivato." : "Modulo disattivato. I contenuti salvati sono conservati." };
}
