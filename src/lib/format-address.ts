// Common shape of the address fields shared by clients.*, sales.shipping_address
// (jsonb snapshot), and any other struct built from the same postal-code form
// (checkout-form.tsx, account-actions.ts). All nullable here since some
// callers (ClientProfile) allow an incomplete/no-address-yet profile, while
// others (a completed checkout's shipping_address snapshot) guarantee the
// required fields are non-null — a stricter, non-null field type is still
// assignable to this shape.
export interface AddressFields {
  street: string | null;
  exterior_number: string | null;
  interior_number: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  municipality: string | null;
  city: string | null;
  state: string | null;
}

// Used everywhere an address needs to render as a compact human-readable
// line: the receipt email, the order-detail page, and the checkout form's
// "ship to this saved address" preview. Keep these in sync — a change here
// updates all three at once instead of drifting between copies.
export function formatAddressLines(address: AddressFields): string {
  const line1 = [address.street, address.exterior_number].filter(Boolean).join(" ");
  const line1WithInterior = address.interior_number
    ? `${line1} Int. ${address.interior_number}`
    : line1;
  const line2 = [address.neighborhood, address.postal_code].filter(Boolean).join(", ");
  const line3 = [address.municipality || address.city, address.state]
    .filter(Boolean)
    .join(", ");
  return [line1WithInterior, line2, line3].filter(Boolean).join(" · ");
}
