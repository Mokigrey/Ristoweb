
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMenuItem,
  deleteMenuItem,
} from "./actions";

type Categoria = {
  id: string;
  name: string;
};

type Prodotto = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  price: number | null;
  sort_order: number;
  is_available: boolean;
};

type Props = {
  tenantId: string;
  prodotto: Prodotto;
  categorie: Categoria[];
};

export default function ProdottoModifica({
  tenantId,
  prodotto,
  categorie,
}: Props) {
  const router = useRouter();

  const [aperto, setAperto] = useState(false);
  const [confermaEliminazione, setConfermaEliminazione] =
    useState(false);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function salvaModifiche(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await updateMenuItem(
          tenantId,
          prodotto.id,
          formData
        );

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          setAperto(false);
          router.refresh();
        }
      } catch (error) {
        console.error("Errore modifica prodotto:", error);

        setMessage(
          "Errore imprevisto durante il salvataggio."
        );
        setSuccess(false);
      }
    });
  }

  function eliminaProdotto() {
    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await deleteMenuItem(
          tenantId,
          prodotto.id
        );

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          setConfermaEliminazione(false);
          setAperto(false);
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Errore eliminazione prodotto:",
          error
        );

        setMessage(
          "Errore imprevisto durante l'eliminazione."
        );
        setSuccess(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* PULSANTI PRINCIPALI */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setAperto(!aperto);
            setConfermaEliminazione(false);
            setMessage("");
          }}
          className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {aperto ? "Annulla modifica" : "Modifica"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setConfermaEliminazione(
              !confermaEliminazione
            );
            setAperto(false);
            setMessage("");
          }}
          className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Elimina
        </button>
      </div>

      {/* CONFERMA ELIMINAZIONE */}
      {confermaEliminazione && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h4 className="font-semibold text-red-900">
            Confermi l'eliminazione?
          </h4>

          <p className="mt-2 text-sm text-red-800">
            Stai per eliminare il prodotto{" "}
            <strong>{prodotto.name}</strong>.
          </p>

          <p className="mt-2 text-sm text-red-800">
            L'eliminazione è definitiva e non può
            essere annullata.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={eliminaProdotto}
              className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isPending
                ? "Eliminazione..."
                : "Sì, elimina prodotto"}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                setConfermaEliminazione(false)
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* MODULO MODIFICA */}
      {aperto && (
        <form
          onSubmit={salvaModifiche}
          className="space-y-4 rounded-lg bg-gray-50 p-5"
        >
          <div>
            <label
              htmlFor={`item-name-${prodotto.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Nome prodotto *
            </label>

            <input
              id={`item-name-${prodotto.id}`}
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              defaultValue={prodotto.name}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`item-category-${prodotto.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Categoria *
            </label>

            <select
              id={`item-category-${prodotto.id}`}
              name="category_id"
              required
              defaultValue={prodotto.category_id}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            >
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

          <div>
            <label
              htmlFor={`item-description-${prodotto.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Descrizione
            </label>

            <textarea
              id={`item-description-${prodotto.id}`}
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={prodotto.description ?? ""}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`item-price-${prodotto.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Prezzo (€) *
            </label>

            <input
              id={`item-price-${prodotto.id}`}
              name="price"
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              required
              defaultValue={prodotto.price ?? ""}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`item-order-${prodotto.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Ordine di visualizzazione
            </label>

            <input
              id={`item-order-${prodotto.id}`}
              name="sort_order"
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              defaultValue={prodotto.sort_order}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              name="is_available"
              defaultChecked={prodotto.is_available}
              className="h-4 w-4 accent-emerald-700"
            />
            Prodotto disponibile
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {isPending
              ? "Salvataggio..."
              : "Salva modifiche"}
          </button>
        </form>
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
    </div>
  );
}
