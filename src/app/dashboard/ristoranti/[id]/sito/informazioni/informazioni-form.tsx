
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSiteInformation } from "./actions";

type Informazioni = {
  public_name: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
};

type Field = {
  key: keyof Informazioni;
  label: string;
  type?: string;
};

export default function InformazioniForm({
  tenantId,
  initialData,
}: {
  tenantId: string;
  initialData: Informazioni;
}) {
  const router = useRouter();

  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField(
    field: keyof Informazioni,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await saveSiteInformation(
          tenantId,
          formData
        );

        if (!result.success) {
          setIsError(true);
          setMessage(result.message);
          return;
        }

        setIsError(false);
        setMessage(result.message);

        // Aggiorna i dati visualizzati dal server
        router.refresh();
      } catch (error) {
        console.error(
          "Errore durante il salvataggio:",
          error
        );

        setIsError(true);
        setMessage(
          "Si è verificato un errore durante il salvataggio."
        );
      }
    });
  }

  const fields: Field[] = [
    {
      key: "public_name",
      label: "Nome pubblico *",
    },
    {
      key: "tagline",
      label: "Slogan",
    },
    {
      key: "phone",
      label: "Telefono",
      type: "tel",
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      type: "tel",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
    },
    {
      key: "address",
      label: "Indirizzo",
    },
    {
      key: "city",
      label: "Città",
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl bg-white p-6 shadow md:p-8"
    >
      {fields.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="mb-2 block font-medium text-gray-800"
          >
            {field.label}
          </label>

          <input
            id={field.key}
            name={field.key}
            type={field.type ?? "text"}
            required={field.key === "public_name"}
            minLength={
              field.key === "public_name" ? 2 : undefined
            }
            maxLength={
              field.key === "public_name" ? 150 : 255
            }
            value={form[field.key]}
            onChange={(event) =>
              updateField(field.key, event.target.value)
            }
            disabled={isPending}
            className="w-full rounded-lg border p-3 text-gray-900"
          />
        </div>
      ))}

      <div>
        <label
          htmlFor="description"
          className="mb-2 block font-medium text-gray-800"
        >
          Descrizione dell’attività
        </label>

        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={3000}
          value={form.description}
          onChange={(event) =>
            updateField(
              "description",
              event.target.value
            )
          }
          disabled={isPending}
          className="w-full rounded-lg border p-3 text-gray-900"
          placeholder="Racconta la storia del locale, la cucina e le specialità..."
        />
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg p-4 text-sm ${
            isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="border-t pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Salvataggio in corso..."
            : "Salva informazioni"}
        </button>

        <p className="mt-3 text-sm text-gray-500">
          Le informazioni salvate saranno utilizzate
          per il sito web dell’attività.
        </p>
      </div>
    </form>
  );
}
