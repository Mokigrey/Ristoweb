import { publicMediaUrl } from "@/lib/public-media";
import { createPublicClient } from "@/lib/supabase/public-client";
import { mediaBucket } from "@/app/dashboard/ristoranti/[id]/sito/immagini/media";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const mediaTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!publicMediaUrl(path)) return new Response(null, { status: 404, headers });

  const client = createPublicClient();
  const { data, error } = await client.storage.from(mediaBucket).download(path);
  if (error || !data || !mediaTypes.has(data.type)) return new Response(null, { status: 404, headers });

  return new Response(data, { headers: { ...headers, "Content-Type": data.type } });
}
