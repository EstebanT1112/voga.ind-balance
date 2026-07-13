import { HttpError } from "../../lib/http-error.js";
import { expenseRepository } from "../expenses/expense.repository.js";
import { PRODUCT_EXPENSE_CATEGORY, PRODUCT_EXPENSE_NOTE } from "../expenses/expense.types.js";
import type { ApiProfile } from "../users/user.types.js";
import { mapProductRow } from "./product.mapper.js";
import { productRepository } from "./product.repository.js";
import type {
  ApiProduct,
  CreateProductData,
  ProductListFilters,
  UpdateProductData,
} from "./product.types.js";

function assertOwner(profile: ApiProfile): void {
  if (profile.role !== "owner") {
    throw new HttpError(403, "forbidden", "Only owner can modify products");
  }
}

function buildProductExpenseDescription(product: { name: string; size: string }): string {
  return `Producto: ${product.name} - talle ${product.size}`;
}

export const productService = {
  async list(filters: ProductListFilters, profile: ApiProfile): Promise<ApiProduct[]> {
    const products = await productRepository.list(filters);
    return products.map((product) => mapProductRow(product, profile.role));
  },

  async getById(id: string, profile: ApiProfile): Promise<ApiProduct> {
    const product = await productRepository.findById(id);

    if (!product) {
      throw new HttpError(404, "not_found", "Product not found");
    }

    return mapProductRow(product, profile.role);
  },

  async create(data: CreateProductData, profile: ApiProfile): Promise<ApiProduct> {
    assertOwner(profile);

    const product = await productRepository.create(data, profile.id);

    if (product.purchase_price > 0) {
      await expenseRepository.create(
        {
          amount: product.purchase_price,
          category: PRODUCT_EXPENSE_CATEGORY,
          description: buildProductExpenseDescription(product),
          note: PRODUCT_EXPENSE_NOTE,
          spentAt: product.created_at,
        },
        profile.id,
      );
    }

    return mapProductRow(product, profile.role);
  },

  async update(id: string, data: UpdateProductData, profile: ApiProfile): Promise<ApiProduct> {
    assertOwner(profile);

    const current = await productRepository.findById(id);

    if (!current) {
      throw new HttpError(404, "not_found", "Product not found");
    }

    if (
      current.status === "sold" &&
      (data.purchasePrice !== undefined ||
        data.salePrice !== undefined ||
        data.category !== undefined ||
        data.subcategory !== undefined)
    ) {
      throw new HttpError(400, "bad_request", "Sold product commercial data cannot be edited");
    }

    const mergedPurchasePrice = data.purchasePrice ?? current.purchase_price;
    const mergedSalePrice = data.salePrice ?? current.sale_price;

    if (mergedSalePrice < mergedPurchasePrice) {
      throw new HttpError(400, "bad_request", "salePrice must be greater than or equal to purchasePrice");
    }

    const updated = await productRepository.update(id, data);

    if (!updated) {
      throw new HttpError(404, "not_found", "Product not found");
    }

    return mapProductRow(updated, profile.role);
  },
};
