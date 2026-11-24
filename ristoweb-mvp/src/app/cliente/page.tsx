import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sectorLabel } from "../dashboard/ristoranti/site-catalog";
import SignOutButton from "../dashboard/SignOutButton";

export default async function ClientePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .in("role", ["tenant_admin", "tenant_editor"]);
  if (membershipError) throw new Error("Impossibile caricare le attività associate.");

  const tenantIds = memberships.map((membership) => membership.tenant_id);
  const { data: sites, error: siteError } = tenantIds.length
    ? await supabase.from("tenants").select("id, name, business_type, is_published").in("id", tenantIds).order("name")
    : { data: [], error: null };
  if (siteError) throw new Error("Impossibile caricare i tuoi siti.");

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">I tuoi siti</h1>
          <SignOutButton />
        </header>
        {sites.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sites.map((site) => (
              <li key={site.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-xl font-semibold">{site.name}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {sectorLabel(site.business_type)} · {site.is_published ? "Pubblicato" : "Bozza"}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link href={`/dashboard/ristoranti/${site.id}/sito`} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
                    Gestisci vetrina
                  </Link>
                  <Link href={`/dashboard/ristoranti/${site.id}/sito/anteprima`} className="font-medium text-emerald-800 hover:underline">
                    Apri anteprima
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-white p-5">
            Il tuo account non è ancora associato a un sito. Contatta chi ti ha invitato per ottenere accesso.
          </p>
        )}
      </div>
    </main>
  );
}
