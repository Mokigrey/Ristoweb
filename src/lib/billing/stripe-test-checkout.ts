import { createClient } from "@supabase/supabase-js";

type CheckoutAttempt = {
  id: string;
  quoteId: string;
  sessionId: string | null;
  createdAt: string;
  lines: { label: string; amount_cents: number }[];
  currency: string;
  total: number;
};

type StripeSession = { id: string; livemode: boolean; status: "open" | "complete" | "expired"; url: string | null };

function checkoutConfig() {
  const key = process.env.SELFWEB_STRIPE_TEST_KEY;
  const webhook = process.env.SELFWEB_STRIPE_TEST_WEBHOOK_SECRET;
  const dbUrl = process.env.SELFWEB_STRIPE_TEST_SUPABASE_URL;
  const dbKey = process.env.SELFWEB_STRIPE_TEST_SUPABASE_SECRET_KEY;
  const appUrl = process.env.SELFWEB_STRIPE_TEST_APP_URL;
  if (!key || !/^(sk|rk)_test_[A-Za-z0-9]+$/.test(key) || !webhook?.startsWith("whsec_")
    || !dbUrl || dbUrl.replace(/\/$/, "") !== process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || !dbKey || !appUrl) return null;
  try {
    const app = new URL(appUrl);
    if (app.origin === "null" || app.username || app.password || app.pathname !== "/" || app.search || app.hash
      || (app.protocol !== "https:" && !(app.protocol === "http:" && ["localhost", "127.0.0.1"].includes(app.hostname)))) return null;
    return { key, dbUrl, dbKey, appOrigin: app.origin };
  } catch {
    return null;
  }
}

export function stripeTestCheckoutAvailable() {
  return checkoutConfig() !== null;
}

async function stripeSession(key: string, sessionId?: string, create?: { body: URLSearchParams; attemptId: string }) {
  if (sessionId && !/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) throw new Error("Invalid test session ID.");
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Stripe-Version": "2025-06-30.basil" };
  if (create) headers["Idempotency-Key"] = `selfweb-test-${create.attemptId}`;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions${sessionId ? "/" + sessionId : ""}`, {
    method: create ? "POST" : "GET",
    body: create?.body,
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Stripe test checkout API request failed.");
  const data = await response.json() as StripeSession;
  if (data.livemode !== false || !/^cs_test_[A-Za-z0-9]+$/.test(data.id) || (sessionId && data.id !== sessionId)) {
    throw new Error("Unexpected Stripe test session.");
  }
  return data;
}

export async function openStripeTestCheckout(tenantId: string, quoteId: string) {
  const config = checkoutConfig();
  if (!config) return { status: "unavailable" } as const;
  const database = createClient(config.dbUrl, config.dbKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  async function reserve(expired?: string) {
    const { data, error } = await database.rpc("selfweb_reserve_stripe_test_checkout", {
      p_tenant_id: tenantId, p_quote_id: quoteId, p_expired_attempt: expired ?? null,
    });
    if (error || !data) throw new Error("Unable to reserve test checkout.");
    return data as CheckoutAttempt;
  }
  const planPath = `/dashboard/ristoranti/${tenantId}/sito/piano/riepilogo`;
  let attempt = await reserve();
  let session = attempt.sessionId ? await stripeSession(config.key, attempt.sessionId) : null;
  if (session?.status === "expired") {
    attempt = await reserve(attempt.id);
    session = attempt.sessionId ? await stripeSession(config.key, attempt.sessionId) : null;
  }
  if (session?.status === "complete") return { status: "processing" } as const;
  if (attempt.quoteId !== quoteId) return { status: "different_plan" } as const;

  if (!session) {
    // Do not reuse a Stripe idempotency key after its minimum retention period.
    if (Date.now() - Date.parse(attempt.createdAt) >= 23 * 3_600_000) return { status: "unavailable" } as const;
    if (attempt.currency !== "EUR" || !attempt.lines.length || attempt.lines.length > 20
      || attempt.lines.some((line) => !Number.isSafeInteger(line.amount_cents) || line.amount_cents < 0)
      || attempt.lines.reduce((sum, line) => sum + line.amount_cents, 0) !== attempt.total) return { status: "unavailable" } as const;
    const body = new URLSearchParams({
      mode: "subscription", locale: "it",
      "payment_method_types[]": "card",
      success_url: config.appOrigin + planPath + "/esito",
      cancel_url: config.appOrigin + planPath,
      client_reference_id: attempt.quoteId,
      "metadata[selfweb_flow]": "initial_checkout",
      "metadata[selfweb_tenant_id]": tenantId,
      "metadata[selfweb_quote_id]": attempt.quoteId,
    });
    attempt.lines.forEach(({ label, amount_cents }, index) => {
      const item = `line_items[${index}]`;
      body.set(item + "[quantity]", "1");
      body.set(item + "[price_data][currency]", "eur");
      body.set(item + "[price_data][product_data][name]", label);
      body.set(item + "[price_data][recurring][interval]", "month");
      body.set(item + "[price_data][unit_amount]", String(amount_cents));
    });
    session = await stripeSession(config.key, undefined, { body, attemptId: attempt.id });
    const { data, error } = await database.rpc("selfweb_link_stripe_test_checkout", {
      p_attempt: attempt.id, p_session: session.id,
    });
    if (error || data !== true) throw new Error("Unable to link test checkout.");
  }

  if (session.status !== "open" || !session.url) return { status: "unavailable" } as const;
  const url = new URL(session.url);
  if (url.origin !== "https://checkout.stripe.com" || url.username || url.password) return { status: "unavailable" } as const;
  return { status: "open", url: url.href } as const;
}
