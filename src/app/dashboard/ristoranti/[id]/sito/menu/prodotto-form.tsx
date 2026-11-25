
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMenuItem } from "./actions";

type Categoria = {
  id: string;
  name: string;
};

type Props = {
  tenantId: string;
  categorie: Categoria[];
};

export default function ProdottoForm({
  tenantId,
  categorie,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await createMenuItem(
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
          "Errore creazione prodotto:",
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
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* NOME PRODOTTO */}
      <div>
        <label
          htmlFor="product-name"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Nome prodotto *
        </label>

        <input
          id="product-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={150}
          placeholder="Es. Pizza Margherita"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />
      </div>

      {/* CATEGORIA */}
      <div>
        <label
          htmlFor="product-category"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Categoria *
        </label>

        <select
          id="product-category"
          name="category_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        >
          <option value="" disabled>
            Seleziona una categoria
          </option>

          {categorie.map((categoria) => (
            <option
              key={categoria.id}
              value={categoria.id}
            >
              {categoria.name}
            </option>
          ))}
        </select>
      </div>

      {/* DESCRIZIONE */}
      <div>
        <label
          htmlFor="product-description"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Descrizione
        </label>

        <textarea
          id="product-description"
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Es. Pomodoro, mozzarella e basilico"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />
      </div>

      {/* PREZZO */}
      <div>
        <label
          htmlFor="product-price"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Prezzo (€) *
        </label>

        <input
          id="product-price"
          name="price"
          type="number"
          min="0"
          max="999999.99"
          step="0.01"
          required
          placeholder="Es. 7.50"
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />
      </div>

      {/* ORDINE */}
      <div>
        <label
          htmlFor="product-order"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Ordine di visualizzazione
        </label>

        <input
          id="product-order"
          name="sort_order"
          type="number"
          min={0}
          max={100000}
          step={1}
          required
          defaultValue={0}
          className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
        />
      </div>

      {/* DISPONIBILITÀ */}
      <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          name="is_available"
          defaultChecked
          className="h-4 w-4 accent-emerald-700"
        />
        Prodotto disponibile
      </label>

      {/* PULSANTE SALVATAGGIO */}
      <button
        type="submit"
        disabled={isPending || categorie.length === 0}
        className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Salvataggio..."
          : "Aggiungi prodotto"}
      </button>

      {categorie.length === 0 && (
        <p className="text-sm text-amber-700">
          Per aggiungere un prodotto devi prima
          creare almeno una categoria.
        </p>
      )}

      {/* MESSAGGIO RISULTATO */}
      {message && (
        <div
          role="status"
          className={`rounded-lg p-4 text-sm ${
            success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
