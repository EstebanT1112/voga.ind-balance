export const PRODUCT_PHOTOS_BUCKET = "product-photos";
export const PRODUCT_PHOTOS_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_PHOTOS_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductPhotoMimeType = (typeof PRODUCT_PHOTOS_ALLOWED_MIME_TYPES)[number];
