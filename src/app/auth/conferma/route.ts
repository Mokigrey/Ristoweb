import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const invalidLink = "/registrati?esito=link-non-valido";
  if (!code) redirect(invalidLink);

  const supabase = await createClient();
  const flowId = params.get("sb_flow_id");
  const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error || !data.session) redirect(invalidLink);

  redirect("/cliente/nuovo");
}
