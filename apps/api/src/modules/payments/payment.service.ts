import { HttpError } from "../../lib/http-error.js";
import { saleRepository } from "../sales/sale.repository.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapPaymentRow } from "./payment.mapper.js";
import { paymentRepository } from "./payment.repository.js";
import type { ApiPayment, PaymentListFilters, PaymentRefundRow, PaymentRow, RegisterPaymentData } from "./payment.types.js";

function getSupabaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Could not register payment";
}

async function assertCanAccessPayment(payment: PaymentRow, profile: ApiProfile): Promise<void> {
  if (profile.role === "owner") {
    return;
  }

  const sale = await saleRepository.findById(payment.sale_id);

  if (!sale || sale.seller_id !== profile.id) {
    throw new HttpError(404, "not_found", "Payment not found");
  }
}

function applyRefunds(payments: PaymentRow[], refunds: PaymentRefundRow[]): Map<string, number> {
  const balances = new Map(payments.map((payment) => [payment.id, payment.amount]));
  const paymentsBySale = new Map<string, PaymentRow[]>();

  for (const payment of payments) {
    const salePayments = paymentsBySale.get(payment.sale_id) ?? [];
    salePayments.push(payment);
    paymentsBySale.set(payment.sale_id, salePayments);
  }

  for (const salePayments of paymentsBySale.values()) {
    salePayments.sort((left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime());
  }

  for (const refund of refunds) {
    let remainingRefund = refund.refund_amount;
    const returnedAt = new Date(refund.returned_at).getTime();

    for (const payment of paymentsBySale.get(refund.sale_id) ?? []) {
      if (remainingRefund <= 0 || new Date(payment.paid_at).getTime() > returnedAt) {
        continue;
      }

      const currentBalance = balances.get(payment.id) ?? 0;
      const refundedAmount = Math.min(currentBalance, remainingRefund);
      balances.set(payment.id, currentBalance - refundedAmount);
      remainingRefund -= refundedAmount;
    }
  }

  return balances;
}

async function getNetPayments(payments: PaymentRow[]): Promise<PaymentRow[]> {
  const saleIds = [...new Set(payments.map((payment) => payment.sale_id))];

  if (saleIds.length === 0) {
    return [];
  }

  const [allPayments, refunds] = await Promise.all([
    paymentRepository.listBySaleIds(saleIds),
    paymentRepository.listRefundsBySaleIds(saleIds),
  ]);
  const balances = applyRefunds(allPayments, refunds);

  return payments.flatMap((payment) => {
    const amount = balances.get(payment.id) ?? payment.amount;
    return amount > 0 ? [{ ...payment, amount }] : [];
  });
}

export const paymentService = {
  async list(filters: PaymentListFilters, profile: ApiProfile): Promise<ApiPayment[]> {
    const payments = await paymentRepository.list(
      filters,
      profile.role === "seller" ? profile.id : undefined,
    );

    return (await getNetPayments(payments)).map(mapPaymentRow);
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiPayment> {
    const payment = await paymentRepository.findById(id);

    if (!payment) {
      throw new HttpError(404, "not_found", "Payment not found");
    }

    await assertCanAccessPayment(payment, profile);
    const [netPayment] = await getNetPayments([payment]);

    if (!netPayment) {
      throw new HttpError(404, "not_found", "Payment not found");
    }

    return mapPaymentRow(netPayment);
  },

  async register(data: RegisterPaymentData, profile: ApiProfile): Promise<ApiPayment> {
    try {
      const paymentId = await paymentRepository.register(data, profile.id);
      return await this.getById(paymentId, profile);
    } catch (error) {
      throw new HttpError(400, "bad_request", getSupabaseErrorMessage(error));
    }
  },
};
