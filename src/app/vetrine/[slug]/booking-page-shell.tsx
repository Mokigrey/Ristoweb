import Link from "next/link";
import type { ReactNode } from "react";

export default function BookingPageShell({ title, backHref, summary, children }: {
  title: string;
  backHref: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-selfweb-canvas bg-[radial-gradient(ellipse_at_top_right,_#c7ede6,_transparent_45%)] px-4 py-6 font-sans text-selfweb-ink antialiased sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-selfweb-rail text-sm text-selfweb-accent">S</span>
            Selfweb
          </p>
          <Link href={backHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-selfweb-action hover:underline">
            Torna alla vetrina
          </Link>
        </div>
        <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-selfweb-rail via-selfweb-hero to-selfweb-action px-6 py-7 text-white shadow-lg shadow-teal-950/10 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_#83e6d92e,_transparent_50%)]" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {summary}
        </header>
        {children}
      </div>
    </main>
  );
}
