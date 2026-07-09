export type ProductStatus = "available" | "sold";
export type ProductCategory = "upper" | "lower" | "lingerie";

export interface ProductRow {
  id: string;
  name: string;
  photo_path: string | null;
  size: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  purchase_price: number;
  sale_price: number;
  status: ProductStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiProduct {
  id: string;
  name: string;
  photoPath: string | null;
  size: string;
  description: string | null;
  category: ProductCategory;
  subcategory: string | null;
  salePrice: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  purchasePrice?: number;
  createdBy?: string | null;
}

export interface ProductListFilters {
  status?: ProductStatus;
  category?: ProductCategory;
  search?: string;
}

export interface CreateProductData {
  name: string;
  photoPath?: string | null;
  size: string;
  description?: string | null;
  category: ProductCategory;
  subcategory?: string | null;
  purchasePrice: number;
  salePrice: number;
}

export type UpdateProductData = Partial<CreateProductData>;
