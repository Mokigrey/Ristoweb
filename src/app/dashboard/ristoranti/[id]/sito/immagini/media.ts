import type { createClient } from "@/lib/supabase/server";

export const mediaBucket = "selfweb-site-media";
export const maxImageBytes = 5 * 1024 * 1024;
export type MediaKind = "logo" | "hero" | "gallery";
export type GalleryImage = { id: string; src: string; alt: string; isVisible: boolean };

export type SiteImages = {
  logo: string | null;
  hero: string | null;
  gallery: GalleryImage[];
};

export async function loadSiteImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  settings: { logo_path: string | null; hero_image_path: string | null } | null,
  { visibleOnly = true, includeGallery = true }: { visibleOnly?: boolean; includeGallery?: boolean } = {},
): Promise<SiteImages> {
  let gallery: { id: string; image_path: string; alt_text: string | null; is_visible: boolean }[] = [];
  if (includeGallery) {
    let query = supabase
      .from("gallery_images")
      .select("id, image_path, alt_text, is_visible")
      .eq("tenant_id", tenantId)
      .order("sort_order")
      .order("created_at")
      .order("id");
    if (visibleOnly) query = query.eq("is_visible", true);
    const { data, error } = await query;
    if (error) throw new Error("Impossibile caricare la galleria.");
    gallery = data;
  }

  const paths = new Set<string>();
  for (const path of [settings?.logo_path, settings?.hero_image_path, ...gallery.map((image) => image.image_path)]) {
    if (path?.startsWith(`${tenantId}/`)) paths.add(path);
  }

  const urls = new Map<string, string>();
  if (paths.size) {
    const { data, error: storageError } = await supabase.storage
      .from(mediaBucket)
      .createSignedUrls([...paths], 300);
    if (storageError) throw new Error("Impossibile caricare le immagini.");
    for (const image of data) {
      if (image.path && image.signedUrl && !image.error) urls.set(image.path, image.signedUrl);
    }
  }

  return {
    logo: urls.get(settings?.logo_path ?? "") ?? null,
    hero: urls.get(settings?.hero_image_path ?? "") ?? null,
    gallery: gallery.flatMap(({ id, image_path, alt_text, is_visible }) => {
      const src = urls.get(image_path);
      return src ? [{ id, src, alt: alt_text ?? "", isVisible: is_visible }] : [];
    }),
  };
}
