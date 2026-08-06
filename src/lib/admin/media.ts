const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const allowedMediaTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export function sanitizeFileName(input: string) {
  const basename = input.replaceAll("\\", "/").split("/").pop() || "file";
  const dot = basename.lastIndexOf(".");
  const rawName = dot > 0 ? basename.slice(0, dot) : basename;
  const rawExtension = dot > 0 ? basename.slice(dot + 1) : "bin";
  const name = rawName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "file";
  const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return `${name}.${extension}`;
}

export function validateMediaMetadata(file: { type: string; size: number }) {
  if (!allowedMediaTypes.includes(file.type as typeof allowedMediaTypes[number])) return { success: false as const, message: "Tipe file tidak didukung" };
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_MEDIA_BYTES) return { success: false as const, message: "Ukuran file harus antara 1 byte dan 10 MiB" };
  return { success: true as const };
}

export function mediaStoragePath(userId: string, originalName: string, id = crypto.randomUUID(), now = new Date()) {
  const owner = userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) || "unknown";
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${owner}/${year}/${month}/${id}-${sanitizeFileName(originalName)}`;
}
