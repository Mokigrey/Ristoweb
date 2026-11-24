import type { createClient } from "@/lib/supabase/server";
import type { CatalogEntry } from "./site-catalog";

export async function loadSiteCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CatalogEntry[]> {
  const { data, error } = await supabase
    .from("sector_templates")
    .select("sector_key, template_key")
    .order("sector_key")
    .order("template_key");

  if (error || !data?.length) {
    throw new Error("Il catalogo di settori e template non è disponibile.");
  }

  return data;
}
