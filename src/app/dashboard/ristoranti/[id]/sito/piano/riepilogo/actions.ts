"use server";

import { createClient } from "@/lib/supabase/server";
import { openStripeTestCheckout, stripeTestCheckoutAvailable } from "@/lib/billing/stripe-test-checkout";

export async function saveCheckoutQuote(tenantId: string, expectedPrices: Record<string, number>, openCheckout: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("selfweb_prepare_draft_checkout", {
    p_tenant_id: tenantId,
    p_expected_prices: expectedPrices,
  });

  if (!error && typeof data?.quote_id === "string") {
    if (openCheckout && stripeTestCheckoutAvailable()) {
      const result = await openStripeTestCheckout(tenantId, data.quote_id);
      if (result.status === "open") return { success: true, refresh: false, message: "", url: result.url };
      if (result.status === "processing") {
        return { success: true, refresh: false, message: "", url: `/dashboard/ristoranti/${tenantId}/sito/piano/riepilogo/esito` };
      }
      return {
        success: false, refresh: false,
        message: result.status === "different_plan"
          ? "C’è già un checkout di prova aperto per un altro piano. Attendi che scada prima di riprovare."
          : "Riepilogo salvato. Il checkout di prova non è disponibile al momento.",
      };
    }
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
