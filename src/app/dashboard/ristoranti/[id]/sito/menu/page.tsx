import { getSiteAccess } from "@/lib/supabase/site-access";
import { digitalMenuModule, isSiteModuleEnabled } from "@/lib/supabase/site-modules";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import CategoriaForm from "./categoria-form";
import CategoriaModifica from "./categoria-modifica";
import ProdottoForm from "./prodotto-form";
import ProdottoModifica from "./prodotto-modifica";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MenuPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();
  if (!(await isSiteModuleEnabled(supabase, id, digitalMenuModule))) {
    redirect(`/dashboard/ristoranti/${id}/sito/moduli`);
  }

  // 3. Recupera il ristorante
  const { data: ristorante, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

  if (tenantError) {
    throw new Error(
      "Impossibile caricare il ristorante."
    );
  }

  if (!ristorante) {
    notFound();
  }

  // 4. Recupera le categorie del ristorante
  const { data: categorie, error: categorieError } =
    await supabase
      .from("menu_categories")
      .select(
        "id, name, description, sort_order, is_visible"
      )
      .eq("tenant_id", id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

  if (categorieError) {
    console.error(
      "Errore caricamento categorie:",
      categorieError
    );

    throw new Error(
      "Impossibile caricare le categorie."
    );
  }

  // 5. Recupera i prodotti del ristorante
  const { data: prodotti, error: prodottiError } =
    await supabase
      .from("menu_items")
      .select(
        "id, category_id, name, description, price, is_available, sort_order"
      )
      .eq("tenant_id", id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

  if (prodottiError) {
    console.error(
      "Errore caricamento prodotti:",
      prodottiError
    );

    throw new Error(
      "Impossibile caricare i prodotti."
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* COLLEGAMENTO INDIETRO */}
        <Link
          href={`/dashboard/ristoranti/${id}/sito`}
          className="text-emerald-700 hover:underline"
        >
          ← Torna alla gestione sito
        </Link>

        {/* INTESTAZIONE */}
        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Menu e prodotti
          </h1>

          <p className="mt-2 text-gray-600">
            {ristorante.name}
          </p>
        </div>

        {/* NUOVA CATEGORIA */}
        <section className="mb-6 rounded-xl bg-white p-6 shadow md:p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Nuova categoria
          </h2>

          <p className="mt-2 text-gray-600">
            Aggiungi una nuova categoria al menu
            del ristorante.
          </p>

          <div className="mt-6">
            <CategoriaForm tenantId={id} />
          </div>
        </section>

        {/* ELENCO CATEGORIE */}
        <section className="rounded-xl bg-white p-6 shadow md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Categorie del menu
            </h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {categorie.length} categorie
            </span>
          </div>

          <p className="mt-2 text-gray-600">
            Visualizza e modifica le categorie del menu.
          </p>

          <div className="mt-6 space-y-4">
            {categorie.length > 0 ? (
              categorie.map((categoria) => (
                <div
                  key={categoria.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoria.name}
                      </h3>

                      {categoria.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {categoria.description}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-gray-500">
                        Ordine di visualizzazione:{" "}
                        {categoria.sort_order ?? 0}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        categoria.is_visible
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {categoria.is_visible
                        ? "Visibile"
                        : "Nascosta"}
                    </span>
                  </div>

                  {/* MODIFICA CATEGORIA */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <CategoriaModifica
                      tenantId={id}
                      categoria={categoria}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-gray-50 p-5 text-gray-600">
                Nessuna categoria presente.
                Utilizza il modulo qui sopra
                per aggiungere la prima categoria.
              </div>
            )}
          </div>
        </section>


{/* NUOVO PRODOTTO */}
<section className="mt-6 rounded-xl bg-white p-6 shadow md:p-8">
  <h2 className="text-xl font-semibold text-gray-900">
    Nuovo prodotto
  </h2>

  <p className="mt-2 text-gray-600">
    Aggiungi un nuovo piatto, una pizza o una bevanda
    al menu del ristorante.
  </p>

  <div className="mt-6">
    <ProdottoForm
      tenantId={id}
      categorie={categorie.map((categoria) => ({
        id: categoria.id,
        name: categoria.name,
      }))}
    />
  </div>
</section>


        {/* ELENCO PRODOTTI */}
        <section className="mt-6 rounded-xl bg-white p-6 shadow md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Prodotti
            </h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {prodotti.length} prodotti
            </span>
          </div>

          <p className="mt-2 text-gray-600">
            Visualizza piatti, pizze, bevande e prezzi
            del ristorante.
          </p>

          <div className="mt-6 space-y-3">
            {prodotti.length > 0 ? (
              prodotti.map((prodotto) => (
                <div
                  key={prodotto.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {prodotto.name}
                    </h3>

                    {prodotto.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {prodotto.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      {prodotto.is_available
                        ? "Disponibile"
                        : "Non disponibile"}
                    </p>

                    {categorie.find(
                      (categoria) =>
                        categoria.id === prodotto.category_id
                    ) && (
                      <p className="mt-1 text-xs text-gray-500">
                        Categoria:{" "}
                        {
                          categorie.find(
                            (categoria) =>
                              categoria.id ===
                              prodotto.category_id
                          )?.name
                        }
                      </p>
                    )}
                  </div>

                  <span className="whitespace-nowrap text-lg font-semibold text-emerald-700">
                    {Number(prodotto.price).toLocaleString(
                      "it-IT",
                      {
                        style: "currency",
                        currency: "EUR",
                      }
                    )}
                  </span>

<div className="w-full border-t border-gray-200 pt-4">
  <ProdottoModifica
    tenantId={id}
    prodotto={{
      id: prodotto.id,
      name: prodotto.name,
      description: prodotto.description,
      category_id: prodotto.category_id,
      price: prodotto.price,
      sort_order: prodotto.sort_order ?? 0,
      is_available: prodotto.is_available ?? true,
    }}
    categorie={categorie.map((categoria) => ({
      id: categoria.id,
      name: categoria.name,
    }))}
  />
</div>

                </div>
              ))
            ) : (
              <div className="rounded-lg bg-gray-50 p-5 text-gray-600">
                Nessun prodotto presente.
                La gestione dei prodotti sarà
                aggiunta nei prossimi passaggi.
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
