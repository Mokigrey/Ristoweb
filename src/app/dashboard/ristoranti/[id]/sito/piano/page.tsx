import Link from "next/link";
import DraftPlanForm from "./draft-plan-form";
import { loadDraftPlan } from "./load-draft-plan";

export default async function PianoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant, sitePath, basePrice, modules, initialKeys, canEdit } = await loadDraftPlan(id);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={sitePath} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <header className="my-7">
          <h1 className="text-3xl font-bold text-gray-900">Configura il piano</h1>
          <p className="mt-1 text-gray-600">{tenant.name} · Bozza</p>
        </header>
        <DraftPlanForm
          tenantId={id}
          basePrice={basePrice}
          modules={modules}
          initialKeys={initialKeys}
          canEdit={canEdit}
        />
        {!canEdit && (
          <Link href={sitePath + "/piano/riepilogo"} className="mt-5 inline-flex text-emerald-800 underline">
            Vai al riepilogo
          </Link>
        )}
      </div>
    </main>
  );
}
