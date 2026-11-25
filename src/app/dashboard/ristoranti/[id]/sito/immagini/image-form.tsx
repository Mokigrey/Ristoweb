"use client";

import { useActionState } from "react";
import { uploadSiteImage } from "./actions";
import type { MediaKind } from "./media";

export default function ImageForm({ tenantId, kind }: { tenantId: string; kind: MediaKind }) {
  const [result, action, pending] = useActionState(
    async (_previous: { success: boolean; message: string }, data: FormData) => {
      try {
        return await uploadSiteImage(tenantId, kind, data);
      } catch {
        return { success: false, message: "Caricamento non riuscito. Verifica che il file non superi 5 MB." };
      }
    },
    { success: true, message: "" },
  );

  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label htmlFor={`image-${kind}`} className="mb-1 block text-sm font-medium">File immagine</label>
        <input
          id={`image-${kind}`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="w-full rounded-md border bg-white p-2 text-sm"
        />
      </div>
      {kind === "gallery" && (
        <div>
          <label htmlFor="gallery-alt" className="mb-1 block text-sm font-medium">Descrizione dell’immagine</label>
          <input id="gallery-alt" name="alt" type="text" required maxLength={200} className="w-full rounded-md border p-2" />
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Caricamento…" : "Carica immagine"}
      </button>
      {result.message && (
        <p role={result.success ? "status" : "alert"} className={result.success ? "text-emerald-800" : "text-red-800"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
