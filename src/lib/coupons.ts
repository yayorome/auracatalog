import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";

export type DiscountType = "percentage" | "fixed" | "amount";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number | string;
  min_order_amount: number | string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
}

export interface ValidatedCouponResult {
  valid: boolean;
  error?: string;
  coupon?: AppliedCoupon;
}

/**
 * Computes the discount in currency units for a given subtotal.
 * Percentage discounts are rounded to 2 decimals.
 * The discount never exceeds the subtotal.
 */
export function calculateDiscount(
  discountType: DiscountType,
  discountValue: number,
  subtotal: number
): number {
  if (subtotal <= 0 || discountValue <= 0) return 0;

  if (discountType === "percentage") {
    const raw = (subtotal * discountValue) / 100;
    const rounded = Math.round(raw * 100) / 100;
    return Math.min(subtotal, rounded);
  }

  // Fixed amount
  return Math.min(subtotal, Math.round(discountValue * 100) / 100);
}

/**
 * Validates a coupon code against the database (via supabaseAdmin)
 * and returns the calculated discount if valid.
 */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<ValidatedCouponResult> {
  const normalizedCode = (code ?? "").trim();
  if (!normalizedCode) {
    return { valid: false, error: "Ingresa un código de cupón." };
  }

  if (subtotal <= 0) {
    return { valid: false, error: "El carrito está vacío." };
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select(
      "id, code, description, discount_type, discount_value, min_order_amount, max_uses, uses_count, is_active, expires_at"
    )
    .ilike("code", normalizedCode)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, error: "El cupón no existe o no es válido." };
  }

  if (!coupon.is_active) {
    return { valid: false, error: "Este cupón ya no está activo." };
  }

  if (coupon.expires_at) {
    const expiration = new Date(coupon.expires_at).getTime();
    if (!Number.isNaN(expiration) && expiration < Date.now()) {
      return { valid: false, error: "Este cupón ha expirado." };
    }
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, error: "Este cupón ha alcanzado el límite de usos permitidos." };
  }

  const minOrderAmount = Number(coupon.min_order_amount) || 0;
  if (subtotal < minOrderAmount) {
    return {
      valid: false,
      error: `El pedido mínimo para aplicar este cupón es de ${formatPrice(minOrderAmount, "MXN")}.`,
    };
  }

  const discountValue = Number(coupon.discount_value);
  const discountType = coupon.discount_type as DiscountType;
  const discountAmount = calculateDiscount(discountType, discountValue, subtotal);

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType,
      discountValue,
      discountAmount,
    },
  };
}
