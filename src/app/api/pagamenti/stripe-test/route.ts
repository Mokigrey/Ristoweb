import { createClient } from "@supabase/supabase-js";
import { readWebhookBody, stripeTestSessionFromEvent, verifyStripeEvent, verifyStripeTestPayment } from "@/lib/billing/stripe-test-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripeKey = process.env.SELFWEB_STRIPE_TEST_KEY ?? "";
  const signingSecret = process.env.SELFWEB_STRIPE_TEST_WEBHOOK_SECRET ?? "";
  const databaseUrl = process.env.SELFWEB_STRIPE_TEST_SUPABASE_URL;
  const databaseKey = process.env.SELFWEB_STRIPE_TEST_SUPABASE_SECRET_KEY;
  if (!/^(sk|rk)_test_[a-z0-9]+$/i.test(stripeKey) || !signingSecret.startsWith("whsec_") || !databaseUrl || !databaseKey) {
    return Response.json({ outcome: "test_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ outcome: "invalid_signature" }, { status: 400 });
  let body: Buffer | null;
  try {
    body = await readWebhookBody(request);
  } catch {
    return Response.json({ outcome: "invalid_payload" }, { status: 400 });
  }
  if (!body) return Response.json({ outcome: "invalid_payload" }, { status: 413 });
  const event = verifyStripeEvent(body, signature, signingSecret);
  if (!event || typeof event !== "object") return Response.json({ outcome: "invalid_signature" }, { status: 400 });
  const sessionId = stripeTestSessionFromEvent(event);
  if (!sessionId) return Response.json({ outcome: "ignored" });

  try {
    const payment = await verifyStripeTestPayment(sessionId, stripeKey);
    if (payment.status === "pending") return Response.json({ outcome: "pending_payment" });
    if (payment.status === "invalid") return Response.json({ outcome: "payment_not_verified" }, { status: 422 });

    const database = createClient(databaseUrl, databaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await database.rpc("selfweb_activate_paid_checkout", payment.args);
    if (error) return Response.json({ outcome: "activation_unavailable" }, { status: 503 });
    if (data === "activated" || data === "already_activated") return Response.json({ outcome: data });
    return Response.json({ outcome: "activation_conflict" }, { status: 409 });
  } catch {
    return Response.json({ outcome: "verification_unavailable" }, { status: 503 });
  }
}
