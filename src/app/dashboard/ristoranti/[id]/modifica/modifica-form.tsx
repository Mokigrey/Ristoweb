
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateRestaurant } from "./actions";
import SectorTemplateFields from "../../sector-template-fields";
import type { CatalogEntry } from "../../site-catalog";

type Ristorante = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  plan_type: string;
  template_key: string;
};

export default function ModificaForm({
  ristorante,
  catalog,
}: {
  ristorante: Ristorante;
  catalog: CatalogEntry[];
}) {
  const router = useRouter();

  const [name, setName] = useState(ristorante.name);
  const [slug, setSlug] = useState(ristorante.slug);


  const [planType, setPlanType] = useState(
    ristorante.plan_type
  );


  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateRestaurant(
          ristorante.id,
          formData
        );

        if (!result.success) {
          setIsError(true);
          setMessage(result.message);
          return;
        }

        setMessage(result.message);

        router.push(
          `/dashboard/ristoranti/${ristorante.id}`
        );
        router.refresh();
      } catch (error) {
        console.error("Errore salvataggio:", error);
        setIsError(true);
        setMessage(
          "Si è verificato un errore durante il salvataggio."
        );
      }
    });
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/dashboard/ristoranti/${ristorante.id}`}
          className="text-emerald-700 hover:underline"
        >
          ← Torna alla scheda attività
        </Link>

        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Modifica attività
          </h1>

          <p className="mt-2 text-gray-600">
            Aggiorna le informazioni di {ristorante.name}.
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
              name="name"
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
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
              name="slug"
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border p-3 text-gray-900"
            />

            <p className="mt-2 text-sm text-gray-500">
              Attenzione: modificare lo slug potrebbe cambiare
              l'indirizzo del sito dell’attività.
            </p>
          </div>

          <SectorTemplateFields
            catalog={catalog}
            initialSector={ristorante.business_type}
            initialTemplate={ristorante.template_key}
            disabled={isPending}
          />

          <div>
            <label
              htmlFor="planType"
              className="mb-2 block font-medium text-gray-800"
            >
              Piano commerciale
            </label>

            <select
              id="planType"
              name="plan_type"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              disabled={isPending}
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



          {message && (
            <div
              role="status"
              className={`rounded-lg p-4 text-sm ${
                isError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t pt-6">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Salvataggio in corso..."
                : "Salva modifiche"}
            </button>

            <Link
              href={`/dashboard/ristoranti/${ristorante.id}`}
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
