import Link from "next/link";

export default function DashboardOverview({ sites, published }: { sites: number; published: number }) {
  return (
    <main className="px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-[#15352a] px-6 py-9 text-white sm:px-10 sm:py-11">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Panoramica</h1>
          <p className="mt-3 max-w-xl text-[#d3e9dc]">Gestisci le attività e le loro vetrine da un unico pannello.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard/ristoranti" className="rounded-lg bg-[#c6ead2] px-4 py-2.5 font-semibold text-[#173128] hover:bg-[#e3f4e8]">
              Gestisci attività
            </Link>
            <Link href="/dashboard/ristoranti/nuovo" className="rounded-lg border border-[#86a999] px-4 py-2.5 font-semibold hover:bg-[#264c3d]">
              Nuova attività
            </Link>
          </div>
        </section>
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Attività registrate", count: sites },
            { label: "Vetrine pubblicate", count: published },
            { label: "Vetrine in bozza", count: sites - published },
          ].map(({ label, count }) => (
            <div key={label} className="rounded-xl border border-[#e1e7e3] bg-white p-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-600">{label}</dt>
              <dd className="mt-3 text-4xl font-bold tracking-tight text-[#15352a]">{count}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}