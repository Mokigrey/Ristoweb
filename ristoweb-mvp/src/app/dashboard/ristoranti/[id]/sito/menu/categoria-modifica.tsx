
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMenuCategory,
  deleteMenuCategory,
} from "./actions";

type Categoria = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
};

type Props = {
  tenantId: string;
  categoria: Categoria;
};

export default function CategoriaModifica({
  tenantId,
  categoria,
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
        const result = await updateMenuCategory(
          tenantId,
          categoria.id,
          formData
        );

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Errore modifica categoria:",
          error
        );

        setMessage(
          "Errore imprevisto durante il salvataggio."
        );
        setSuccess(false);
      }
    });
  }

  function eliminaCategoria() {
    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await deleteMenuCategory(
          tenantId,
          categoria.id
        );

        if (result.success) {
          setConfermaEliminazione(false);
          setAperto(false);
        }

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Errore eliminazione categoria:",
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
            Stai per eliminare la categoria{" "}
            <strong>{categoria.name}</strong>.
          </p>

          <p className="mt-2 text-sm text-red-800">
            Questa operazione non può essere annullata.
            Se la categoria contiene prodotti,
            l'eliminazione verrà bloccata.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={eliminaCategoria}
              className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {isPending
                ? "Eliminazione..."
                : "Sì, elimina categoria"}
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
              htmlFor={`name-${categoria.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Nome categoria *
            </label>

            <input
              id={`name-${categoria.id}`}
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              defaultValue={categoria.name}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`description-${categoria.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Descrizione
            </label>

            <textarea
              id={`description-${categoria.id}`}
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={categoria.description ?? ""}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor={`order-${categoria.id}`}
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Ordine di visualizzazione
            </label>

            <input
              id={`order-${categoria.id}`}
              name="sort_order"
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              defaultValue={categoria.sort_order ?? 0}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900"
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={categoria.is_visible ?? false}
              className="h-4 w-4 accent-emerald-700"
            />
            Categoria visibile nel menu
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

      {/* MESSAGGIO OPERAZIONE */}
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
