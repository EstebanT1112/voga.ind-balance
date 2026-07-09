export interface ReturnRow {
  id: string;
  sale_id: string;
  registered_by: string;
  refund_amount: number;
  reason: string | null;
  returned_at: string;
  created_at: string;
}

export interface ReturnItemRow {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string;
  sale_price: number;
  purchase_price: number;
  created_at: string;
}

export interface ReturnWithItemsRow extends ReturnRow {
  items: ReturnItemRow[];
}

export interface ApiReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  salePrice: number;
  purchasePrice?: number;
  createdAt: string;
}

export interface ApiReturn {
  id: string;
  saleId: string;
  registeredBy: string;
  refundAmount: number;
  reason: string | null;
  returnedAt: string;
  createdAt: string;
  items: ApiReturnItem[];
}

export interface ReturnListFilters {
  saleId?: string;
  registeredBy?: string;
  from?: string;
  to?: string;
}

export interface RegisterReturnData {
  saleId: string;
  saleItemIds: string[];
  refundAmount: number;
  reason?: string | null;
  returnedAt?: string;
}
