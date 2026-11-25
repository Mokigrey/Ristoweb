import styles from "./preview.module.css";
import { paletteStyle, type SiteAppearance } from "../aspetto/appearance";
import type { SiteImages } from "../immagini/media";

type SiteSettings = {
  tagline: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  opening_hours: unknown;
  social_links: unknown;
};

type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  items: { id: string; name: string; description: string | null; price: number | null }[];
};

const days = [
  ["lunedi", "Lunedì"], ["martedi", "Martedì"], ["mercoledi", "Mercoledì"],
  ["giovedi", "Giovedì"], ["venerdi", "Venerdì"], ["sabato", "Sabato"], ["domenica", "Domenica"],
];
const networks = [
  ["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"],
  ["youtube", "YouTube"], ["tripadvisor", "Tripadvisor"],
];
const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function timeRange(from: unknown, to: unknown) {
  return typeof from === "string" && typeof to === "string" && clockTime.test(from) && clockTime.test(to)
    ? `${from}–${to}`
    : "";
}

function webLink(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function SitePreview({
  name, template, settings, appearance, menu, images,
}: {
  name: string;
  template: string;
  settings: SiteSettings | null;
  appearance: SiteAppearance;
  menu: MenuCategory[];
  images: SiteImages;
}) {
  const openingHours = record(settings?.opening_hours);
  const hours = (appearance.show_opening_hours ? days : []).flatMap(([key, label]) => {
    const day = record(openingHours[key]);
    const ranges = [
      timeRange(day.lunch_open, day.lunch_close),
      timeRange(day.dinner_open, day.dinner_close),
    ].filter(Boolean);
    const text = day.closed === true ? "Chiuso" : ranges.join(" · ");
    return text ? [{ label, text }] : [];
  });
  const socialLinks = record(settings?.social_links);
  const social = networks.flatMap(([key, label]) => {
    const href = webLink(socialLinks[key]);
    return href ? [{ label, href }] : [];
  });
  const address = [settings?.address, settings?.city].filter(Boolean).join(", ");
  const tel = settings?.phone?.replace(/[^\d+]/g, "");
  const whatsapp = settings?.whatsapp?.replace(/\D/g, "");
  const email = settings?.email?.trim();
  const hasContactDetails = Boolean(address || tel || whatsapp || email || social.length);
  const showContact = hasContactDetails || hours.length > 0;
  const contactTitle = hours.length ? (hasContactDetails ? "Contatti e orari" : "Orari") : "Contatti";

  return (
    <article className={styles.site} data-template={template} style={paletteStyle(appearance.color_palette)}>
      <header className={styles.header}>
        <div className={styles.identity}>
          {images.logo && <img src={images.logo} alt="" />}
          <span>{name}</span>
        </div>
        {(menu.length > 0 || images.gallery.length > 0 || showContact) && (
          <nav aria-label="Sezioni del sito">
            {menu.length > 0 && <a href="#menu">Menu</a>}
            {images.gallery.length > 0 && <a href="#galleria">Galleria</a>}
            {showContact && <a href="#contatti">{contactTitle}</a>}
          </nav>
        )}
      </header>
      <div className={styles.hero} data-image={Boolean(images.hero)}>
        {images.hero && <img src={images.hero} alt="" className={styles.heroImage} />}
        <div>
          <h1>{name}</h1>
          {settings?.tagline && <p>{settings.tagline}</p>}
          {showContact && <a className={styles.cta} href="#contatti">{contactTitle}</a>}
        </div>
      </div>
      {appearance.show_about && settings?.description && (
        <section className={styles.section}>
          <h2>Chi siamo</h2>
          <p className={styles.description}>{settings.description}</p>
        </section>
      )}
      {menu.length > 0 && (
        <section className={styles.section} id="menu">
          <h2>Menu</h2>
          <div className={styles.grid}>
            {menu.map((category) => (
              <section key={category.id} className={styles.card}>
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
                <ul className={styles.menu}>
                  {category.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        {item.description && <p>{item.description}</p>}
                      </div>
                      {item.price !== null && <span>{currency.format(item.price)}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}
      {images.gallery.length > 0 && (
        <section className={styles.section} id="galleria">
          <h2>Galleria</h2>
          <ul className={styles.grid}>
            {images.gallery.map((image) => (
              <li key={image.id}><img src={image.src} alt={image.alt} className={styles.galleryImage} loading="lazy" /></li>
            ))}
          </ul>
        </section>
      )}
      {showContact && (
        <section className={styles.section} id="contatti">
          <h2>{contactTitle}</h2>
          <div className={styles.grid}>
            {hasContactDetails && (
              <div className={styles.card}>
                {address && <p>{address}</p>}
                {tel && <p><a href={`tel:${tel}`}>{settings?.phone}</a></p>}
                {whatsapp && <p><a href={`https://wa.me/${whatsapp}`}>WhatsApp</a></p>}
                {email && <p><a href={`mailto:${encodeURIComponent(email)}`}>{email}</a></p>}
                {social.length > 0 && (
                  <ul className={styles.social}>
                    {social.map(({ label, href }) => <li key={label}><a href={href}>{label}</a></li>)}
                  </ul>
                )}
              </div>
            )}
            {hours.length > 0 && (
              <dl className={`${styles.card} ${styles.hours}`}>
                {hours.map(({ label, text }) => (
                  <div key={label}><dt>{label}</dt><dd>{text}</dd></div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}
    </article>
  );
}
