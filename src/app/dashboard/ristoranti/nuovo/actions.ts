
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateRestaurantResult = {
  success: boolean;
  message: string;
};

export async function createRestaurant(
  formData: FormData
): Promise<CreateRestaurantResult> {
  const supabase = await createClient();

  // Verifica l'identità sul server
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Sessione scaduta. Effettua nuovamente il login.",
    };
  }

  // Verifica il ruolo amministrativo
  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (adminError || !admin) {
    return {
      success: false,
      message: "Non sei autorizzato a creare attività.",
    };
  }

  // Legge e normalizza i dati del modulo
  const name = formData.get("name");
  const slug = formData.get("slug");
  const businessType = formData.get("business_type");
  const planType = formData.get("plan_type");
  const templateKey = formData.get("template_key");

  if (
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof businessType !== "string" ||
    typeof planType !== "string" ||
    typeof templateKey !== "string"
  ) {
    return {
      success: false,
      message: "Dati del modulo non validi.",
    };
  }

  const cleanName = name.trim();
  const cleanSlug = slug.trim().toLowerCase();

  // Validazione lato server
  if (cleanName.length < 2 || cleanName.length > 150) {
    return {
      success: false,
      message: "Il nome deve contenere da 2 a 150 caratteri.",
    };
  }

  if (
    cleanSlug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)
  ) {
    return {
      success: false,
      message: "Identificativo web non valido.",
    };
  }

  const validPlans = ["subscription", "license"];

  if (!businessType.trim()) {
    return {
      success: false,
      message: "Tipologia attività non valida.",
    };
  }

  if (!validPlans.includes(planType)) {
    return {
      success: false,
      message: "Piano commerciale non valido.",
    };
  }

  if (!templateKey.trim()) {
    return {
      success: false,
      message: "Template grafico non valido.",
    };
  }

  // Inserisce il nuovo ristorante.
  // Il sito resta non pubblicato.
  const { error } = await supabase.from("tenants").insert({
    name: cleanName,
    slug: cleanSlug,
    business_type: businessType,
    plan_type: planType,
    template_key: templateKey,
    is_published: false,
  });

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        message: "Il template non è disponibile per il settore selezionato.",
      };
    }

    if (error.code === "23505") {
      return {
        success: false,
        message: "Questo identificativo web è già utilizzato.",
      };
    }

    console.error("Errore creazione ristorante:", error);

    return {
      success: false,
      message: "Impossibile salvare il ristorante. Riprova.",
    };
  }

  revalidatePath("/dashboard/ristoranti");

  return {
    success: true,
    message: "Attivit? creata correttamente!",
  };
}
