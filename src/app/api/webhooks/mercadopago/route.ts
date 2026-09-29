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
    signatureHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    console.error("MP webhook: x-signature missing ts/v1", { hasHeader: !!signatureHeader });
    return false;
  }

  // Mercado Pago requires an alphanumeric data.id in lowercase in the manifest.
  const canonical = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret.trim()).update(canonical).digest("hex");

  const ok =
    expected.length === v1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  if (!ok) {
    // Never log the secret or the digests — only shape info to tell a wrong
    // secret apart from a malformed request.
    console.error("MP webhook: signature mismatch", {
      secretLength: secret.trim().length,
      dataId,
      hasRequestId: !!requestId,
      tsLength: ts.length,
      v1Length: v1.length,
    });
  }
  return ok;
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

  // Legacy IPN notifications ({ resource, topic }) carry no data.id and no
  // signature; the signed Webhooks notification for the same payment arrives
  // separately, so acknowledge and ignore these instead of failing them.
  const legacy = body as { topic?: string; resource?: string } | null;
  if (!body?.data?.id && !request.nextUrl.searchParams.get("data.id") && legacy?.topic && legacy.resource) {
    return NextResponse.json({ ok: true, ignored: `ipn:${legacy.topic}` });
  }

  // The signed manifest uses data.id from the query string; the body's copy
  // is the fallback.
  const paymentId = request.nextUrl.searchParams.get("data.id") ?? body?.data?.id;
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
  if (!secret || !isValidSignature(signatureHeader, requestId, String(paymentId), secret)) {
    console.error(
      `Mercado Pago webhook signature invalid or missing MP_WEBHOOK_SECRET (secret set: ${!!secret})`
    );
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
