import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";

export default async function CheckoutResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = await createClient();
  const access = await getSiteAccess(database, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();
  const { data, error } = await database.from("tenants").select("is_published, subscription_status").eq("id", id).maybeSingle();
  if (error) throw new Error("Impossibile controllare lo stato della vetrina.");
  if (!data) notFound();
  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  const activated = data.is_published && data.subscription_status === "active";
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-medium text-emerald-800">Checkout Stripe di prova</p>
        <h1 className="text-3xl font-bold text-gray-900">{activated ? "Vetrina attiva" : "In attesa di conferma"}</h1>
        <p className="text-gray-700">
          {activated ? "La vetrina è pubblicata nell’ambiente di test." : "La vetrina sarà attivata quando Selfweb riceverà e verificherà la conferma di Stripe."}
        </p>
        <div className="flex flex-wrap gap-4">
          {!activated && (
            <form method="get">
              <button type="submit" className="rounded-lg border border-emerald-800 px-4 py-2 font-medium text-emerald-900">Aggiorna stato</button>
            </form>
          )}
          <Link href={sitePath} className="rounded-lg bg-emerald-800 px-4 py-2 font-medium text-white">Torna alla vetrina</Link>
        </div>
      </div>
    </main>
  );
}
