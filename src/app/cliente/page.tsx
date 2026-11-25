import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sectorLabel } from "../dashboard/ristoranti/site-catalog";

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
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-selfweb-hero px-5 py-8 text-white sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">I tuoi siti</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/cliente/nuovo" className="rounded-lg bg-selfweb-accent px-4 py-2.5 font-semibold text-selfweb-ink hover:bg-teal-50">
              Crea una vetrina
            </Link>
          </div>
        </header>
        {sites.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sites.map((site) => (
              <li key={site.id} className="rounded-xl border border-selfweb-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="break-words text-xl font-semibold text-selfweb-ink">{site.name}</h2>
                    <p className="mt-1 text-sm text-gray-600">{sectorLabel(site.business_type)}</p>
                  </div>
                  <span className={site.is_published
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"
                    : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"}>
                    {site.is_published ? "Pubblicato" : "Bozza"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link href={`/dashboard/ristoranti/${site.id}/sito`} className="rounded-lg bg-selfweb-action px-4 py-2 font-medium text-white hover:bg-selfweb-hero">
                    Gestisci vetrina
                  </Link>
                  <Link href={`/dashboard/ristoranti/${site.id}/sito/anteprima`} className="font-medium text-selfweb-action hover:underline">
                    Apri anteprima
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-selfweb-border bg-white p-5">
            Qui troverai le tue vetrine. Crea la prima bozza per iniziare.
          </p>
        )}
      </div>
    </main>
  );
}
