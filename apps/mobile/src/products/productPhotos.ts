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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export async function uploadProductPhoto(asset: ImagePickerAsset, userId: string): Promise<string> {
  if (!asset.base64) {
    throw new Error("No se pudo leer la imagen seleccionada. Volvé a elegir la foto e intentá de nuevo.");
  }

  const extension = getExtension(asset);
  const path = `products/${userId}/${Date.now()}.${extension}`;
  const fileBody = base64ToArrayBuffer(asset.base64);

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileBody, {
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
