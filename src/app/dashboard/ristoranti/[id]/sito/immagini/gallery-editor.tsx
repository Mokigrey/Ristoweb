"use client";

import { useActionState } from "react";
import { manageGalleryImage } from "./actions";
import type { GalleryImage } from "./media";

const buttonStyle = "rounded border px-2 py-1 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-40";

export default function GalleryEditor({ tenantId, images }: { tenantId: string; images: GalleryImage[] }) {
  const [result, manage, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, formData: FormData) => {
      try {
        return await manageGalleryImage(tenantId, formData.get("operation"));
      } catch {
        return { success: false, message: "Impossibile aggiornare la galleria. Riprova." };
      }
    },
    { success: true, message: "" },
  );
  const visible = images.filter((image) => image.isVisible);
  const archived = images.filter((image) => !image.isVisible);

  if (images.length === 0 && !result.message) return null;

  return (
    <form action={manage} className="mt-4 space-y-5" aria-busy={pending}>
      {visible.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Foto visibili in ordine">
          {visible.map((image, index) => {
            const label = image.alt || `Foto ${index + 1}`;
            return (
              <li key={image.id} className="rounded-lg border p-2">
                <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full rounded-md object-cover" loading="lazy" />
                <p className="my-2 break-words text-sm">{label}</p>
                <div className="flex flex-wrap gap-2">
                  <button name="operation" value={`${image.id}:up`} aria-label={`Sposta su: ${label}`} disabled={pending || index === 0} className={buttonStyle}>Sposta su</button>
                  <button name="operation" value={`${image.id}:down`} aria-label={`Sposta giù: ${label}`} disabled={pending || index === visible.length - 1} className={buttonStyle}>Sposta giù</button>
                  <button name="operation" value={`${image.id}:archive`} aria-label={`Rimuovi dalla vetrina: ${label}`} disabled={pending} className={buttonStyle}>Rimuovi</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {archived.length > 0 && (
        <section aria-labelledby="archived-photos">
          <h3 id="archived-photos" className="mb-3 text-sm font-semibold">Foto rimosse dalla vetrina</h3>
          <ul className="space-y-2">
            {archived.map((image, index) => {
              const label = image.alt || `Foto rimossa ${index + 1}`;
              return (
                <li key={image.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-2">
                  <img src={image.src} alt={image.alt} className="h-14 w-20 rounded object-cover" loading="lazy" />
                  <span className="min-w-0 grow break-words text-sm">{label}</span>
                  <button name="operation" value={`${image.id}:restore`} aria-label={`Ripristina: ${label}`} disabled={pending} className={buttonStyle}>Ripristina</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-emerald-800" : "text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
