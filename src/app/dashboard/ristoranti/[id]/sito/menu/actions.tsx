
"use server";

import { revalidatePath } from "next/cache";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { digitalMenuModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  message: string;
};

async function checkMenuAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<ActionResult | null> {
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") {
    return { success: false, message: "Sessione scaduta. Effettua nuovamente il login." };
  }
  if (access === "denied") {
    return { success: false, message: "Non sei autorizzato a modificare questo sito." };
  }
  try {
    if (!(await isSiteModuleEnabled(supabase, tenantId, digitalMenuModule))) {
      return { success: false, message: "Il modulo Menu digitale non è attivo." };
    }
  } catch {
    return { success: false, message: "Impossibile verificare il modulo Menu digitale." };
  }
  return null;
}

export async function createMenuCategory(
  tenantId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Recupera i dati del modulo
  function readField(name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  }

  const name = readField("name");
  const description = readField("description");
  const sortOrderValue = readField("sort_order");
  const isVisible = formData.get("is_visible") === "on";

  // 4. Validazione
  if (name.length < 2 || name.length > 150) {
    return {
      success: false,
      message:
        "Il nome della categoria deve contenere da 2 a 150 caratteri.",
    };
  }

  if (description.length > 1000) {
    return {
      success: false,
      message:
        "La descrizione non può superare 1000 caratteri.",
    };
  }

  const sortOrder = Number(sortOrderValue);

  if (
    sortOrderValue === "" ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100000
  ) {
    return {
      success: false,
      message:
        "L'ordine deve essere un numero intero tra 0 e 100000.",
    };
  }

  // 5. Verifica che il ristorante esista
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

  // 6. Inserimento della categoria
  const { error } = await supabase
    .from("menu_categories")
    .insert({
      tenant_id: tenantId,
      name,
      description,
      sort_order: sortOrder,
      is_visible: isVisible,
    });

  if (error) {
    console.error("Errore creazione categoria:", error);

    return {
      success: false,
      message: "Impossibile creare la categoria.",
    };
  }

  // 7. Aggiorna la pagina del menu
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message: "Categoria creata correttamente!",
  };
}

export async function updateMenuCategory(
  tenantId: string,
  categoryId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Legge i dati del modulo
  function readField(name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  }

  const name = readField("name");
  const description = readField("description");
  const sortOrderValue = readField("sort_order");
  const isVisible = formData.get("is_visible") === "on";

  // 4. Validazione dei dati
  if (name.length < 2 || name.length > 150) {
    return {
      success: false,
      message:
        "Il nome deve contenere da 2 a 150 caratteri.",
    };
  }

  if (description.length > 1000) {
    return {
      success: false,
      message:
        "La descrizione non può superare 1000 caratteri.",
    };
  }

  const sortOrder = Number(sortOrderValue);

  if (
    sortOrderValue === "" ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100000
  ) {
    return {
      success: false,
      message:
        "L'ordine deve essere un numero intero tra 0 e 100000.",
    };
  }

  // 5. Verifica che la categoria appartenga al ristorante
  const { data: category, error: categoryError } =
    await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (categoryError || !category) {
    return {
      success: false,
      message: "Categoria non trovata o non accessibile.",
    };
  }

  // 6. Aggiorna la categoria
  const { data, error } = await supabase
    .from("menu_categories")
    .update({
      name,
      description,
      sort_order: sortOrder,
      is_visible: isVisible,
    })
    .eq("id", categoryId)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Errore modifica categoria:", error);

    return {
      success: false,
      message: "Impossibile modificare la categoria.",
    };
  }

  if (!data) {
    return {
      success: false,
      message: "La categoria non è stata aggiornata.",
    };
  }

  // 7. Aggiorna la pagina
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message: "Categoria modificata correttamente!",
  };
}

