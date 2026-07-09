import type { ApiPayment, PaymentRow } from "./payment.types.js";

export function mapPaymentRow(row: PaymentRow): ApiPayment {
  return {
    id: row.id,
    saleId: row.sale_id,
    registeredBy: row.registered_by,
    amount: row.amount,
    kind: row.kind,
    paidAt: row.paid_at,
    note: row.note,
    createdAt: row.created_at,
  };
}
