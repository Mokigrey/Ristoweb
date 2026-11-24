
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOpeningHours } from "./actions";

type GiornoOrari = {
  closed: boolean;
  lunch_open: string;
  lunch_close: string;
  dinner_open: string;
  dinner_close: string;
};

export type OrariSettimanali = Record<string, GiornoOrari>;

const giorni = [
  { key: "lunedi", label: "Lunedì" },
  { key: "martedi", label: "Martedì" },
  { key: "mercoledi", label: "Mercoledì" },
  { key: "giovedi", label: "Giovedì" },
  { key: "venerdi", label: "Venerdì" },
  { key: "sabato", label: "Sabato" },
  { key: "domenica", label: "Domenica" },
];

const orarioVuoto: GiornoOrari = {
  closed: false,
  lunch_open: "",
  lunch_close: "",
  dinner_open: "",
  dinner_close: "",
};

export default function OrariForm({
  tenantId,
  initialHours,
}: {
  tenantId: string;
  initialHours?: Record<string, Partial<GiornoOrari>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [orari, setOrari] = useState<OrariSettimanali>(() => {
    const initial: OrariSettimanali = {};

    for (const giorno of giorni) {
      initial[giorno.key] = {
        ...orarioVuoto,
        ...(initialHours?.[giorno.key] ?? {}),
      };
    }

    return initial;
  });

  function aggiornaOrario(
    giorno: string,
    campo: keyof GiornoOrari,
    valore: string | boolean
  ) {
    setMessage("");

    setOrari((precedenti) => ({
      ...precedenti,
      [giorno]: {
        ...precedenti[giorno],
        [campo]: valore,
      },
    }));
  }

  function salvaOrari(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await saveOpeningHours(tenantId, orari);

        setMessage(result.message);
        setSuccess(result.success);

        if (result.success) {
          router.refresh();
        }
      } catch (error) {
        console.error("Errore durante il salvataggio:", error);
        setMessage("Errore imprevisto durante il salvataggio.");
        setSuccess(false);
      }
    });
  }

  return (
    <form onSubmit={salvaOrari} className="space-y-5">
      {giorni.map((giorno) => {
        const dati = orari[giorno.key];

        return (
          <div
            key={giorno.key}
            className="rounded-xl border border-gray-200 p-5"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {giorno.label}
              </h3>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={dati.closed}
                  onChange={(event) =>
                    aggiornaOrario(
                      giorno.key,
                      "closed",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-emerald-700"
                />
                Giorno di chiusura
              </label>
            </div>

            {dati.closed ? (
              <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
                Il ristorante è chiuso.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 font-medium text-gray-800">
                    Pranzo
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Apertura
                      </label>

                      <input
                        type="time"
                        value={dati.lunch_open}
                        onChange={(event) =>
                          aggiornaOrario(
                            giorno.key,
                            "lunch_open",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border p-3 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Chiusura
                      </label>

                      <input
                        type="time"
                        value={dati.lunch_close}
                        onChange={(event) =>
                          aggiornaOrario(
                            giorno.key,
                            "lunch_close",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border p-3 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 font-medium text-gray-800">
                    Cena
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Apertura
                      </label>

                      <input
                        type="time"
                        value={dati.dinner_open}
                        onChange={(event) =>
                          aggiornaOrario(
                            giorno.key,
                            "dinner_open",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border p-3 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Chiusura
                      </label>

                      <input
                        type="time"
                        value={dati.dinner_close}
                        onChange={(event) =>
                          aggiornaOrario(
                            giorno.key,
                            "dinner_close",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border p-3 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Salvataggio..." : "Salva orari"}
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