export async function deleteMenuCategory(
  tenantId: string,
  categoryId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Verifica che la categoria appartenga al ristorante
  const { data: category, error: categoryError } =
    await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (categoryError || !category) {
    return {
      success: false,
      message:
        "Categoria non trovata o non accessibile.",
    };
  }

  // 4. Controlla se ci sono prodotti associati
  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("tenant_id", tenantId)
    .eq("category_id", categoryId);

  if (countError) {
    console.error(
      "Errore controllo prodotti associati:",
      countError
    );

    return {
      success: false,
      message:
        "Impossibile verificare i prodotti associati.",
    };
  }

  if (count === null) {
    return {
      success: false,
      message:
        "Impossibile verificare il numero di prodotti.",
    };
  }

  if (count > 0) {
    return {
      success: false,
      message:
        `Impossibile eliminare la categoria: ` +
        `contiene ${count} prodotti. ` +
        `Sposta o elimina prima i prodotti associati.`,
    };
  }

  // 5. Elimina soltanto la categoria selezionata
  const { data, error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "Errore eliminazione categoria:",
      error
    );

    return {
      success: false,
      message:
        "Impossibile eliminare la categoria.",
    };
  }

  if (!data) {
    return {
      success: false,
      message:
        "La categoria non è stata eliminata.",
    };
  }

  // 6. Aggiorna la pagina del menu
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message:
      "Categoria eliminata correttamente!",
  };
}

export async function createMenuItem(
  tenantId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Legge i dati del modulo
  const name = String(formData.get("name") ?? "").trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const categoryId = String(
    formData.get("category_id") ?? ""
  ).trim();
  const priceText = String(
    formData.get("price") ?? ""
  ).trim();
  const sortOrderText = String(
    formData.get("sort_order") ?? "0"
  ).trim();
  const isAvailable =
    formData.get("is_available") === "on";

  // 4. Validazione
  if (name.length < 2 || name.length > 150) {
    return {
      success: false,
      message: "Il nome deve contenere da 2 a 150 caratteri.",
    };
  }

  if (description.length > 2000) {
    return {
      success: false,
      message: "La descrizione è troppo lunga.",
    };
  }

  if (!categoryId) {
    return {
      success: false,
      message: "Seleziona una categoria.",
    };
  }

  // Il prezzo è obbligatorio nel modulo RistoWeb.
  const normalizedPrice = priceText.replace(",", ".");
  const price = Number(normalizedPrice);

  if (
    normalizedPrice === "" ||
    !/^\d+(\.\d{1,2})?$/.test(normalizedPrice) ||
    !Number.isFinite(price) ||
    price > 999999.99
  ) {
    return {
      success: false,
      message: "Inserisci un prezzo valido, con massimo due decimali.",
    };
  }

  const sortOrder = Number(sortOrderText);

  if (
    sortOrderText === "" ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100000
  ) {
    return {
      success: false,
      message: "L'ordine deve essere un numero intero tra 0 e 100000.",
    };
  }

  // 5. Verifica ristorante
  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .maybeSingle();

  if (tenantError || !tenant) {
    return {
      success: false,
      message: "Ristorante non trovato.",
    };
  }

  // 6. Verifica che la categoria appartenga al ristorante
  const { data: category, error: categoryError } =
    await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (categoryError || !category) {
    return {
      success: false,
      message: "Categoria non valida per questo ristorante.",
    };
  }

  // 7. Inserisce il prodotto
  const { error: insertError } = await supabase
    .from("menu_items")
    .insert({
      tenant_id: tenantId,
      category_id: categoryId,
      name,
      description: description || null,
      price,
      sort_order: sortOrder,
      is_available: isAvailable,
    });

  if (insertError) {
    console.error(
      "Errore inserimento prodotto:",
      insertError
    );

    return {
      success: false,
      message: "Impossibile salvare il prodotto.",
    };
  }


  // 8. Aggiorna la pagina
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message: "Prodotto aggiunto correttamente!",
  };
}

