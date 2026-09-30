// Mercado Pago Checkout Pro (hosted redirect) client.
// Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing
//
// Checkout Pro only supports the Preferences API (`/checkout/preferences`) —
// there's no Orders API mode for it. Always redirect to the returned
// `init_point`, never `sandbox_init_point` (Mercado Pago no longer has a
// separate sandbox environment — a test-user account's real APP_USR-
// credentials hit the same production API).
//
// The webhook handler (src/app/api/webhooks/mercadopago/route.ts) validates
// the `x-signature` header (HMAC-SHA256, secret from MP_WEBHOOK_SECRET) and
// then re-fetches the payment by id via getPayment() before acting on it —
// it never trusts the notification body's own fields beyond the id.

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

export interface MercadoPagoPreferenceRequest {
  amount: number;
  currency: string;
  description: string;
  externalReference: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
  payer: { name: string; email: string };
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
}

function client(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing MP_ACCESS_TOKEN environment variable");
  return new MercadoPagoConfig({ accessToken });
}

// `auto_return` is only valid alongside a public HTTPS `back_urls.success` —
// Mercado Pago rejects the preference outright if it's set with a localhost
// success URL, so it's only included when the success URL looks public.
function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export async function createPreference(
  req: MercadoPagoPreferenceRequest
): Promise<MercadoPagoPreferenceResponse> {
  const preference = new Preference(client());
  const result = await preference.create({
    body: {
      items: [
        {
          id: req.externalReference,
          title: req.description,
          quantity: 1,
          unit_price: req.amount,
          currency_id: req.currency,
        },
      ],
      payer: { name: req.payer.name, email: req.payer.email },
      back_urls: {
        success: req.successUrl,
        failure: req.failureUrl,
        pending: req.pendingUrl,
      },
      ...(isPublicHttpsUrl(req.successUrl) ? { auto_return: "approved" as const } : {}),
      notification_url: req.notificationUrl,
      external_reference: req.externalReference,
      statement_descriptor: "AURA PARFUMS",
    },
  });

  if (!result.id || !result.init_point) {
    throw new Error("Mercado Pago create preference returned no id/init_point");
  }
  return { id: result.id, init_point: result.init_point };
}

export async function getPayment(paymentId: string) {
  const payment = new Payment(client());
  return payment.get({ id: paymentId });
}

/**
 * Payment statuses (https://www.mercadopago.com.mx/developers/es/docs/checkout-api/response-handling/collection-results)
 * that mean the customer's payment was captured — everything else keeps the
 * order pending.
 */
export const MP_PAID_STATUSES = new Set(["approved"]);

/**
 * Statuses that mean the payment is definitively dead and will never
 * complete — anything NOT in this set and NOT in MP_PAID_STATUSES (e.g.
 * "pending", "in_process", "authorized") is still in flight, not a
 * rejection. fulfillMercadoPagoPayment() only acts once per payment
 * (payment.status must still be "pending" in our own `payments` table), so
 * treating every non-approved status as final would risk discarding a sale
 * whose payment is merely still being reviewed.
 */
export const MP_TERMINAL_REJECTED_STATUSES = new Set(["rejected", "cancelled"]);
