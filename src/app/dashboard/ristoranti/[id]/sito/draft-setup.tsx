import Link from "next/link";

export default function DraftSetup({
  sitePath, sector, hasDescription, hasContact, hasImage,
}: {
  sitePath: string;
  sector: string;
  hasDescription: boolean;
  hasContact: boolean;
  hasImage: boolean;
}) {
  const steps = [
    { label: "Descrizione dell’attività", path: "/informazioni", done: hasDescription },
    { label: "Indirizzo o recapito", path: "/informazioni", done: hasContact },
    { label: "Logo o foto della vetrina", path: "/immagini", done: hasImage },
  ];
  const completed = steps.filter(({ done }) => done).length;

  return (
    <section aria-labelledby="prepara-vetrina" className="mb-8 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
      <header className="bg-emerald-950 px-5 py-5 text-white sm:px-6">
        <p className="text-sm text-emerald-200">{sector} · Bozza</p>
        <h2 id="prepara-vetrina" className="mt-1 text-2xl font-semibold">Prepara la tua vetrina</h2>
        <p className="mt-1 text-sm text-emerald-100">
          {completed} su {steps.length} contenuti consigliati inseriti
        </p>
      </header>
      <div className="px-5 py-4 sm:px-6">
        <ul className="divide-y divide-emerald-100">
          {steps.map(({ label, path, done }) => (
            <li key={label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <Link href={sitePath + path} className="font-medium text-emerald-900 underline-offset-4 hover:underline focus-visible:underline">
                {label}
              </Link>
              <span className={done ? "text-sm text-emerald-800" : "text-sm text-gray-600"}>
                {done ? "Inserito" : "Da aggiungere"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={sitePath + "/anteprima"} className="rounded-lg border border-emerald-800 px-4 py-2 font-medium text-emerald-800 hover:bg-emerald-50">
            Apri anteprima
          </Link>
          <Link href={sitePath + "/piano"} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
            Configura il piano
          </Link>
        </div>
      </div>
    </section>
  );
}
