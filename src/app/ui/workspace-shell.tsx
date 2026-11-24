"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import SignOutButton from "../dashboard/SignOutButton";
import styles from "./workspace-shell.module.css";

export type WorkspaceLink = { href: string; label: string };

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
  const [open, setOpen] = useState(false);
  if ((area === "platform" && /^\/dashboard\/ristoranti\/[^/]+\/sito(?:\/|$)/.test(path))
    || (area === "site" && path.endsWith("/anteprima"))) return children;

  const current = [...links].reverse().find(({ href }) => (
    path === href || (href !== homeHref && path.startsWith(`${href}/`))
  ));
  const navigationTitle = area === "site" ? "Gestione vetrina" : area === "platform" ? "Amministrazione" : "Area cliente";

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#workspace-content">Vai al contenuto</a>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link className={styles.brand} href={homeHref} onClick={() => setOpen(false)}>
            <span className={styles.mark} aria-hidden="true">S</span><span>Selfweb</span>
          </Link>
          <button
            type="button" className={styles.mobileToggle}
            aria-expanded={open} aria-controls={`workspace-navigation-${area}`}
            onClick={() => setOpen(!open)}
          >
            {open ? "Chiudi menu" : "Menu"}
          </button>
        </div>
        <div className={styles.context} data-open={open}>
          <p className={styles.area}>{navigationTitle}</p>
          {area === "site" && <p className={styles.siteName}>{title}</p>}
        </div>
        <nav className={styles.navigation} id={`workspace-navigation-${area}`} aria-label={navigationTitle} data-open={open}>
          {links.map(({ href, label }) => (
            <Link
              key={href} href={href} prefetch={false}
              aria-current={current?.href === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.toolbar}>
          <span>{current?.label ?? navigationTitle}</span>
          <SignOutButton />
        </header>
        <div id="workspace-content" className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
