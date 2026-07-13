export type PaymentKind = "initial" | "later";

export interface PaymentRow {
  id: string;
  sale_id: string;
  registered_by: string;
  amount: number;
  kind: PaymentKind;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface PaymentRefundRow {
  sale_id: string;
  refund_amount: number;
  returned_at: string;
}

export interface ApiPayment {
  id: string;
  saleId: string;
  registeredBy: string;
  amount: number;
  kind: PaymentKind;
  paidAt: string;
  note: string | null;
  createdAt: string;
}

export interface PaymentListFilters {
  saleId?: string;
  registeredBy?: string;
  kind?: PaymentKind;
  from?: string;
  to?: string;
}

export interface RegisterPaymentData {
  saleId: string;
  amount: number;
  paidAt?: string;
  note?: string | null;
}
