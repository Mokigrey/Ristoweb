"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSiteAccess } from "@/lib/supabase/site-access";

export async function saveMonthlyPrice(tenantId: string, priceKey: string, formData: FormData) {
  const supabase = await createClient();
  if (await getSiteAccess(supabase, tenantId) !== "platform") {
    return { success: false, message: "Il listino è modificabile solo dall’amministratore." };
  }

  const field = formData.get("amount");
  if (typeof field !== "string") return { success: false, message: "Importo non valido." };
  const value = field.trim();
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(value);
  if (value && !match) return { success: false, message: "Inserisci un importo in euro con al massimo due decimali." };

  const cents = match
    ? Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
    : null;
  const { error } = await supabase.from("monthly_prices").upsert({
    price_key: priceKey,
    module_key: priceKey === "base" ? null : priceKey,
    amount_cents: cents,
  }, { onConflict: "price_key" });
  if (error) return { success: false, message: "Impossibile salvare la tariffa." };

  revalidatePath("/dashboard/ristoranti/[id]/sito/canone", "page");
  return { success: true, message: cents === null ? "Tariffa impostata come da definire." : "Tariffa salvata." };
}
