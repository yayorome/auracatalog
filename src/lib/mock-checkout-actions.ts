"use server";

import { redirect } from "next/navigation";

import { fulfillMercadoPagoPayment } from "@/lib/checkout-fulfillment";

// Only reachable from /checkout/mock, which the checkout action only
// redirects to when MP_ACCESS_TOKEN is unset — lets the full order flow be
// exercised locally before real Mercado Pago credentials are available.
export async function simulateMercadoPagoPaymentAction(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!saleId) redirect("/");

  const status = outcome === "approve" ? "approved" : "rejected";
  try {
    await fulfillMercadoPagoPayment(saleId, status, { mock: true, status });
  } catch (err) {
    // A double-click/back-button resubmit after the sale was already
    // discarded or settled by the first click throws here (e.g. "No
    // payment row found") — degrade to /checkout/error like the real
    // webhook route does instead of an unhandled Server Action exception.
    console.error("mock checkout fulfillment failed", err);
    redirect(`/checkout/error?sale=${saleId}`);
  }

  redirect(
    outcome === "approve"
      ? `/checkout/success?sale=${saleId}`
      : `/checkout/error?sale=${saleId}`
  );
}
