import type { ProductCategory, ProductStatus } from "../constants/products";
import type { UserRole } from "../constants/roles";
import type {
  PaymentKind,
  PaymentStatus,
  ReturnStatus,
  SaleAdminStatus,
  SaleItemStatus,
} from "../constants/sales";
import type { ISODateString, ISODateTimeString, MoneyAmount, UUID } from "./common";

export interface Profile {
  id: UUID;
  role: UserRole;
  fullName: string;
  color: string | null;
  active: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface Product {
  id: UUID;
  name: string;
  photoPath: string | null;
  size: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  purchasePrice: MoneyAmount;
  salePrice: MoneyAmount;
  status: ProductStatus;
  createdBy: UUID | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type SellerVisibleProduct = Omit<Product, "purchasePrice" | "createdBy">;

export interface Sale {
  id: UUID;
  sellerId: UUID;
  buyerFullName: string;
  buyerPhone: string;
  saleDate: ISODateTimeString;
  dueDate: ISODateString;
  returnDeadline: ISODateString;
  totalAmount: MoneyAmount;
  totalPurchaseCost: MoneyAmount;
  paidAmount: MoneyAmount;
  pendingAmount: MoneyAmount;
  paymentStatus: PaymentStatus;
  returnStatus: ReturnStatus;
  adminStatus: SaleAdminStatus;
  createdBy: UUID;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface SaleItem {
  id: UUID;
  saleId: UUID;
  productId: UUID;
  productName: string;
  productSize: string;
  productCategory: ProductCategory;
  productSubcategory: string | null;
  purchasePrice: MoneyAmount;
  salePrice: MoneyAmount;
  status: SaleItemStatus;
  returnedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
}

export interface Payment {
  id: UUID;
  saleId: UUID;
  registeredBy: UUID;
  amount: MoneyAmount;
  kind: PaymentKind;
  paidAt: ISODateTimeString;
  note: string | null;
  createdAt: ISODateTimeString;
}

export interface Return {
  id: UUID;
  saleId: UUID;
  registeredBy: UUID;
  refundAmount: MoneyAmount;
  reason: string | null;
  returnedAt: ISODateTimeString;
  createdAt: ISODateTimeString;
}

export interface ReturnItem {
  id: UUID;
  returnId: UUID;
  saleItemId: UUID;
  productId: UUID;
  salePrice: MoneyAmount;
  purchasePrice: MoneyAmount;
  createdAt: ISODateTimeString;
}

export interface PriceAdjustment {
  id: UUID;
  createdBy: UUID;
  percentage: number;
  note: string | null;
  createdAt: ISODateTimeString;
}

export interface PriceAdjustmentItem {
  id: UUID;
  priceAdjustmentId: UUID;
  productId: UUID;
  oldSalePrice: MoneyAmount;
  newSalePrice: MoneyAmount;
  createdAt: ISODateTimeString;
}
