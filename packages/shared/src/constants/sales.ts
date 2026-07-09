export const PAYMENT_STATUSES = ["paid", "partial", "unpaid", "overdue"] as const;

export const PAYMENT_STATUS_LABELS = {
  paid: "Pagado",
  partial: "Pago parcial",
  unpaid: "Fiado total",
  overdue: "Vencido",
} as const satisfies Record<PaymentStatus, string>;

export const SALE_ADMIN_STATUSES = ["active", "voided"] as const;

export const SALE_ADMIN_STATUS_LABELS = {
  active: "Activa",
  voided: "Anulada",
} as const satisfies Record<SaleAdminStatus, string>;

export const RETURN_STATUSES = ["return_window", "confirmed", "with_return"] as const;

export const RETURN_STATUS_LABELS = {
  return_window: "En plazo de devolución",
  confirmed: "Confirmada",
  with_return: "Con devolución",
} as const satisfies Record<ReturnStatus, string>;

export const PAYMENT_KINDS = ["initial", "later"] as const;

export const PAYMENT_KIND_LABELS = {
  initial: "Pago inicial",
  later: "Pago posterior",
} as const satisfies Record<PaymentKind, string>;

export const SALE_ITEM_STATUSES = ["sold", "returned", "voided"] as const;

export const SALE_ITEM_STATUS_LABELS = {
  sold: "Vendido",
  returned: "Devuelto",
  voided: "Anulado",
} as const satisfies Record<SaleItemStatus, string>;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type SaleAdminStatus = (typeof SALE_ADMIN_STATUSES)[number];
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type SaleItemStatus = (typeof SALE_ITEM_STATUSES)[number];
