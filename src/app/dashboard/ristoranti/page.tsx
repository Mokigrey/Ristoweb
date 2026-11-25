
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RistorantiPage() {
  const supabase = await createClient();

  // Verifica l'utente autenticato
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verifica il ruolo di amministratore Selfweb
  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/accesso-negato");
  }

  // Recupera l'elenco dei ristoranti
  const { data: ristoranti, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, business_type, plan_type, subscription_status, template_key, is_published"
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Collegamento alla dashboard */}
        <Link
          href="/dashboard"
          className="text-emerald-700 hover:underline"
        >
          ← Torna alla dashboard
        </Link>

        {/* Intestazione e pulsante nuovo ristorante */}
        <div className="mt-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestione attività
            </h1>

            <p className="text-gray-600 mt-2">
              Elenco delle attività registrate su Selfweb
            </p>
          </div>

          <Link
            href="/dashboard/ristoranti/nuovo"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800"
          >
            + Nuova attività
          </Link>
        </div>

        {/* Elenco ristoranti */}
        {error ? (
          <div className="bg-white rounded-xl p-6 text-red-600">
            Impossibile caricare le attività.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-4">Attività</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Piano</th>
                  <th className="p-4">Abbonamento</th>
                  <th className="p-4">Sito</th>
                  <th className="p-4">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {ristoranti?.length ? (
                  ristoranti.map((ristorante) => (
                    <tr
                      key={ristorante.id}
                      className="border-t text-gray-800"
                    >
                      <td className="p-4 font-medium">
                        {ristorante.name}
                      </td>

                      <td className="p-4">
                        {ristorante.slug}
                      </td>

                      <td className="p-4">
                        {ristorante.plan_type}
                      </td>

                      <td className="p-4">
                        {ristorante.subscription_status}
                      </td>

                      <td className="p-4">
                        {ristorante.is_published
                          ? "Pubblicato"
                          : "Non pubblicato"}
                      </td>

<td className="p-4">
  <Link
    href={`/dashboard/ristoranti/${ristorante.id}`}
    className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
  >
    Gestisci
  </Link>
</td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-500"
                    >
                      Nessuna attività registrata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
