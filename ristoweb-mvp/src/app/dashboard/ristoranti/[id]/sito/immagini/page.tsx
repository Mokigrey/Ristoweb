import { getSiteAccess } from "@/lib/supabase/site-access";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImageForm from "./image-form";
import GalleryEditor from "./gallery-editor";
import { loadSiteImages } from "./media";

export default async function ImmaginiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, settings] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", id).maybeSingle(),
    supabase.from("site_settings").select("logo_path, hero_image_path").eq("tenant_id", id).maybeSingle(),
  ]);
  if (tenant.error || settings.error) throw new Error("Impossibile caricare le immagini del sito.");
  if (!tenant.data) notFound();

  const images = await loadSiteImages(supabase, id, settings.data, { visibleOnly: false });
  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href={sitePath} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <div className="my-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Immagini del sito</h1>
            <p className="mt-1 text-gray-600">{tenant.data.name} · JPEG, PNG o WebP, fino a 5 MB per immagine</p>
          </div>
          <Link href={`${sitePath}/anteprima`} className="font-medium text-emerald-800 hover:underline">
            Apri anteprima
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <section aria-labelledby="logo-title" className="rounded-xl bg-white p-5 shadow-sm">
            <h2 id="logo-title" className="text-lg font-semibold">Logo</h2>
            {images.logo && <img src={images.logo} alt={`Logo di ${tenant.data.name}`} className="mt-3 h-20 max-w-full object-contain" />}
            <ImageForm tenantId={id} kind="logo" />
          </section>
          <section aria-labelledby="hero-title" className="rounded-xl bg-white p-5 shadow-sm">
            <h2 id="hero-title" className="text-lg font-semibold">Immagine principale</h2>
            {images.hero && <img src={images.hero} alt="Immagine principale" className="mt-3 aspect-video w-full rounded-md object-cover" />}
            <ImageForm tenantId={id} kind="hero" />
          </section>
          <section aria-labelledby="gallery-title" className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
            <h2 id="gallery-title" className="text-lg font-semibold">Galleria fotografica</h2>
            <GalleryEditor tenantId={id} images={images.gallery} />
            <ImageForm tenantId={id} kind="gallery" />
          </section>
        </div>
      </div>
    </main>
  );
}
