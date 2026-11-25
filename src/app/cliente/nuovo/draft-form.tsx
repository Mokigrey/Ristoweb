"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import SectorTemplateFields from "../../dashboard/ristoranti/sector-template-fields";
import type { CatalogEntry } from "../../dashboard/ristoranti/site-catalog";
import { createSiteDraft } from "./actions";

const inputStyle = "mt-2 w-full rounded-lg border p-3 font-normal text-gray-900";

function slugFromName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

export default function DraftForm({ catalog }: { catalog: CatalogEntry[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await createSiteDraft(fields);
      if (result.siteId) {
        router.replace(`/dashboard/ristoranti/${result.siteId}/sito`);
        return;
      }
      setError(result.error ?? "Impossibile creare la bozza.");
    } catch {
      setError("Impossibile creare la bozza. Controlla la connessione e riprova.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-8">
      <fieldset disabled={pending} className="space-y-5">
        <legend className="mb-3 text-lg font-semibold">Settore e template</legend>
        <SectorTemplateFields catalog={catalog} />
      </fieldset>
      <fieldset disabled={pending} className="space-y-4 border-t pt-3">
        <legend className="pr-3 text-lg font-semibold">Informazioni essenziali</legend>
        <label className="block font-medium">
          Nome attività
          <input
            name="name" required minLength={2} maxLength={150} className={inputStyle}
            onChange={(event) => {
              if (!slugEdited) setSlug(slugFromName(event.target.value));
            }}
          />
        </label>
        <label className="block font-medium">
          Identificativo del sito
          <input
            name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }}
            className={inputStyle}
          />
        </label>
        <label className="block font-medium">
          Città <span className="text-sm font-normal text-gray-500">(facoltativa)</span>
          <input name="city" maxLength={255} className={inputStyle} />
        </label>
        <label className="block font-medium">
          Descrizione <span className="text-sm font-normal text-gray-500">(facoltativa)</span>
          <textarea name="description" maxLength={4000} rows={3} className={inputStyle} />
        </label>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
        {pending ? "Creazione…" : "Crea la bozza"}
      </button>
    </form>
  );
}
