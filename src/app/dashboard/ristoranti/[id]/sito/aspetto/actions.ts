"use server";

import { revalidatePath } from "next/cache";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { createClient } from "@/lib/supabase/server";
import { isPaletteKey, type SiteAppearance } from "./appearance";

export async function saveSiteAppearance(tenantId: string, formData: FormData) {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") {
    return { success: false, message: "Sessione scaduta. Effettua nuovamente il login." };
  }
  if (access === "denied") {
    return { success: false, message: "Non sei autorizzato a modificare questo sito." };
  }

  const palette = formData.get("color_palette");
  if (!isPaletteKey(palette)) return { success: false, message: "Scegli una palette disponibile." };

  const appearance: SiteAppearance = {
    color_palette: palette,
    show_about: formData.get("show_about") === "on",
    show_gallery: formData.get("show_gallery") === "on",
    show_opening_hours: formData.get("show_opening_hours") === "on",
  };
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants").select("id, name").eq("id", tenantId).maybeSingle();
  if (tenantError || !tenant) return { success: false, message: "Attività non trovata." };

  const { error: initializationError } = await supabase.from("site_settings").upsert(
    { tenant_id: tenant.id, public_name: tenant.name },
    { onConflict: "tenant_id", ignoreDuplicates: true },
  );
  if (initializationError) return { success: false, message: "Impossibile aprire le impostazioni del sito." };

  const { error } = await supabase.from("site_settings")
    .update({ ...appearance, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenant.id)
    .select("tenant_id")
    .single();
  if (error) return { success: false, message: "Impossibile salvare l’aspetto del sito." };

  const sitePath = `/dashboard/ristoranti/${tenant.id}/sito`;
  revalidatePath(sitePath);
  revalidatePath(`${sitePath}/aspetto`);
  revalidatePath(`${sitePath}/anteprima`);
  return { success: true, message: "Aspetto del sito salvato." };
}
