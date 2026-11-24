import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSiteCatalog } from "../load-site-catalog";
import NuovaAttivitaForm from "./nuova-attivita-form";

export default async function NuovaAttivitaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (!admin) redirect("/accesso-negato");

  const catalog = await loadSiteCatalog(supabase);
  return <NuovaAttivitaForm catalog={catalog} />;
}
