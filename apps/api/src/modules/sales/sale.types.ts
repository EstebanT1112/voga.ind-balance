import type { ProductCategory } from "../products/product.types.js";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue";
export type ReturnStatus = "return_window" | "confirmed" | "with_return";
export type SaleAdminStatus = "active" | "voided";
export type SaleItemStatus = "sold" | "returned" | "voided";

export interface SaleRow {
  id: string;
  seller_id: string;
  buyer_full_name: string;
  buyer_phone: string;
  sale_date: string;
  due_date: string;
  return_deadline: string;
  total_amount: number;
  total_purchase_cost: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: PaymentStatus;
  return_status: ReturnStatus;
  admin_status: SaleAdminStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_size: string;
  product_category: ProductCategory;
  product_subcategory: string | null;
  purchase_price: number;
  sale_price: number;
  status: SaleItemStatus;
  returned_at: string | null;
  created_at: string;
}

export interface SaleWithItemsRow extends SaleRow {
  items: SaleItemRow[];
}

export interface ApiSaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productSize: string;
  productCategory: ProductCategory;
  productSubcategory: string | null;
  purchasePrice?: number;
  salePrice: number;
  status: SaleItemStatus;
  returnedAt: string | null;
  createdAt: string;
}

export interface ApiSale {
  id: string;
  sellerId: string;
  buyerFullName: string;
  buyerPhone: string;
  saleDate: string;
  dueDate: string;
  returnDeadline: string;
  totalAmount: number;
  totalPurchaseCost?: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  returnStatus: ReturnStatus;
  adminStatus: SaleAdminStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: ApiSaleItem[];
}

export interface SaleListFilters {
  sellerId?: string;
  paymentStatus?: PaymentStatus;
  returnStatus?: ReturnStatus;
  adminStatus?: SaleAdminStatus;
  from?: string;
  to?: string;
}

export interface CreateSaleData {
  sellerId?: string;
  buyerFullName: string;
  buyerPhone: string;
  productIds: string[];
  initialPaymentAmount: number;
  saleDate?: string;
}
