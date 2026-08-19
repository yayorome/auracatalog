// Clip Checkout (Redirected Checkout API) client.
// Docs: https://developer.clip.mx/reference/introduccion-a-clip-checkout
//       https://developer.clip.mx/reference/createnewpaymentlink
//
// Auth: `Authorization: Basic base64(<api_key>:<secret_key>)` — see
// https://developer.clip.mx/reference/token-de-autenticacion. CLIP_API_KEY
// below is expected to already be that base64 "api_key:secret_key" token.
//
// The webhook docs (https://developer.clip.mx/reference/checkout-webhook)
// don't document a request-signing scheme, so the webhook handler in
// src/app/api/webhooks/clip/route.ts does NOT trust the callback body
// as-is — it re-fetches the payment request by id from this API before
// marking a sale paid. Re-check Clip's docs for a signature header before
// relaxing that.

const CLIP_API_BASE = "https://api.payclip.com";

export interface ClipPaymentRequest {
  amount: number;
  currency: string;
  purchaseDescription: string;
  externalReference: string;
  successUrl: string;
  errorUrl: string;
  defaultUrl: string;
  webhookUrl: string;
  customer: { name: string; email: string };
}

export interface ClipPaymentLinkResponse {
  payment_request_id: string;
  status: string;
  payment_request_url: string;
}

function authHeader(): string {
  const token = process.env.CLIP_API_KEY;
  if (!token) throw new Error("Missing CLIP_API_KEY environment variable");
  return `Basic ${token}`;
}

export async function createPaymentLink(
  req: ClipPaymentRequest
): Promise<ClipPaymentLinkResponse> {
  const res = await fetch(`${CLIP_API_BASE}/v2/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: req.amount,
      currency: req.currency,
      purchase_description: req.purchaseDescription,
      redirection_url: {
        success: req.successUrl,
        error: req.errorUrl,
        default: req.defaultUrl,
      },
      webhook_url: req.webhookUrl,
      metadata: {
        external_reference: req.externalReference,
        customer_info: { name: req.customer.name, email: req.customer.email },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Clip create payment link failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getPaymentRequest(
  paymentRequestId: string
): Promise<ClipPaymentLinkResponse & { resource_status?: string }> {
  const res = await fetch(`${CLIP_API_BASE}/v2/checkout/${paymentRequestId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    throw new Error(`Clip get payment request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Statuses that mean the customer completed and paid — everything else keeps the order pending. */
export const CLIP_PAID_STATUSES = new Set(["COMPLETED"]);
