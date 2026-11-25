import Link from "next/link";

export default function DashboardOverview({ sites, published }: { sites: number; published: number }) {
  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-selfweb-hero px-5 py-8 text-white sm:px-10 sm:py-11">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Panoramica</h1>
          <p className="mt-3 max-w-xl text-selfweb-accent">Gestisci le attività e le loro vetrine da un unico pannello.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard/ristoranti" className="rounded-lg bg-selfweb-accent px-4 py-2.5 font-semibold text-selfweb-ink hover:bg-teal-50">
              Gestisci attività
            </Link>
            <Link href="/dashboard/ristoranti/nuovo" className="rounded-lg border border-white/50 px-4 py-2.5 font-semibold hover:bg-white/10">
              Nuova attività
            </Link>
          </div>
        </section>
        <dl className="grid gap-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Attività registrate", count: sites },
            { label: "Vetrine pubblicate", count: published },
            { label: "Vetrine in bozza", count: sites - published },
          ].map(({ label, count }) => (
            <div key={label} className="rounded-xl border border-selfweb-border bg-white p-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-600">{label}</dt>
              <dd className="mt-3 text-4xl font-bold tracking-tight text-selfweb-ink">{count}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