export async function updateMenuItem(
  tenantId: string,
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Legge i dati del modulo
  const name = String(formData.get("name") ?? "").trim();
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const categoryId = String(
    formData.get("category_id") ?? ""
  ).trim();
  const priceText = String(
    formData.get("price") ?? ""
  ).trim();
  const sortOrderText = String(
    formData.get("sort_order") ?? ""
  ).trim();
  const isAvailable =
    formData.get("is_available") === "on";

  // 4. Valida i dati
  if (name.length < 2 || name.length > 150) {
    return {
      success: false,
      message: "Il nome deve contenere da 2 a 150 caratteri.",
    };
  }

  if (description.length > 2000) {
    return {
      success: false,
      message: "La descrizione è troppo lunga.",
    };
  }

  if (!categoryId) {
    return {
      success: false,
      message: "Seleziona una categoria.",
    };
  }

  const normalizedPrice = priceText.replace(",", ".");
  const price = Number(normalizedPrice);

  if (
    normalizedPrice === "" ||
    !/^\d+(\.\d{1,2})?$/.test(normalizedPrice) ||
    !Number.isFinite(price) ||
    price > 999999.99
  ) {
    return {
      success: false,
      message: "Inserisci un prezzo valido, con massimo due decimali.",
    };
  }

  const sortOrder = Number(sortOrderText);

  if (
    sortOrderText === "" ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100000
  ) {
    return {
      success: false,
      message: "L'ordine deve essere un intero tra 0 e 100000.",
    };
  }

  // 5. Verifica che il prodotto appartenga al ristorante
  const { data: existingItem, error: itemError } =
    await supabase
      .from("menu_items")
      .select("id")
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (itemError || !existingItem) {
    return {
      success: false,
      message: "Prodotto non trovato o non accessibile.",
    };
  }

  // 6. Verifica che la categoria appartenga al ristorante
  const { data: category, error: categoryError } =
    await supabase
      .from("menu_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (categoryError || !category) {
    return {
      success: false,
      message: "Categoria non valida per questo ristorante.",
    };
  }

  // 7. Aggiorna il prodotto
  const { data: updatedItem, error: updateError } =
    await supabase
      .from("menu_items")
      .update({
        name,
        description: description || null,
        category_id: categoryId,
        price,
        sort_order: sortOrder,
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle();

  if (updateError) {
    console.error(
      "Errore aggiornamento prodotto:",
      updateError
    );

    return {
      success: false,
      message: "Impossibile aggiornare il prodotto.",
    };
  }

  if (!updatedItem) {
    return {
      success: false,
      message: "Il prodotto non è stato aggiornato.",
    };
  }
  

  // 8. Aggiorna la pagina del menu
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message: "Prodotto modificato correttamente!",
  };
}

export async function deleteMenuItem(
  tenantId: string,
  itemId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const accessError = await checkMenuAccess(supabase, tenantId);
  if (accessError) return accessError;

  // 3. Verifica che il prodotto appartenga al ristorante
  const { data: existingItem, error: itemError } =
    await supabase
      .from("menu_items")
      .select("id")
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

  if (itemError || !existingItem) {
    return {
      success: false,
      message: "Prodotto non trovato o non accessibile.",
    };
  }

  // 4. Elimina soltanto il prodotto selezionato
  const { data: deletedItem, error: deleteError } =
    await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle();

  if (deleteError) {
    console.error(
      "Errore eliminazione prodotto:",
      deleteError
    );

    return {
      success: false,
      message: "Impossibile eliminare il prodotto.",
    };
  }

  if (!deletedItem) {
    return {
      success: false,
      message: "Il prodotto non è stato eliminato.",
    };
  }

  // 5. Aggiorna la pagina del menu
  revalidatePath(`/dashboard/ristoranti/${tenantId}/sito/anteprima`);
  revalidatePath(
    `/dashboard/ristoranti/${tenantId}/sito/menu`
  );

  return {
    success: true,
    message: "Prodotto eliminato correttamente!",
  };
}
