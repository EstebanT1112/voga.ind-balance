import type { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "../lib/supabase";

const BUCKET = "product-photos";

function getExtension(asset: ImagePickerAsset): string {
  const fromFile = asset.fileName?.split(".").pop()?.toLowerCase();

  if (fromFile) {
    return fromFile === "jpeg" ? "jpg" : fromFile;
  }

  if (asset.mimeType?.includes("png")) {
    return "png";
  }

  if (asset.mimeType?.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

export async function uploadProductPhoto(asset: ImagePickerAsset, userId: string): Promise<string> {
  const extension = getExtension(asset);
  const path = `products/${userId}/${Date.now()}.${extension}`;
  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "3600",
    contentType: asset.mimeType ?? `image/${extension}`,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function getProductPhotoUrl(path: string): Promise<string> {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}
