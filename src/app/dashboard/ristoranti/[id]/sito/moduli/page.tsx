import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";
import { bookingsModule, digitalMenuModule } from "@/lib/supabase/site-modules";
import { formatBillingDate } from "@/lib/supabase/billing-cycle";
import ModuleToggle from "./module-toggle";

export default async function ModuliPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getSiteAccess(supabase, id);
  if (access === "signed-out") redirect("/login");
  if (access === "denied") notFound();

  const [tenant, catalog, assignments, cycle, removals, owner] = await Promise.all([
    supabase.from("tenants").select("name, plan_type").eq("id", id).maybeSingle(),
    supabase.from("module_catalog").select("module_key, label, description").order("label"),
    supabase.from("tenant_modules").select("module_key, enabled").eq("tenant_id", id),
    supabase.from("tenant_billing_cycles").select("period_end").eq("tenant_id", id).maybeSingle(),
    supabase.from("tenant_module_removals").select("module_key").eq("tenant_id", id),
    access === "tenant"
      ? supabase.from("tenant_members").select("role").eq("tenant_id", id).eq("role", "tenant_admin").maybeSingle()
      : { data: null, error: null },
  ]);
  if (tenant.error || catalog.error || assignments.error || cycle.error || removals.error || owner.error) {
    throw new Error("Impossibile caricare i moduli.");
  }
  if (!tenant.data) notFound();

  const active = new Set(assignments.data.filter((item) => item.enabled).map((item) => item.module_key));
  const scheduled = new Set(removals.data.map(({ module_key }) => module_key));
  const canSchedule = access === "platform" || owner.data?.role === "tenant_admin";
  const renewalDate = tenant.data.plan_type === "subscription" ? cycle.data?.period_end : undefined;
  const sitePath = `/dashboard/ristoranti/${id}/sito`;
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={sitePath} className="text-emerald-800 hover:underline">← Gestione sito</Link>
        <header className="my-7">
          <h1 className="text-3xl font-bold text-gray-900">Moduli della vetrina</h1>
          <p className="mt-1 text-gray-600">{tenant.data.name}</p>
        </header>
        <ul className="space-y-4">
          {catalog.data.map(({ module_key, label, description }) => {
            const enabled = active.has(module_key);
            return (
              <li key={module_key} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <span className={enabled ? "text-sm font-medium text-emerald-800" : "text-sm text-gray-600"}>
                    {enabled ? "Attivo" : "Non attivo"}
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{description}</p>
                {enabled && renewalDate && scheduled.has(module_key) && (
                  <p className="mt-2 text-sm text-gray-700">Disattivazione prevista al rinnovo del {formatBillingDate(renewalDate)}.</p>
                )}
                {enabled && module_key === digitalMenuModule && (
                  <Link href={`${sitePath}/menu`} className="mt-3 inline-block font-medium text-emerald-800 hover:underline">
                    Gestisci menu
                  </Link>
                )}
                {enabled && module_key === bookingsModule && (
                  <Link href={`${sitePath}/prenotazioni`} className="mt-3 inline-block font-medium text-emerald-800 hover:underline">
                    Gestisci prenotazioni
                  </Link>
                )}
                {enabled && renewalDate
                  ? canSchedule && <ModuleToggle tenantId={id} moduleKey={module_key} enabled renewal scheduled={scheduled.has(module_key)} />
                  : access === "platform" && <ModuleToggle tenantId={id} moduleKey={module_key} enabled={enabled} />}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
