export interface ReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  productId: string;
  salePrice: number;
  purchasePrice?: number;
  createdAt: string;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  registeredBy: string;
  refundAmount: number;
  reason: string | null;
  returnedAt: string;
  createdAt: string;
  items: ReturnItem[];
}

export interface ReturnsResponse {
  items: SaleReturn[];
  next: string | null;
}

export interface CreateReturnInput {
  saleId: string;
  saleItemIds: string[];
  reason?: string | null;
}
