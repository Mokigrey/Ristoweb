
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModificaForm from "./modifica-form";
import { loadSiteCatalog } from "../../load-site-catalog";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModificaRistorantePage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/accesso-negato");
  }

  const { data: ristorante, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, business_type, plan_type, template_key"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Impossibile caricare il ristorante.");
  }

  if (!ristorante) {
    notFound();
  }

  const catalog = await loadSiteCatalog(supabase);
  return <ModificaForm ristorante={ristorante} catalog={catalog} />;
}
