import { PAYMENT_DUE_DAYS, RETURN_WINDOW_DAYS } from "../constants/business";
import type { PaymentStatus, ReturnStatus } from "../constants/sales";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getPaymentDueDate(saleDate: Date): Date {
  return addDays(saleDate, PAYMENT_DUE_DAYS);
}

export function getReturnDeadline(saleDate: Date): Date {
  return addDays(saleDate, RETURN_WINDOW_DAYS);
}

export function calculatePaymentStatus(
  paidAmount: number,
  totalAmount: number,
  dueDate: Date,
  today = new Date(),
): PaymentStatus {
  if (paidAmount >= totalAmount) {
    return "paid";
  }

  if (dueDate < today) {
    return "overdue";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  return "unpaid";
}

export function calculateReturnStatus(
  hasReturnedItems: boolean,
  returnDeadline: Date,
  today = new Date(),
): ReturnStatus {
  if (hasReturnedItems) {
    return "with_return";
  }

  if (returnDeadline < today) {
    return "confirmed";
  }

  return "return_window";
}
