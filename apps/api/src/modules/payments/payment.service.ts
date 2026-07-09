import { HttpError } from "../../lib/http-error.js";
import { saleRepository } from "../sales/sale.repository.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapPaymentRow } from "./payment.mapper.js";
import { paymentRepository } from "./payment.repository.js";
import type { ApiPayment, PaymentListFilters, PaymentRow, RegisterPaymentData } from "./payment.types.js";

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

export const paymentService = {
  async list(filters: PaymentListFilters, profile: ApiProfile): Promise<ApiPayment[]> {
    const payments = await paymentRepository.list(
      filters,
      profile.role === "seller" ? profile.id : undefined,
    );

    return payments.map(mapPaymentRow);
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiPayment> {
    const payment = await paymentRepository.findById(id);

    if (!payment) {
      throw new HttpError(404, "not_found", "Payment not found");
    }

    await assertCanAccessPayment(payment, profile);
    return mapPaymentRow(payment);
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
