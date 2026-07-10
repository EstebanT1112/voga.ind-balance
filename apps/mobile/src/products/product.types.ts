export type ProductStatus = "available" | "sold";
export type ProductCategory = "upper" | "lower" | "lingerie";

export interface Product {
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

export interface ProductsResponse {
  items: Product[];
  next: string | null;
}

export interface CreateProductInput {
  name: string;
  photoPath?: string | null;
  size: string;
  description?: string | null;
  category: ProductCategory;
  subcategory?: string | null;
  purchasePrice: number;
  salePrice: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;
