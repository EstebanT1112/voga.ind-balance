import { supabaseAdmin } from "../../lib/supabase.js";
import type { RegisterReturnData, ReturnItemRow, ReturnListFilters, ReturnRow, ReturnWithItemsRow } from "./return.types.js";
import { withItems } from "./return.mapper.js";

const returnSelect = "id, sale_id, registered_by, refund_amount, reason, returned_at, created_at";

const returnItemSelect =
  "id, return_id, sale_item_id, product_id, sale_price, purchase_price, created_at";

async function listItemsByReturnIds(returnIds: string[]): Promise<ReturnItemRow[]> {
  if (returnIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("return_items")
    .select(returnItemSelect)
    .in("return_id", returnIds)
    .order("created_at", { ascending: true })
    .returns<ReturnItemRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

function attachItems(returns: ReturnRow[], items: ReturnItemRow[]): ReturnWithItemsRow[] {
  const itemsByReturn = new Map<string, ReturnItemRow[]>();

  for (const item of items) {
    const current = itemsByReturn.get(item.return_id) ?? [];
    current.push(item);
    itemsByReturn.set(item.return_id, current);
  }

  return returns.map((returnRow) => withItems(returnRow, itemsByReturn.get(returnRow.id) ?? []));
}

export const returnRepository = {
  async list(filters: ReturnListFilters, sellerId?: string): Promise<ReturnWithItemsRow[]> {
    let query = sellerId
      ? supabaseAdmin
          .from("returns")
          .select(`${returnSelect}, sales!inner(seller_id)`)
          .eq("sales.seller_id", sellerId)
      : supabaseAdmin.from("returns").select(returnSelect);

    query = query.order("returned_at", {
      ascending: false,
    });

    if (filters.saleId) {
      query = query.eq("sale_id", filters.saleId);
    }

    if (filters.registeredBy) {
      query = query.eq("registered_by", filters.registeredBy);
    }

    if (filters.from) {
      query = query.gte("returned_at", filters.from);
    }

    if (filters.to) {
      query = query.lte("returned_at", filters.to);
    }

    const { data: returns, error } = await query.returns<ReturnRow[]>();

    if (error) {
      throw error;
    }

    const items = await listItemsByReturnIds(returns.map((returnRow) => returnRow.id));
    return attachItems(returns, items);
  },

  async findById(id: string): Promise<ReturnWithItemsRow | null> {
    const { data: returnRow, error } = await supabaseAdmin
      .from("returns")
      .select(returnSelect)
      .eq("id", id)
      .maybeSingle<ReturnRow>();

    if (error) {
      throw error;
    }

    if (!returnRow) {
      return null;
    }

    const items = await listItemsByReturnIds([returnRow.id]);
    return withItems(returnRow, items);
  },

  async register(data: RegisterReturnData, registeredBy: string): Promise<string> {
    const { data: returnId, error } = await supabaseAdmin.rpc("register_return", {
      p_sale_id: data.saleId,
      p_registered_by: registeredBy,
      p_sale_item_ids: data.saleItemIds,
      p_refund_amount: data.refundAmount,
      p_reason: data.reason ?? null,
      p_returned_at: data.returnedAt ?? new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return returnId as string;
  },
};
