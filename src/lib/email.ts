import { Resend } from "resend";

import { formatPrice } from "@/lib/format";

export interface OrderReceiptItem {
  name: string;
  milliliters: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderReceiptEmail {
  toEmail: string;
  toName: string;
  saleId: string;
  currency: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: OrderReceiptItem[];
  shippingAddressLine: string | null;
}

// Resend needs RESEND_API_KEY + a sender verified for RESEND_FROM_EMAIL's
// domain (Settings > Domains in the Resend dashboard). Until both are set,
// this logs instead of sending so checkout/payment confirmation never fails
// because of email — see the try/catch around every call site.
export async function sendOrderReceiptEmail(order: OrderReceiptEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(
      `[email] RESEND_API_KEY/RESEND_FROM_EMAIL not configured — skipping receipt email for sale ${order.saleId}`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const orderNumber = order.saleId.slice(0, 8);

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e3e3df;">
            ${escapeHtml(item.name)} · ${item.milliliters} ml<br />
            <span style="color:#76777b;font-size:13px;">
              ${item.quantity} × ${formatPrice(item.unitPrice, order.currency)}
            </span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e3e3df;text-align:right;">
            ${formatPrice(item.lineTotal, order.currency)}
          </td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#1a1c1a;">
      <h1 style="font-size:22px;">¡Gracias por tu compra, ${escapeHtml(order.toName)}!</h1>
      <p style="color:#45474a;">Pedido #${orderNumber}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        ${itemsHtml}
      </table>
      <table style="width:100%;margin-top:12px;">
        <tr>
          <td style="color:#45474a;font-size:13px;">Subtotal</td>
          <td style="color:#45474a;font-size:13px;text-align:right;">
            ${formatPrice(order.subtotal, order.currency)}
          </td>
        </tr>
        <tr>
          <td style="color:#45474a;font-size:13px;">Envío</td>
          <td style="color:#45474a;font-size:13px;text-align:right;">
            ${order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost, order.currency)}
          </td>
        </tr>
        <tr>
          <td style="font-weight:bold;padding-top:6px;">Total</td>
          <td style="font-weight:bold;text-align:right;padding-top:6px;">
            ${formatPrice(order.total, order.currency)}
          </td>
        </tr>
      </table>
      ${
        order.shippingAddressLine
          ? `<p style="margin-top:24px;color:#45474a;font-size:13px;">
              <strong>Enviado a:</strong><br />${escapeHtml(order.shippingAddressLine)}
             </p>`
          : ""
      }
    </div>`;

  const { error } = await resend.emails.send({
    from,
    to: order.toEmail,
    subject: `Tu pedido #${orderNumber} · Aura Research Parfums`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
