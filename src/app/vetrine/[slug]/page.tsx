import { cache, type ComponentProps } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SitePreview from "@/app/dashboard/ristoranti/[id]/sito/anteprima/site-preview";
import { defaultAppearance } from "@/app/dashboard/ristoranti/[id]/sito/aspetto/appearance";
import { createPublicClient } from "@/lib/supabase/public-client";
import { publicMediaUrl } from "@/lib/public-media";

export const dynamic = "force-dynamic";

type PreviewProps = ComponentProps<typeof SitePreview>;
type PublishedSite = Pick<PreviewProps, "name" | "template" | "settings" | "menu"> & {
  appearance: PreviewProps["appearance"] | null;
  logoPath: string | null;
  heroPath: string | null;
  gallery: { id: string; path: string; alt: string }[];
};

const loadPublishedSite = cache(async (slug: string): Promise<PublishedSite> => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();
  const client = createPublicClient();
  const { data, error } = await client.rpc("selfweb_public_site", { p_slug: slug });
  if (error) throw new Error("Impossibile caricare la vetrina.");
  if (!data) notFound();
  return data as PublishedSite;
});

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadPublishedSite(slug);
  return {
    title: site.name,
    description: site.settings?.tagline || site.settings?.description || `Vetrina di ${site.name}`,
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await loadPublishedSite(slug);
  const images = {
    logo: publicMediaUrl(site.logoPath),
    hero: publicMediaUrl(site.heroPath),
    gallery: site.gallery.flatMap(({ path, id, alt }) => {
      const src = publicMediaUrl(path);
      return src ? [{ id, src, alt, isVisible: true }] : [];
    }),
  };

  return (
    <main>
      <SitePreview
        name={site.name}
        template={site.template}
        settings={site.settings}
        appearance={site.appearance ?? defaultAppearance}
        menu={site.menu}
        images={images}
      />
    </main>
  );
}
