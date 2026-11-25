import { getSiteAccess } from "@/lib/supabase/site-access";
import OrariForm from "./orari-form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SocialForm from "./social-form";

type GiornoOrari = {
  closed: boolean;
  lunch_open: string;
  lunch_close: string;
  dinner_open: string;
  dinner_close: string;
};

type OrariIniziali = Record<
  string,
  Partial<GiornoOrari>
>;


type SocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  tripadvisor: string;
};

type SocialIniziali = Partial<SocialLinks>;


type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrariSocialPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  // 3. Recupera il ristorante
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

  // 4. Recupera gli orari e i social
  const { data: settings, error: settingsError } =
    await supabase
      .from("site_settings")
      .select("opening_hours, social_links")
      .eq("tenant_id", id)
      .maybeSingle();

  if (settingsError) {
    throw new Error(
      "Impossibile caricare gli orari e i social."
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/dashboard/ristoranti/${id}/sito`}
          className="text-emerald-700 hover:underline"
        >
          ← Torna alla gestione sito
        </Link>

        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Orari di apertura e social
          </h1>

          <p className="mt-2 text-gray-600">
            {ristorante.name}
          </p>
        </div>

        <section className="rounded-xl bg-white p-6 shadow md:p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Orari settimanali
          </h2>

          <p className="mt-2 text-gray-600">
            Configura gli orari di apertura per ogni giorno
            della settimana, con fasce pranzo e cena.
          </p>

          <div className="mt-6">
<OrariForm
  tenantId={id}
  initialHours={
    settings?.opening_hours &&
    typeof settings.opening_hours === "object" &&
    !Array.isArray(settings.opening_hours)
      ? (settings.opening_hours as OrariIniziali)
      : undefined
  }
/>
</div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow md:p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Social network
          </h2>

          <p className="mt-2 text-gray-600">
            Collega i profili Facebook, Instagram,
            TikTok, YouTube e Tripadvisor del ristorante.
          </p>

          <div className="mt-6">
  
<SocialForm
  tenantId={id}
  initialSocial={
    settings?.social_links &&
    typeof settings.social_links === "object" &&
    !Array.isArray(settings.social_links)
      ? (settings.social_links as SocialIniziali)
      : undefined
  }
/>

</div>
        </section>

        <p className="mt-6 text-sm text-gray-500">
          {settings
            ? "Configurazione del sito caricata da Supabase."
            : "Le impostazioni del sito non sono ancora presenti."}
        </p>
      </div>
    </main>
  );
}
