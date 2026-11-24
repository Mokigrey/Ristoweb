import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegistrationForm from "./registration-form";

export default async function RegistratiPage({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/cliente");

  const { esito } = await searchParams;
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900">Crea un account Selfweb</h1>
        <p className="mb-6 mt-2 text-gray-600">Conferma il tuo indirizzo email per iniziare a creare la vetrina.</p>
        {esito === "link-non-valido" && (
          <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Impossibile confermare l’account. Apri il link più recente nello stesso browser usato per registrarti oppure riprova.
          </p>
        )}
        <RegistrationForm />
        <p className="mt-6 text-sm text-gray-600">
          Hai già un account? <Link href="/login" className="font-medium text-emerald-800 hover:underline">Accedi</Link>
        </p>
      </div>
    </main>
  );
}
