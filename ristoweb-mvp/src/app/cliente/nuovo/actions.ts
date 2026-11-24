"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSiteDraft(form: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Accedi di nuovo per creare la vetrina." };

  function field(key: string) {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  }
  const name = field("name");
  const slug = field("slug").toLowerCase();
  const sector = field("business_type");
  const template = field("template_key");
  const city = field("city");
  const description = field("description");

  if (name.length < 2 || name.length > 150 || city.length > 255 || description.length > 4000) {
    return { error: "Controlla il nome dell’attività e la lunghezza dei campi." };
  }
  if (slug.length < 2 || slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Usa lettere minuscole, numeri e trattini per l’identificativo." };
  }
  if (!sector || !template) return { error: "Scegli il settore e il template della vetrina." };

  const { data, error } = await supabase.rpc("selfweb_create_site_draft", {
    p_name: name, p_slug: slug, p_sector: sector, p_template: template,
    p_city: city || null, p_description: description || null,
  });
  if (error?.code === "23505") return { error: "Questo identificativo è già in uso. Scegline un altro." };
  if (error?.code === "23503") return { error: "Il template non è disponibile per il settore scelto." };
  if (error || typeof data !== "string") return { error: "Impossibile creare la bozza. Riprova." };

  revalidatePath("/cliente");
  return { siteId: data };
}
