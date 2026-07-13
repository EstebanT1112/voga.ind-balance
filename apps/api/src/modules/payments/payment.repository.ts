import { supabaseAdmin } from "../../lib/supabase.js";
import type { PaymentListFilters, PaymentRefundRow, PaymentRow, RegisterPaymentData } from "./payment.types.js";

const paymentSelect = "id, sale_id, registered_by, amount, kind, paid_at, note, created_at";
const paymentWithSaleSelect = `${paymentSelect}, sales!inner(seller_id)`;

export const paymentRepository = {
  async list(filters: PaymentListFilters, sellerId?: string): Promise<PaymentRow[]> {
    let query = supabaseAdmin
      .from("payments")
      .select(paymentWithSaleSelect);

    if (sellerId) {
      query = query.eq("sales.seller_id", sellerId);
    }

    query = query.order("paid_at", {
      ascending: false,
    });

    if (filters.saleId) {
      query = query.eq("sale_id", filters.saleId);
    }

    if (filters.registeredBy) {
      query = query.eq("registered_by", filters.registeredBy);
    }

    if (filters.kind) {
      query = query.eq("kind", filters.kind);
    }

    if (filters.from) {
      query = query.gte("paid_at", filters.from);
    }

    if (filters.to) {
      query = query.lte("paid_at", filters.to);
    }

    const { data, error } = await query.returns<PaymentRow[]>();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<PaymentRow | null> {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(paymentWithSaleSelect)
      .eq("id", id)
      .maybeSingle<PaymentRow>();

    if (error) {
      throw error;
    }

    return data;
  },

  async listBySaleIds(saleIds: string[]): Promise<PaymentRow[]> {
    if (saleIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select(paymentSelect)
      .in("sale_id", saleIds)
      .order("paid_at", { ascending: false })
      .returns<PaymentRow[]>();

    if (error) {
      throw error;
    }

    return data;
  },

  async listRefundsBySaleIds(saleIds: string[]): Promise<PaymentRefundRow[]> {
    if (saleIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("returns")
      .select("sale_id, refund_amount, returned_at")
      .in("sale_id", saleIds)
      .order("returned_at", { ascending: true })
      .returns<PaymentRefundRow[]>();

    if (error) {
      throw error;
    }

    return data;
  },

  async register(data: RegisterPaymentData, registeredBy: string): Promise<string> {
    const { data: paymentId, error } = await supabaseAdmin.rpc("register_payment", {
      p_sale_id: data.saleId,
      p_registered_by: registeredBy,
      p_amount: data.amount,
      p_paid_at: data.paidAt ?? new Date().toISOString(),
      p_note: data.note ?? null,
    });

    if (error) {
      throw error;
    }

    return paymentId as string;
  },
};
