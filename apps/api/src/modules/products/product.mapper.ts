import type { ApiRole } from "../users/user.types.js";
import type { ApiProduct, ProductRow } from "./product.types.js";

export function mapProductRow(row: ProductRow, role: ApiRole): ApiProduct {
  const product: ApiProduct = {
    id: row.id,
    name: row.name,
    photoPath: row.photo_path,
    size: row.size,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    salePrice: row.sale_price,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (role === "owner") {
    product.purchasePrice = row.purchase_price;
    product.createdBy = row.created_by;
  }

  return product;
}

export function toProductInsert(data: import("./product.types.js").CreateProductData, createdBy: string) {
  return {
    name: data.name.trim(),
    photo_path: data.photoPath ?? null,
    size: data.size.trim(),
    description: data.description?.trim() || null,
    category: data.category,
    subcategory: data.subcategory?.trim() || null,
    purchase_price: data.purchasePrice,
    sale_price: data.salePrice,
    created_by: createdBy,
  };
}

export function toProductUpdate(data: import("./product.types.js").UpdateProductData) {
  return {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.photoPath !== undefined ? { photo_path: data.photoPath } : {}),
    ...(data.size !== undefined ? { size: data.size.trim() } : {}),
    ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.subcategory !== undefined ? { subcategory: data.subcategory?.trim() || null } : {}),
    ...(data.purchasePrice !== undefined ? { purchase_price: data.purchasePrice } : {}),
    ...(data.salePrice !== undefined ? { sale_price: data.salePrice } : {}),
  };
}
