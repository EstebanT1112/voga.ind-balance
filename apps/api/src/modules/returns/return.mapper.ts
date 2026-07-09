import type { ApiRole } from "../users/user.types.js";
import type { ApiReturn, ApiReturnItem, ReturnItemRow, ReturnRow, ReturnWithItemsRow } from "./return.types.js";

export function mapReturnItemRow(row: ReturnItemRow, role: ApiRole): ApiReturnItem {
  const item: ApiReturnItem = {
    id: row.id,
    returnId: row.return_id,
    saleItemId: row.sale_item_id,
    productId: row.product_id,
    salePrice: row.sale_price,
    createdAt: row.created_at,
  };

  if (role === "owner") {
    item.purchasePrice = row.purchase_price;
  }

  return item;
}

export function mapReturnRow(row: ReturnWithItemsRow, role: ApiRole): ApiReturn {
  return {
    id: row.id,
    saleId: row.sale_id,
    registeredBy: row.registered_by,
    refundAmount: row.refund_amount,
    reason: row.reason,
    returnedAt: row.returned_at,
    createdAt: row.created_at,
    items: row.items.map((item) => mapReturnItemRow(item, role)),
  };
}

export function withItems(returnRow: ReturnRow, items: ReturnItemRow[]): ReturnWithItemsRow {
  return {
    ...returnRow,
    items,
  };
}
