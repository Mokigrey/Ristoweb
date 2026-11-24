import type { createClient } from "./server";

export const digitalMenuModule = "digital_menu";
export const bookingsModule = "bookings";

export async function isSiteModuleEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  moduleKey: string,
) {
  const { data, error } = await supabase
    .from("tenant_modules")
    .select("enabled")
    .eq("tenant_id", tenantId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  if (error) throw new Error("Impossibile verificare i moduli del sito.");
  return data?.enabled === true;
}
