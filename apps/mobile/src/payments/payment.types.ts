export type PaymentKind = "initial" | "later";

export interface Payment {
  id: string;
  saleId: string;
  registeredBy: string;
  amount: number;
  kind: PaymentKind;
  paidAt: string;
  note: string | null;
  createdAt: string;
}

export interface PaymentsResponse {
  items: Payment[];
  next: string | null;
}
