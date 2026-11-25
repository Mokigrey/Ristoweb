
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMenuCategory } from "./actions";

type CategoriaFormProps = {
  tenantId: string;
};

export default function CategoriaForm({
  tenantId,
}: CategoriaFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function salvaCategoria(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await createMenuCategory(
          tenantId,
          formData
        );

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          formRef.current?.reset();
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Errore durante la creazione della categoria:",
          error
        );

        setMessage(
          "Errore imprevisto durante il salvataggio."
        );
        setSuccess(false);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={salvaCategoria}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="category-name"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Nome categoria *
        </label>

        <input
          id="category-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={150}
          placeholder="Es. Pizze classiche"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="category-description"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Descrizione
        </label>

        <textarea
          id="category-description"
          name="description"
          rows={3}
          maxLength={1000}
          placeholder="Es. Le nostre pizze tradizionali"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="category-order"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Ordine di visualizzazione
        </label>

        <input
          id="category-order"
          name="sort_order"
          type="number"
          min={0}
          max={100000}
          step={1}
          defaultValue={0}
          required
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-600 focus:outline-none"
        />

        <p className="mt-1 text-xs text-gray-500">
          Le categorie con numero più basso saranno
          visualizzate per prime.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          name="is_visible"
          defaultChecked
          className="h-4 w-4 accent-emerald-700"
        />
        Categoria visibile nel menu
      </label>

      <div className="border-t pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Salvataggio..."
            : "Aggiungi categoria"}
        </button>

        {message && (
          <div
            role="status"
            className={`mt-4 rounded-lg p-4 text-sm ${
              success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </form>
  );
}
