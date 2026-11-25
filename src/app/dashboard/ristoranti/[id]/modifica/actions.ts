
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type UpdateResult = {
  success: boolean;
  message: string;
};

export async function updateRestaurant(
  restaurantId: string,
  formData: FormData
): Promise<UpdateResult> {
  const supabase = await createClient();

  // 1. Verifica autenticazione
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

  // 2. Verifica ruolo amministratore
  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (adminError || !admin) {
    return {
      success: false,
      message: "Non sei autorizzato a modificare le attività.",
    };
  }

  // 3. Legge i valori del modulo
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  const businessType = String(
    formData.get("business_type") ?? ""
  );

  const planType = String(
    formData.get("plan_type") ?? ""
  );

  const templateKey = String(
    formData.get("template_key") ?? ""
  );

  // 4. Validazione
  if (name.length < 2 || name.length > 150) {
    return {
      success: false,
      message: "Il nome deve contenere da 2 a 150 caratteri.",
    };
  }

  if (
    slug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return {
      success: false,
      message: "Lo slug non è valido.",
    };
  }

  if (!businessType.trim()) {
    return {
      success: false,
      message: "Tipologia attività non valida.",
    };
  }

  if (!["subscription", "license"].includes(planType)) {
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

  // 5. Aggiornamento su Supabase
  const { data, error } = await supabase
    .from("tenants")
    .update({
      name,
      slug,
      business_type: businessType,
      plan_type: planType,
      template_key: templateKey,
    })
    .eq("id", restaurantId)
    .select("id")
    .single();

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

    console.error("Errore aggiornamento ristorante:", error);

    return {
      success: false,
      message: "Impossibile salvare le modifiche.",
    };
  }

  if (!data) {
    return {
      success: false,
      message: "Ristorante non trovato.",
    };
  }

  // 6. Aggiorna le pagine
  revalidatePath("/dashboard/ristoranti");
  revalidatePath(`/dashboard/ristoranti/${restaurantId}`);
  revalidatePath(`/dashboard/ristoranti/${restaurantId}/modifica`);

  return {
    success: true,
    message: "Ristorante aggiornato correttamente!",
  };
}
