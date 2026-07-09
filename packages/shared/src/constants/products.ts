export const PRODUCT_STATUSES = ["available", "sold"] as const;

export const PRODUCT_STATUS_LABELS = {
  available: "Disponible",
  sold: "Vendido",
} as const satisfies Record<ProductStatus, string>;

export const PRODUCT_CATEGORIES = ["upper", "lower", "lingerie"] as const;

export const PRODUCT_CATEGORY_LABELS = {
  upper: "Superior",
  lower: "Inferior",
  lingerie: "Lencería",
} as const satisfies Record<ProductCategory, string>;

export const PRODUCT_SUBCATEGORIES = {
  upper: ["remera", "abrigo"],
  lower: ["largo", "corto"],
  lingerie: [],
} as const satisfies Record<ProductCategory, readonly string[]>;

export const PRODUCT_SUBCATEGORY_LABELS = {
  remera: "Remera",
  abrigo: "Abrigo",
  largo: "Largo",
  corto: "Corto",
} as const satisfies Record<string, string>;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductSubcategory =
  (typeof PRODUCT_SUBCATEGORIES)[keyof typeof PRODUCT_SUBCATEGORIES][number];
