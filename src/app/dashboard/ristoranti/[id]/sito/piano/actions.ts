"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";

export async function saveDraftPlan(tenantId: string, form: FormData) {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out" || access === "denied") {
    return { success: false, message: "Non puoi modificare il piano di questa vetrina." };
  }

  const keys = form.getAll("module");
  if (keys.some((key) => typeof key !== "string" || !key.trim())) {
    return { success: false, message: "Selezione dei moduli non valida." };
  }
  const { data, error } = await supabase.rpc("selfweb_save_draft_modules", {
    p_tenant_id: tenantId,
    p_module_keys: [...new Set(keys)],
  });
  if (error || data !== true) {
    return { success: false, message: "Impossibile salvare il piano. Ricarica la pagina e riprova." };
  }

  const planPath = `/dashboard/ristoranti/${tenantId}/sito/piano`;
  revalidatePath(planPath);
  revalidatePath(`${planPath}/riepilogo`);
  return { success: true, message: "Scelta salvata nella bozza." };
}
