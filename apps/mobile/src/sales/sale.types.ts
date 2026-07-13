import type { ProductCategory } from "../products/product.types";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue";
export type ReturnStatus = "return_window" | "confirmed" | "with_return";
export type SaleAdminStatus = "active" | "voided";
export type SaleItemStatus = "sold" | "returned" | "voided";

export interface SaleItem {
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

export interface Sale {
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
  items: SaleItem[];
}

export interface SalesResponse {
  items: Sale[];
  next: string | null;
}

export interface SellerDashboard {
  monthlySales: Array<{
    amount: number;
    month: string;
  }>;
  totals: {
    collectedAmount: number;
    commissionAmount: number;
    pendingAmount: number;
    saleCount: number;
    soldAmount: number;
  };
}

export interface CreateSaleInput {
  sellerId?: string;
  buyerFullName: string;
  buyerPhone: string;
  productIds: string[];
  initialPaymentAmount: number;
  saleDate?: string;
}
