import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPaymentRequest } from "@/lib/clip";
import { fulfillClipPayment } from "@/lib/checkout-fulfillment";

// Clip's webhook docs (https://developer.clip.mx/reference/checkout-webhook)
// don't document a request-signing scheme, so instead of trusting this
// payload's `resource_status` outright, we re-fetch the payment request
// from Clip's API by id and act on that authoritative status.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const paymentRequestId = body?.payment_request_id as string | undefined;
  if (!paymentRequestId) {
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
