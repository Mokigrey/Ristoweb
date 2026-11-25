import { getSiteAccess } from "@/lib/supabase/site-access";
import { digitalMenuModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GestioneSitoPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  // Recupera il ristorante
  const { data: ristorante, error } = await supabase
    .from("tenants")
    .select("id, name, slug, business_type, template_key, is_published, plan_type, subscription_status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Impossibile caricare il ristorante.");
  }

  if (!ristorante) {
    notFound();
  }

  // Recupera le impostazioni del sito, se esistono
  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("public_name, tagline, description")
    .eq("tenant_id", id)
    .maybeSingle();

  if (settingsError) {
    throw new Error("Impossibile caricare le impostazioni del sito.");
  }

  const isPlatformAdmin = access === "platform";
  const mostraMenu = await isSiteModuleEnabled(supabase, id, digitalMenuModule);
  const isDraftPlan = !ristorante.is_published && ristorante.plan_type === "subscription" && ristorante.subscription_status === "trialing";

  const sezioni = [
    {
      titolo: "Informazioni e contatti",
      descrizione:
        "Nome pubblico, slogan, descrizione, indirizzo, telefono ed email.",
      percorso: `/dashboard/ristoranti/${id}/sito/informazioni`,
    },
    {
      titolo: "Menu e prodotti",
      descrizione:
        "Categorie, pizze, piatti, prezzi e descrizioni.",
      percorso: `/dashboard/ristoranti/${id}/sito/menu`,
      visibile: mostraMenu,
    },
    {
      titolo: "Immagini del sito",
      descrizione:
        "Logo, immagine principale e galleria fotografica.",
      percorso: `/dashboard/ristoranti/${id}/sito/immagini`,
    },
    {
      titolo: "Orari e social",
      descrizione:
        "Orari di apertura e collegamenti ai social network.",
      percorso: `/dashboard/ristoranti/${id}/sito/orari`,
    },
    {
      titolo: "Aspetto della vetrina",
      descrizione: "Scegli i colori e le sezioni da mostrare.",
      percorso: `/dashboard/ristoranti/${id}/sito/aspetto`,
    },
    {
      titolo: "Moduli della vetrina",
      descrizione: "Verifica i moduli disponibili e quelli attivi.",
      percorso: `/dashboard/ristoranti/${id}/sito/moduli`,
    },
    {
      titolo: "Configura il piano",
      descrizione: "Scegli i moduli da includere e consulta la stima del canone.",
      percorso: `/dashboard/ristoranti/${id}/sito/piano`,
      visibile: isDraftPlan,
    },
    {
      titolo: "Canone mensile",
      descrizione: "Consulta la stima della vetrina e dei moduli attivi.",
      percorso: `/dashboard/ristoranti/${id}/sito/canone`,
    },
  ].filter((sezione) => sezione.visibile !== false);

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={isPlatformAdmin ? `/dashboard/ristoranti/${id}` : "/cliente"}
          className="text-emerald-700 hover:underline"
        >
          ← {isPlatformAdmin ? "Torna alla scheda attività" : "Torna ai tuoi siti"}
        </Link>

        <div className="mt-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestisci sito web
          </h1>

          <p className="mt-2 text-gray-600">
            {ristorante.name}
          </p>
          <Link
            href={`/dashboard/ristoranti/${id}/sito/anteprima`}
            className="mt-5 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800"
          >
            Apri anteprima
          </Link>
        </div>

        <section className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900">
            Riepilogo del sito
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">
                Nome pubblico
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {settings?.public_name || "Non configurato"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Template grafico
              </dt>
              <dd className="mt-1 font-medium capitalize text-gray-900">
                {ristorante.template_key}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Stato del sito
              </dt>
              <dd className="mt-1 font-medium text-gray-900">
                {ristorante.is_published
                  ? "Pubblicato"
                  : "Non pubblicato"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-gray-500">
                Slogan
              </dt>
              <dd className="mt-1 text-gray-900">
                {settings?.tagline || "Non configurato"}
              </dd>
            </div>
          </dl>

          {!settings && (
            <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Le informazioni del sito non sono ancora state
              configurate. Potrai inserirle dalla sezione
              Informazioni e contatti.
            </p>
          )}
        </section>

        <h2 className="mb-5 text-xl font-semibold text-gray-900">
          Sezioni di gestione
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {sezioni.map((sezione) => (
            <div
              key={sezione.titolo}
              className="rounded-xl bg-white p-6 shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {sezione.titolo}
              </h3>

              <p className="mt-2 min-h-12 text-sm text-gray-600">
                {sezione.descrizione}
              </p>

              <Link
                href={sezione.percorso}
                className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Gestisci
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
