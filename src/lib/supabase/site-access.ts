import type { createClient } from "./server";

type SiteAccess = "signed-out" | "denied" | "platform" | "tenant";

export async function getSiteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<SiteAccess> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return "signed-out";

  const { data: admin, error: adminError } = await supabase
    .from("platform_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();
  if (adminError) return "denied";
  if (admin) return "platform";

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .in("role", ["tenant_admin", "tenant_editor"])
    .maybeSingle();
  return !membershipError && membership ? "tenant" : "denied";
}
