import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9e4db] py-5">
          <span className="text-2xl font-extrabold tracking-tight text-[#18382a]">Selfweb</span>
          <Link href="/login" className="rounded-lg border border-[#a7baac] px-4 py-2 font-medium text-[#18382a] hover:bg-white">
            Accedi
          </Link>
        </header>
        <section className="max-w-4xl py-16 sm:py-24">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#16392a] sm:text-6xl">Crea la vetrina online della tua attività.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#384e42]">
            Scegli un template per il tuo settore, aggiungi i tuoi contenuti e guarda l’anteprima del sito.
          </p>
          <Link href="/registrati" className="mt-7 inline-flex rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">
            Crea un account
          </Link>
        </section>
      </div>
    </main>
  );
}