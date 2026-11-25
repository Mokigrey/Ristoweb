import { createHmac, timingSafeEqual } from "node:crypto";
import { billingDateInRome } from "@/lib/supabase/billing-cycle";

const stripeVersion = "2025-06-30.basil";
const maxPayloadBytes = 1_048_576;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const checkoutSessionId = /^cs_test_[a-z0-9]+$/i;
const completionEvents = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

type StripeEvent = {
  type?: string;
  livemode?: boolean;
  data?: { object?: { id?: string; object?: string; metadata?: Record<string, string> } };
};
type StripeInvoiceLine = { period?: { start: number; end: number } };
type StripeInvoiceLines = { data?: StripeInvoiceLine[]; has_more?: boolean };
type StripeInvoice = {
  id?: string;
  livemode?: boolean;
  billing_reason?: string;
  status?: string;
  amount_paid?: number;
  currency?: string;
  lines?: StripeInvoiceLines;
};
type StripeCheckoutSession = {
  id?: string;
  livemode?: boolean;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  client_reference_id?: string;
  metadata?: Record<string, string>;
  invoice?: StripeInvoice | null;
  subscription?: string | null;
};

export async function readWebhookBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks, size);
    size += value.byteLength;
    if (size > maxPayloadBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

export function verifyStripeEvent(body: Buffer, header: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const field of header.split(",")) {
    const [key, value] = field.trim().split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1" && /^[0-9a-f]{64}$/.test(value ?? "")) signatures.push(value);
  }
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300) return null;

  const expected = createHmac("sha256", secret).update(timestamp + ".").update(body).digest();
  if (!signatures.some((signature) => timingSafeEqual(expected, Buffer.from(signature, "hex")))) return null;

  try {
    return JSON.parse(body.toString("utf8")) as StripeEvent | null;
  } catch {
    return null;
  }
}

export function stripeTestSessionFromEvent(event: StripeEvent) {
  const session = event.data?.object;
  return event.livemode === false && completionEvents.has(event.type ?? "") && session?.object === "checkout.session"
    && session.metadata?.selfweb_flow === "initial_checkout" && checkoutSessionId.test(session.id ?? "")
    ? session.id : undefined;
}

async function stripeGet<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": stripeVersion },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Stripe test API request failed.");
  return response.json();
}

export async function verifyStripeTestPayment(sessionId: string, key: string) {
  const session = await stripeGet<StripeCheckoutSession>(`checkout/sessions/${sessionId}?expand[]=invoice`, key);
  const metadata = session.metadata;
  const tenantId = metadata?.selfweb_tenant_id;
  const quoteId = metadata?.selfweb_quote_id;
  if (session.id !== sessionId || session.livemode !== false || session.mode !== "subscription"
    || metadata?.selfweb_flow !== "initial_checkout" || !tenantId || !uuid.test(tenantId)
    || !quoteId || !uuid.test(quoteId) || session.client_reference_id !== quoteId) {
    return { status: "invalid" } as const;
  }
  if (session.status !== "complete" || session.payment_status === "unpaid") {
    return { status: "pending" } as const;
  }

  const invoice = session.invoice;
  const subscriptionId = session.subscription;
  const amount = invoice?.amount_paid;
  if (session.payment_status !== "paid" || !invoice?.id || !/^in_[a-z0-9]+$/i.test(invoice.id)
    || invoice.livemode !== false || invoice.status !== "paid" || invoice.billing_reason !== "subscription_create"
    || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || amount !== session.amount_total
    || invoice.currency !== "eur" || session.currency !== invoice.currency
    || !subscriptionId || !/^sub_[a-z0-9]+$/i.test(subscriptionId)) {
    return { status: "invalid" } as const;
  }

  const lines = invoice.lines?.has_more
    ? await stripeGet<StripeInvoiceLines>(`invoices/${invoice.id}/lines?limit=100`, key)
    : invoice.lines;
  const period = lines?.data?.[0]?.period;
  if (!period || !Number.isSafeInteger(period.start) || !Number.isSafeInteger(period.end)
    || period.start <= 0 || period.start >= period.end || lines?.has_more !== false
    || !lines.data?.every((line) => line.period?.start === period.start && line.period?.end === period.end)) {
    return { status: "invalid" } as const;
  }

  return {
    status: "verified",
    args: {
      p_tenant_id: tenantId,
      p_quote_id: quoteId,
      p_provider: "stripe_test",
      p_provider_payment_id: invoice.id,
      p_provider_subscription_id: subscriptionId,
      p_amount_cents: amount,
      p_currency: "EUR",
      p_period_start: billingDateInRome(new Date(period.start * 1000)),
      p_period_end: billingDateInRome(new Date(period.end * 1000)),
    },
  } as const;
}
