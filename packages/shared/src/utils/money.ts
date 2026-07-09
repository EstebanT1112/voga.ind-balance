import { COMMISSION_RATE, CURRENCY_CODE, MONEY_FRACTION_DIGITS } from "../constants/business";

export function assertMoneyAmount(amount: number, fieldName = "amount"): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

export function calculateCommission(collectedAmount: number): number {
  assertMoneyAmount(collectedAmount, "collectedAmount");
  return Math.round(collectedAmount * COMMISSION_RATE);
}

export function calculatePendingAmount(totalAmount: number, paidAmount: number): number {
  assertMoneyAmount(totalAmount, "totalAmount");
  assertMoneyAmount(paidAmount, "paidAmount");

  if (paidAmount > totalAmount) {
    throw new Error("paidAmount cannot exceed totalAmount");
  }

  return totalAmount - paidAmount;
}

export function calculateCollectedProfit(
  paidAmount: number,
  totalAmount: number,
  totalPurchaseCost: number,
): number {
  assertMoneyAmount(paidAmount, "paidAmount");
  assertMoneyAmount(totalAmount, "totalAmount");
  assertMoneyAmount(totalPurchaseCost, "totalPurchaseCost");

  if (totalAmount === 0) {
    return 0;
  }

  const collectedRatio = paidAmount / totalAmount;
  const proportionalPurchaseCost = Math.round(totalPurchaseCost * collectedRatio);

  return paidAmount - proportionalPurchaseCost;
}

export function formatMoney(amount: number): string {
  assertMoneyAmount(amount);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: MONEY_FRACTION_DIGITS,
    maximumFractionDigits: MONEY_FRACTION_DIGITS,
  }).format(amount);
}
