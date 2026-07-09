import type { ProductCategory } from "../constants/products";
import type { ISODateTimeString, MoneyAmount, UUID } from "./common";

export interface CreateProductInput {
  name: string;
  photoPath?: string | null;
  size: string;
  description?: string | null;
  category: ProductCategory;
  subcategory?: string | null;
  purchasePrice: MoneyAmount;
  salePrice: MoneyAmount;
}

export interface CreateSaleInput {
  sellerId: UUID;
  buyerFullName: string;
  buyerPhone: string;
  productIds: UUID[];
  initialPaymentAmount: MoneyAmount;
  saleDate?: ISODateTimeString;
}

export interface RegisterPaymentInput {
  saleId: UUID;
  amount: MoneyAmount;
  paidAt?: ISODateTimeString;
  note?: string | null;
}

export interface RegisterReturnInput {
  saleId: UUID;
  saleItemIds: UUID[];
  refundAmount: MoneyAmount;
  reason?: string | null;
  returnedAt?: ISODateTimeString;
}

export interface ApplyPriceAdjustmentInput {
  productIds: UUID[];
  percentage: number;
  note?: string | null;
}

export interface CreateSellerInput {
  email: string;
  temporaryPassword: string;
  fullName: string;
  color: string;
}
