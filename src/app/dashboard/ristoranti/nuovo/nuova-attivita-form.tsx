
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRestaurant } from "./actions";
import SectorTemplateFields from "../sector-template-fields";
import type { CatalogEntry } from "../site-catalog";

export default function NuovaAttivitaForm({ catalog }: { catalog: CatalogEntry[] }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [planType, setPlanType] = useState("subscription");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function generaSlug(valore: string) {
    return valore
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading || success) return;

    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("plan_type", planType);

    try {
      const result = await createRestaurant(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(true);
      router.replace("/dashboard/ristoranti");
      router.refresh();
    } catch (err) {
  console.error("Errore chiamata Server Action:", err);

  setError(
    "Errore durante la comunicazione con il server. Controlla la console del browser."
  );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/ristoranti"
          className="text-emerald-700 hover:underline"
        >
          ← Torna ai ristoranti
        </Link>

        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Nuova attività
          </h1>
          <p className="mt-2 text-gray-600">
            Registra una nuova attività sulla piattaforma Selfweb.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl bg-white p-6 shadow md:p-8"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block font-medium text-gray-800"
            >
              Nome attività *
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => {
                const valore = e.target.value;
                setName(valore);
                setSlug(generaSlug(valore));
              }}
              placeholder="Es. Pizzeria Da Mario"
              className="w-full rounded-lg border p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="mb-2 block font-medium text-gray-800"
            >
              Identificativo web (slug) *
            </label>
            <input
              id="slug"
              type="text"
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(generaSlug(e.target.value))}
              placeholder="pizzeria-da-mario"
              className="w-full rounded-lg border p-3 text-gray-900"
            />
            <p className="mt-2 text-sm text-gray-500">
              Identificativo univoco utilizzato per riconoscere
              il sito dell’attività.
            </p>
          </div>

          <SectorTemplateFields catalog={catalog} disabled={loading || success} />

          <div>
            <label
              htmlFor="planType"
              className="mb-2 block font-medium text-gray-800"
            >
              Piano commerciale
            </label>
            <select
              id="planType"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="w-full rounded-lg border p-3 text-gray-900"
            >
              <option value="subscription">
                Abbonamento mensile
              </option>
              <option value="license">
                Licenza autonoma
              </option>
            </select>
          </div>



          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg bg-green-50 p-4 text-green-700"
            >
              Attivit? creata correttamente! Reindirizzamento...
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t pt-6">
            <button
              type="submit"
              disabled={loading || success}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Salvataggio..." : "Salva attività"}
            </button>

            <Link
              href="/dashboard/ristoranti"
              className="rounded-lg border px-6 py-3 font-medium text-gray-700"
            >
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
