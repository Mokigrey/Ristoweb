const capabilities = [
  ['Siti personalizzati', 'Tre modelli grafici iniziali, personalizzabili per ogni locale.'],
  ['Menu aggiornabile', 'Piatti, categorie, descrizioni, prezzi e fotografie gestibili dal cliente.'],
  ['Prenotazioni', 'Richieste online con gestione, conferma e rifiuto dal pannello.'],
  ['Multi-cliente', 'Un’unica piattaforma, con dati e accessi isolati per ogni attività.'],
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-12 inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600">Progetto in sviluppo · MVP 1.0</div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[.2em] text-emerald-800">Piattaforma commerciale</p>
      <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">Il sito del tuo ristorante, semplice da gestire.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Una piattaforma per creare siti web professionali per ristoranti e pizzerie, aggiornare il menu e ricevere richieste di prenotazione.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {capabilities.map(([title, description]) => (
          <section key={title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 leading-7 text-stone-600">{description}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 border-t border-stone-200 pt-6 text-sm text-stone-500">RistoWeb è un nome provvisorio di progetto, non ancora verificato come marchio o dominio.</p>
    </main>
  );
}
