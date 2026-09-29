import crypto from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPayment } from "@/lib/mercadopago";
import { fulfillMercadoPagoPayment } from "@/lib/checkout-fulfillment";

// Mercado Pago signs every notification with the secret from Dashboard →
// Webhooks → Signature secret. `x-signature` is `ts=...,v1=...` where v1 is
// HMAC-SHA256 of the canonical string "id:{data.id};request-id:{x-request-id};ts:{ts};".
// See https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/notifications/webhooks
function isValidSignature(
  signatureHeader: string,
  requestId: string,
  dataId: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const canonical = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(canonical).digest("hex");

  return (
    expected.length === v1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  );
}

// We never trust the notification body's own status field — only its
// `data.id` (the payment id), used to re-fetch the authoritative status from
// Mercado Pago's Payments API before acting on it.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: { type?: string; data?: { id?: string } } | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // fall through — logged below via rawBody
  }

  const paymentId = body?.data?.id;
  if (!paymentId) {
    console.error("Mercado Pago webhook missing data.id — raw body:", rawBody);
    return NextResponse.json({ error: "missing data.id" }, { status: 400 });
  }

  // Only `payment` notifications carry a payment id we can act on; other
  // topics (e.g. legacy merchant_order events) are acknowledged and ignored.
  if (body?.type && body.type !== "payment") {
    return NextResponse.json({ ok: true, ignored: body.type });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!secret || !isValidSignature(signatureHeader, requestId, paymentId, secret)) {
    console.error("Mercado Pago webhook signature invalid or missing MP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let confirmed;
  try {
    confirmed = await getPayment(paymentId);
  } catch (err) {
    console.error("Mercado Pago getPayment failed", err);
    return NextResponse.json({ error: "could not fetch payment" }, { status: 502 });
  }

  const saleId = confirmed.external_reference;
  if (!saleId) {
    console.error(`Mercado Pago payment ${paymentId} has no external_reference`);
    return NextResponse.json({ error: "missing external_reference" }, { status: 400 });
  }

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("sale_id")
    .eq("sale_id", saleId)
    .eq("provider", "mercado_pago")
    .maybeSingle();
  if (!payment) {
    return NextResponse.json({ error: "unknown sale for payment" }, { status: 404 });
  }

  try {
    await fulfillMercadoPagoPayment(saleId, confirmed.status ?? "", confirmed, paymentId);
  } catch (err) {
    console.error("mercado pago webhook fulfillment failed", err);
    return NextResponse.json({ error: "fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
