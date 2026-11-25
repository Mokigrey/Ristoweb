import { sectorLabel } from "../site-catalog";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DettaglioRistorantePage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // Verifica utente autenticato
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verifica amministratore piattaforma
  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/accesso-negato");
  }

  // Recupera il ristorante selezionato
  const { data: ristorante, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, business_type, plan_type, subscription_status, template_key, is_published, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Errore durante il caricamento del ristorante."
    );
  }

  if (!ristorante) {
    notFound();
  }


  const tipoPiano: Record<string, string> = {
    subscription: "Abbonamento mensile",
    license: "Licenza autonoma",
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/ristoranti"
          className="text-emerald-700 hover:underline"
        >
          ← Torna ai ristoranti
        </Link>

        
<div className="mb-8 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="text-3xl font-bold text-gray-900">
      {ristorante.name}
    </h1>

    <p className="mt-2 text-gray-600">
      Scheda di gestione dell’attività
    </p>
  </div>

 
<div className="flex flex-wrap gap-3">
  <Link
    href={`/dashboard/ristoranti/${ristorante.id}/modifica`}
    className="inline-flex items-center justify-center rounded-lg border border-emerald-700 px-5 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
  >
    Modifica attività
  </Link>

  <Link
    href={`/dashboard/ristoranti/${ristorante.id}/sito`}
    className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800"
  >
    Gestisci sito web
  </Link>
</div>

</div>


        <div className="rounded-xl bg-white p-6 shadow md:p-8">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">
            Informazioni generali
          </h2>

          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">
                Nome attività
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {ristorante.name}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Identificativo web
              </dt>
              <dd className="mt-1 text-gray-900">
                {ristorante.slug}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Tipologia attività
              </dt>
              <dd className="mt-1 text-gray-900">
                {sectorLabel(ristorante.business_type)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Piano commerciale
              </dt>
              <dd className="mt-1 text-gray-900">
                {tipoPiano[ristorante.plan_type] ??
                  ristorante.plan_type}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Stato abbonamento
              </dt>
              <dd className="mt-1 text-gray-900">
                {ristorante.subscription_status}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Template grafico
              </dt>
              <dd className="mt-1 text-gray-900 capitalize">
                {ristorante.template_key}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Stato pubblicazione
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {ristorante.is_published
                  ? "Pubblicato"
                  : "Non pubblicato"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Data registrazione
              </dt>
              <dd className="mt-1 text-gray-900">
                {new Date(
                  ristorante.created_at
                ).toLocaleDateString("it-IT", {
                  timeZone: "Europe/Rome",
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
