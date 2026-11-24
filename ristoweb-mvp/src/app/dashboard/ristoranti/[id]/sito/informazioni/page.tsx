import { getSiteAccess } from "@/lib/supabase/site-access";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InformazioniForm from "./informazioni-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InformazioniPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const { data: ristorante, error: tenantError } =
    await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

  if (tenantError) {
    throw new Error("Impossibile caricare il ristorante.");
  }

  if (!ristorante) {
    notFound();
  }

  const { data: settings, error: settingsError } =
    await supabase
      .from("site_settings")
      .select(
        "public_name, tagline, description, phone, whatsapp, email, address, city"
      )
      .eq("tenant_id", id)
      .maybeSingle();

  if (settingsError) {
    throw new Error("Impossibile caricare le informazioni.");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/dashboard/ristoranti/${id}/sito`}
          className="text-emerald-700 hover:underline"
        >
          ← Torna alla gestione sito
        </Link>

        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Informazioni e contatti
          </h1>

          <p className="mt-2 text-gray-600">
            {ristorante.name}
          </p>
        </div>

        <InformazioniForm
          tenantId={ristorante.id}
          initialData={{
            public_name:
              settings?.public_name ?? ristorante.name,
            tagline: settings?.tagline ?? "",
            description: settings?.description ?? "",
            phone: settings?.phone ?? "",
            whatsapp: settings?.whatsapp ?? "",
            email: settings?.email ?? "",
            address: settings?.address ?? "",
            city: settings?.city ?? "",
          }}
        />
      </div>
    </main>
  );
}
