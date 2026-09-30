const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
};

// Once a sale is paid, the fulfillment stage (processing/shipped/delivered)
// is more useful to a customer than the static "Pagado" payment status.
export function orderStatusLabel(status: string, fulfillmentStatus: string): string {
  if (status === "paid") return FULFILLMENT_LABELS[fulfillmentStatus] ?? fulfillmentStatus;
  return STATUS_LABELS[status] ?? status;
}
