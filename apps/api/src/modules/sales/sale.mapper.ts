import type { ApiRole } from "../users/user.types.js";
import type { ApiSale, ApiSaleItem, SaleItemRow, SaleRow, SaleWithItemsRow } from "./sale.types.js";

export function mapSaleItemRow(row: SaleItemRow, role: ApiRole): ApiSaleItem {
  const item: ApiSaleItem = {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    productName: row.product_name,
    productSize: row.product_size,
    productCategory: row.product_category,
    productSubcategory: row.product_subcategory,
    salePrice: row.sale_price,
    status: row.status,
    returnedAt: row.returned_at,
    createdAt: row.created_at,
  };

  if (role === "owner") {
    item.purchasePrice = row.purchase_price;
  }

  return item;
}

export function mapSaleRow(row: SaleWithItemsRow, role: ApiRole): ApiSale {
  const sale: ApiSale = {
    id: row.id,
    sellerId: row.seller_id,
    buyerFullName: row.buyer_full_name,
    buyerPhone: row.buyer_phone,
    saleDate: row.sale_date,
    dueDate: row.due_date,
    returnDeadline: row.return_deadline,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    pendingAmount: row.pending_amount,
    paymentStatus: row.payment_status,
    returnStatus: row.return_status,
    adminStatus: row.admin_status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.items.map((item) => mapSaleItemRow(item, role)),
  };

  if (role === "owner") {
    sale.totalPurchaseCost = row.total_purchase_cost;
  }

  return sale;
}

export function withItems(sale: SaleRow, items: SaleItemRow[]): SaleWithItemsRow {
  return {
    ...sale,
    items,
  };
}
