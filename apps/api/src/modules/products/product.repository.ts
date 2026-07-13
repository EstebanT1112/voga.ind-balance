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

function getSoldCatalogCutoff(now = new Date()): string {
  const originalDay = now.getDate();
  const cutoff = new Date(now);
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - 2);
  const lastDayOfTargetMonth = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
  cutoff.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return cutoff.toISOString();
}

async function listRecentlySoldProductIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("sale_items")
    .select("product_id, sales!inner(sale_date)")
    .eq("status", "sold")
    .gte("sales.sale_date", getSoldCatalogCutoff())
    .returns<Array<{ product_id: string }>>();

  if (error) {
    throw error;
  }

  return [...new Set(data.map((item) => item.product_id))];
}

export const productRepository = {
  async list(filters: ProductListFilters): Promise<ProductRow[]> {
    let query = supabaseAdmin.from("products").select(productSelect).order("created_at", {
      ascending: false,
    });

    if (filters.status === "available") {
      query = query.eq("status", filters.status);
    } else {
      const recentlySoldProductIds = await listRecentlySoldProductIds();

      if (filters.status === "sold") {
        if (recentlySoldProductIds.length === 0) {
          return [];
        }

        query = query.eq("status", "sold").in("id", recentlySoldProductIds);
      } else if (recentlySoldProductIds.length > 0) {
        query = query.or(`status.eq.available,id.in.(${recentlySoldProductIds.join(",")})`);
      } else {
        query = query.eq("status", "available");
      }
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
