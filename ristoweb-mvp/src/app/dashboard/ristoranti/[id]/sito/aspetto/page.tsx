import { getSiteAccess } from "@/lib/supabase/site-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppearanceForm from "./appearance-form";
import { defaultAppearance } from "./appearance";

export default async function AspettoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, settings] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", id).maybeSingle(),
    supabase.from("site_settings")
      .select("color_palette, show_about, show_gallery, show_opening_hours").eq("tenant_id", id).maybeSingle(),
  ]);
  if (tenant.error || settings.error) throw new Error("Impossibile caricare l’aspetto del sito.");
  if (!tenant.data) notFound();

  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={sitePath} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <div className="my-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Aspetto della vetrina</h1>
            <p className="mt-1 text-gray-600">{tenant.data.name}</p>
          </div>
          <Link href={`${sitePath}/anteprima`} className="font-medium text-emerald-800 hover:underline">
            Apri anteprima
          </Link>
        </div>
        <AppearanceForm tenantId={id} initial={settings.data ?? defaultAppearance} />
      </div>
    </main>
  );
}
