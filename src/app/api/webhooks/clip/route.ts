import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaymentRequest } from "@/lib/clip";
import { fulfillClipPayment } from "@/lib/checkout-fulfillment";

// Clip's webhook docs (https://developer.clip.mx/reference/checkout-webhook)
// describe a richer payload (payment_request_id, resource_status, etc.) than
// what Clip actually sends in practice — the real body observed in
// production is just {"event_type":"INSERT"|"UPDATE","id":"<payment_request_id>",
// "origin":"checkout-api"}, a bare change notification with the payment
// request id under `id`. That fits our design either way: we never trust a
// status embedded in the callback body, so we re-fetch the payment request
// from Clip's API by id and act on that authoritative status.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // fall through — logged below via rawBody
  }
  const paymentRequestId = (body?.id ?? body?.payment_request_id ?? body?.paymentRequestId) as
    | string
    | undefined;
  if (!paymentRequestId) {
    console.error("Clip webhook missing payment_request_id — raw body:", rawBody);
    return NextResponse.json({ error: "missing payment_request_id" }, { status: 400 });
  }

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("sale_id")
    .eq("provider_reference", paymentRequestId)
    .eq("provider", "clip")
    .maybeSingle();
  if (!payment) {
    return NextResponse.json({ error: "unknown payment_request_id" }, { status: 404 });
  }

  const confirmed = await getPaymentRequest(paymentRequestId);

  try {
    await fulfillClipPayment(payment.sale_id, confirmed.status, confirmed);
  } catch (err) {
    console.error("clip webhook fulfillment failed", err);
    return NextResponse.json({ error: "fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
