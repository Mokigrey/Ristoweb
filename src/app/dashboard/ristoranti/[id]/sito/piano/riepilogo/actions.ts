"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveCheckoutQuote(tenantId: string, expectedPrices: Record<string, number>) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("selfweb_prepare_draft_checkout", {
    p_tenant_id: tenantId,
    p_expected_prices: expectedPrices,
  });

  if (!error && typeof data?.quote_id === "string") {
    return { success: true, refresh: false, message: "Riepilogo salvato per il pagamento." };
  }
  if (!error && (data?.status === "changed" || data?.status === "unpriced")) {
    return {
      success: false,
      refresh: true,
      message: "Il piano o il listino sono cambiati. Controlla il riepilogo aggiornato.",
    };
  }
  return { success: false, refresh: false, message: "Impossibile salvare il riepilogo. Riprova." };
}
