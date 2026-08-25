"use server";

import { redirect } from "next/navigation";

import { fulfillClipPayment } from "@/lib/checkout-fulfillment";

// Only reachable from /checkout/mock, which the checkout action only
// redirects to when CLIP_API_KEY is unset — lets the full order flow be
// exercised locally before real Clip credentials are available.
export async function simulateClipPaymentAction(formData: FormData) {
  const saleId = String(formData.get("saleId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!saleId) redirect("/");

  const status = outcome === "approve" ? "CHECKOUT_COMPLETED" : "CHECKOUT_CANCELLED";
  await fulfillClipPayment(saleId, status, { mock: true, status });

  redirect(
    outcome === "approve"
      ? `/checkout/success?sale=${saleId}`
      : `/checkout/error?sale=${saleId}`
  );
}
