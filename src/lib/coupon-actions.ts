"use server";

import { validateCoupon, type ValidatedCouponResult } from "@/lib/coupons";

export async function validateCouponAction(
  code: string,
  subtotal: number
): Promise<ValidatedCouponResult> {
  return validateCoupon(code, subtotal);
}
