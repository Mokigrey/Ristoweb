
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardOverview from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Verifica l'identità dell'utente con Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verifica il ruolo amministratore nel database
  const { data: member, error: roleError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (roleError) {
    console.error("Errore verifica ruolo:", roleError.message);
    redirect("/accesso-negato");
  }

  if (!member) {
    redirect("/cliente");
  }

  const [sites, published] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);
  if (sites.error || published.error) throw new Error("Impossibile caricare il riepilogo delle attività.");

  return <DashboardOverview sites={sites.count ?? 0} published={published.count ?? 0} />;
}
