"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { maxImageBytes, mediaBucket, type MediaKind } from "./media";

type UploadResult = { success: boolean; message: string };
const galleryCommands = new Set(["up", "down", "archive", "restore"]);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function refreshImages(tenantId: string) {
  const sitePath = `/dashboard/ristoranti/${tenantId}/sito`;
  revalidatePath(`${sitePath}/immagini`);
  revalidatePath(`${sitePath}/anteprima`);
}

export async function manageGalleryImage(
  tenantId: string,
  value: FormDataEntryValue | null,
): Promise<UploadResult> {
  const [imageId, command, extra] = typeof value === "string" ? value.split(":") : [];
  if (!uuid.test(tenantId) || !uuid.test(imageId ?? "") || !galleryCommands.has(command ?? "") || extra !== undefined) {
    return { success: false, message: "Operazione non valida." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("selfweb_manage_gallery_image", {
    p_tenant_id: tenantId,
    p_image_id: imageId,
    p_command: command,
  });
  if (error || data !== true) {
    return { success: false, message: "Impossibile aggiornare la galleria. Ricarica la pagina e riprova." };
  }

  refreshImages(tenantId);
  const message = command === "archive" ? "Foto rimossa dalla vetrina."
    : command === "restore" ? "Foto ripristinata."
    : "Ordine aggiornato.";
  return { success: true, message };
}

async function imageFormat(file: File) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { extension: "jpg", mime: "image/jpeg" };
  }
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte)) {
    return { extension: "png", mime: "image/png" };
  }
  const ascii = new TextDecoder().decode(header);
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") {
    return { extension: "webp", mime: "image/webp" };
  }
  return null;
}

export async function uploadSiteImage(
  tenantId: string,
  kind: MediaKind,
  formData: FormData,
): Promise<UploadResult> {
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, tenantId);
  if (access === "signed-out") return { success: false, message: "Accedi di nuovo per caricare un’immagine." };
  if (access === "denied") return { success: false, message: "Non hai il permesso di caricare immagini." };
  if (kind !== "logo" && kind !== "hero" && kind !== "gallery") {
    return { success: false, message: "Tipo di immagine non valido." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > maxImageBytes) {
    return { success: false, message: "Scegli un’immagine da massimo 5 MB." };
  }
  const format = await imageFormat(file);
  if (!format || (file.type && file.type !== format.mime)) {
    return { success: false, message: "Scegli un file JPEG, PNG o WebP valido." };
  }
  const alt = formData.get("alt");
  if (kind === "gallery" && (typeof alt !== "string" || !alt.trim() || alt.trim().length > 200)) {
    return { success: false, message: "Inserisci una descrizione dell’immagine da 1 a 200 caratteri." };
  }
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantError || !tenant) return { success: false, message: "Attività non trovata." };

  const path = `${tenant.id}/${kind}/${randomUUID()}.${format.extension}`;
  const { error: uploadError } = await supabase.storage.from(mediaBucket).upload(path, file, {
    contentType: format.mime,
    upsert: false,
  });
  if (uploadError) return { success: false, message: "Impossibile caricare l’immagine." };

  if (kind === "gallery") {
    const { error } = await supabase.from("gallery_images").insert({
      tenant_id: tenant.id,
      image_path: path,
      alt_text: typeof alt === "string" ? alt.trim() : "",
      sort_order: 2147483647,
    });
    if (error) return { success: false, message: "Impossibile aggiungere l’immagine alla galleria." };
  } else {
    const { error: settingsError } = await supabase.from("site_settings").upsert(
      { tenant_id: tenant.id, public_name: tenant.name },
      { onConflict: "tenant_id", ignoreDuplicates: true },
    );
    const field = kind === "logo" ? "logo_path" : "hero_image_path";
    if (settingsError) return { success: false, message: "Impossibile salvare le impostazioni del sito." };
    const { error } = await supabase.from("site_settings")
      .update({ [field]: path, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenant.id)
      .select("tenant_id")
      .single();
    if (error) return { success: false, message: "Impossibile associare l’immagine al sito." };
  }

  refreshImages(tenant.id);
  return { success: true, message: "Immagine salvata." };
}
