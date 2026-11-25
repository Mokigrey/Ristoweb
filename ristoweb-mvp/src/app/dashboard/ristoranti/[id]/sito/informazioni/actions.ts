
"use server";

import { revalidatePath } from "next/cache";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { createClient } from "@/lib/supabase/server";

type SaveResult = {
  success: boolean;
  message: string;
};

export async function saveSiteInformation(
  tenantId: string,
  formData: FormData
): Promise<SaveResult> {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") {
    return { success: false, message: "Sessione scaduta. Effettua nuovamente il login." };
  }
  if (access === "denied") {
    return { success: false, message: "Non sei autorizzato a modificare questo sito." };
  }

  // 3. Legge e normalizza i dati
  function readField(name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  }

  const publicName = readField("public_name");
  const tagline = readField("tagline");
  const description = readField("description");
  const phone = readField("phone");
  const whatsapp = readField("whatsapp");
  const email = readField("email");
  const address = readField("address");
  const city = readField("city");

  // 4. Validazione
  if (publicName.length < 2 || publicName.length > 150) {
    return {
      success: false,
      message: "Il nome pubblico deve contenere da 2 a 150 caratteri.",
    };
  }

  if (
    tagline.length > 255 ||
    description.length > 3000 ||
    phone.length > 255 ||
    whatsapp.length > 255 ||
    email.length > 255 ||
    address.length > 255 ||
    city.length > 255
  ) {
    return {
      success: false,
      message: "Uno o più campi superano la lunghezza consentita.",
    };
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      success: false,
      message: "L'indirizzo email non è valido.",
    };
  }

  // 5. Verifica esistenza del ristorante
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return {
      success: false,
      message: "Ristorante non trovato o non accessibile.",
    };
  }

  // 6. Crea o aggiorna le impostazioni
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        tenant_id: tenantId,
        public_name: publicName,
        tagline,
        description,
        phone,
        whatsapp,
        email,
        address,
        city,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "tenant_id",
      }
    );

  if (error) {
    console.error("Errore salvataggio informazioni sito:", error);

    return {
      success: false,
      message: "Impossibile salvare le informazioni del sito.",
    };
  }

  // 7. Aggiorna le pagine
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito`);
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/informazioni`
  );

  return {
    success: true,
    message: "Informazioni del sito salvate correttamente!",
  };
}
