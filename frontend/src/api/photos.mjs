// Mirrors the API's limits for donation photos so users hear about a bad file before posting.
export const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTOS = 3;

const MAX_SIDE = 1280; // px; plenty to judge food on a phone screen
const JPEG_QUALITY = 0.75;

// Fits the longest side within limits (keeping proportions; never enlarges).
export function fitWithin(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Re-encodes an image as a ≤1280 px JPEG (typically ~150 KB). Browser only. Returns the original file
// when it isn't an image we accept, the browser can't decode it, or re-encoding wouldn't make it smaller.
export async function shrinkPhoto(file) {
  if (!PHOTO_TYPES.includes(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNG areas would turn black in JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Returns an error message for a file the API would refuse, or "" if it's fine.
export function photoError(file, alreadyChosen = 0) {
  if (alreadyChosen >= MAX_PHOTOS) return `You can add up to ${MAX_PHOTOS} photos.`;
  if (!PHOTO_TYPES.includes(file.type)) return `${file.name} isn't a PNG, JPEG or WebP image.`;
  if (file.size > MAX_PHOTO_BYTES) return `${file.name} is over 2 MB. Try a smaller photo.`;
  return "";
}
