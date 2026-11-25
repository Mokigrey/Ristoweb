import type { createClient } from "./server";

export const digitalMenuModule = "digital_menu";
export const bookingsModule = "bookings";

export const siteModulePanels = [
  { key: digitalMenuModule, path: "/menu", label: "Menu digitale", actionLabel: "Gestisci menu", description: "Gestisci categorie, prodotti, prezzi e descrizioni." },
  { key: bookingsModule, path: "/prenotazioni", label: "Prenotazioni", actionLabel: "Gestisci prenotazioni", description: "Gestisci le richieste e le regole degli appuntamenti online.", mobilePrimary: true },
] as const;

export async function getEnabledSiteModules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
) {
  const { data, error } = await supabase.from("tenant_modules")
    .select("module_key").eq("tenant_id", tenantId).eq("enabled", true);
  if (error) throw new Error("Impossibile caricare i moduli del sito.");
  return new Set<string>(data.map(({ module_key }) => module_key));
}

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
