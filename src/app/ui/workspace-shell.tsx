"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import SignOutButton from "../dashboard/SignOutButton";

export type WorkspaceLink = { href: string; label: string; mobilePrimary?: boolean };

const mobileItem = "grid min-h-12 place-items-center rounded-xl px-2 py-1 text-center text-xs font-semibold text-slate-700 hover:bg-selfweb-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-selfweb-action aria-[current=page]:bg-selfweb-accent aria-[current=page]:text-selfweb-ink";

export default function WorkspaceShell({
  area, title, homeHref, links, children,
}: {
  area: "platform" | "client" | "site";
  title: string;
  homeHref: string;
  links: WorkspaceLink[];
  children: ReactNode;
}) {
  const path = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  if ((area === "platform" && /^\/dashboard\/ristoranti\/[^/]+\/sito(?:\/|$)/.test(path))
    || (area === "site" && path.endsWith("/anteprima"))) return children;

  const open = menuPath === path;
  const current = [...links].reverse().find(({ href }) => (
    path === href || (href !== homeHref && path.startsWith(`${href}/`))
  ));
  const navigationTitle = area === "site" ? "Gestione vetrina" : area === "platform" ? "Amministrazione" : "Area cliente";
  const mobileLinks = links.length <= 3 ? links : [
    links[0],
    links.find(({ mobilePrimary }) => mobilePrimary) ?? links[1],
  ];
  const overflowLinks = links.filter((link) => !mobileLinks.includes(link));
  const overflowActive = overflowLinks.some(({ href }) => current?.href === href);
  const mobileMenuId = `workspace-mobile-menu-${area}`;

  return (
    <div className="min-h-dvh bg-selfweb-canvas text-selfweb-ink md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3" href="#workspace-content">Vai al contenuto</a>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto bg-selfweb-rail px-4 py-6 text-white md:block">
        <Link className="flex items-center gap-3 rounded-xl px-2 py-1 text-xl font-bold tracking-tight focus-visible:outline-teal-300" href={homeHref}>
          <span className="grid size-9 place-items-center rounded-xl bg-selfweb-accent text-selfweb-rail" aria-hidden="true">S</span>
          Selfweb
        </Link>
        <div className="px-2 pb-3 pt-7">
          <p className="text-xs font-semibold text-teal-100/80">{navigationTitle}</p>
          {area === "site" && <p className="mt-1.5 break-words font-bold">{title}</p>}
        </div>
        <nav className="grid gap-1" aria-label={navigationTitle}>
          {links.map(({ href, label }) => (
            <Link
              key={href} href={href} prefetch={false}
              aria-current={current?.href === href ? "page" : undefined}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-teal-50 hover:bg-white/10 focus-visible:outline-teal-300 aria-[current=page]:bg-selfweb-accent aria-[current=page]:text-selfweb-rail"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-selfweb-border bg-white px-4 py-2 md:px-8">
          <Link className="flex items-center gap-2 font-bold tracking-tight md:hidden" href={homeHref} onClick={() => setMenuPath(null)}>
            <span className="grid size-8 place-items-center rounded-lg bg-selfweb-action text-sm text-white" aria-hidden="true">S</span>
            Selfweb
          </Link>
          <span className="hidden text-sm font-semibold text-slate-700 md:inline">{current?.label ?? navigationTitle}</span>
          <SignOutButton />
        </header>
        <div id="workspace-content" tabIndex={-1} className="[&>main]:!min-h-0 [&>main]:!bg-transparent [&>main]:max-sm:!px-4">
          {children}
        </div>
      </div>
      <nav
        aria-label={navigationTitle}
        className={`fixed inset-x-0 bottom-0 z-30 grid gap-1 border-t border-selfweb-border bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom,0px))] pt-2 md:hidden ${mobileLinks.length === 2 && !overflowLinks.length ? "grid-cols-2" : "grid-cols-3"}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            setMenuPath(null);
            menuButton.current?.focus();
          }
        }}
      >
        {mobileLinks.map(({ href, label }) => (
          <Link key={href} href={href} prefetch={false} className={mobileItem}
            aria-current={current?.href === href ? "page" : undefined} onClick={() => setMenuPath(null)}>
            {label}
          </Link>
        ))}
        {overflowLinks.length > 0 && (
          <>
            <button type="button" ref={menuButton}
              className={`${mobileItem} aria-expanded:bg-selfweb-accent ${overflowActive ? "bg-selfweb-accent" : ""}`}
              aria-controls={mobileMenuId} aria-expanded={open} onClick={() => setMenuPath(open ? null : path)}>
              {open ? "Chiudi" : "Altro"}
            </button>
            <ul id={mobileMenuId} hidden={!open}
              className="absolute inset-x-2 bottom-full mb-2 max-h-[55dvh] overflow-y-auto rounded-xl border border-selfweb-border bg-white p-2 shadow-lg">
              {overflowLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} prefetch={false} onClick={() => setMenuPath(null)}
                    aria-current={current?.href === href ? "page" : undefined}
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-selfweb-canvas aria-[current=page]:bg-selfweb-accent">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </div>
  );
}
