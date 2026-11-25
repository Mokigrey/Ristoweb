import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSiteCatalog } from "../../dashboard/ristoranti/load-site-catalog";
import DraftForm from "./draft-form";

export default async function NuovoSitoPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const catalog = await loadSiteCatalog(supabase);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/cliente" className="text-emerald-800 hover:underline">← I tuoi siti</Link>
        <header className="my-7">
          <h1 className="text-3xl font-bold text-gray-900">Crea la tua vetrina</h1>
          <p className="mt-2 text-gray-600">Scegli il layout e salva una bozza. Potrai poi completarla con foto, contatti e orari.</p>
        </header>
        <DraftForm catalog={catalog} />
      </div>
    </main>
  );
}
