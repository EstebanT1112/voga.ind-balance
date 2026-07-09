import { supabaseAdmin } from "../../lib/supabase.js";
import { toProductInsert, toProductUpdate } from "./product.mapper.js";
import type {
  CreateProductData,
  ProductListFilters,
  ProductRow,
  UpdateProductData,
} from "./product.types.js";

const productSelect =
  "id, name, photo_path, size, description, category, subcategory, purchase_price, sale_price, status, created_by, created_at, updated_at";

export const productRepository = {
  async list(filters: ProductListFilters): Promise<ProductRow[]> {
    let query = supabaseAdmin.from("products").select(productSelect).order("created_at", {
      ascending: false,
    });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    const { data, error } = await query.returns<ProductRow[]>();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<ProductRow | null> {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(productSelect)
      .eq("id", id)
      .maybeSingle<ProductRow>();

    if (error) {
      throw error;
    }

    return data;
  },

  async create(data: CreateProductData, createdBy: string): Promise<ProductRow> {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .insert(toProductInsert(data, createdBy))
      .select(productSelect)
      .single<ProductRow>();

    if (error) {
      throw error;
    }

    return product;
  },

  async update(id: string, data: UpdateProductData): Promise<ProductRow | null> {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .update(toProductUpdate(data))
      .eq("id", id)
      .select(productSelect)
      .maybeSingle<ProductRow>();

    if (error) {
      throw error;
    }

    return product;
  },
};
