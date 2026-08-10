const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const allowedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

type AllowedMediaType = (typeof allowedMediaTypes)[number];

type UploadValidationOptions = {
  allowedTypes?: readonly AllowedMediaType[];
  maxBytes?: number;
};

const extensionByMime: Record<AllowedMediaType, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

function fileExtension(name: string) {
  const safeName = name.replaceAll("\\", "/").split("/").pop() ?? "";
  const dot = safeName.lastIndexOf(".");
  return dot >= 0 ? safeName.slice(dot + 1).toLowerCase() : "";
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasExpectedSignature(type: AllowedMediaType, bytes: Uint8Array) {
  if (type === "image/jpeg") {
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  }

  if (type === "image/png") {
    return startsWith(bytes, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }

  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  if (type === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }

  return false;
}

export function sanitizeFileName(input: string) {
  const basename = input.replaceAll("\\", "/").split("/").pop() || "file";
  const dot = basename.lastIndexOf(".");
  const rawName = dot > 0 ? basename.slice(0, dot) : basename;
  const rawExtension = dot > 0 ? basename.slice(dot + 1) : "bin";
  const name =
    rawName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  const extension =
    rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) ||
    "bin";
  return `${name}.${extension}`;
}

export function safeOriginalFileName(input: string) {
  return sanitizeFileName(input).slice(0, 255);
}

export function validateMediaMetadata(file: { type: string; size: number }) {
  if (!allowedMediaTypes.includes(file.type as AllowedMediaType)) {
    return { success: false as const, message: "Tipe file tidak didukung" };
  }
  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_MEDIA_BYTES
  ) {
    return {
      success: false as const,
      message: "Ukuran file harus antara 1 byte dan 10 MiB",
    };
  }
  return { success: true as const };
}

export async function validateUploadFile(
  file: File,
  options: UploadValidationOptions = {},
) {
  const allowedTypes = options.allowedTypes ?? allowedMediaTypes;
  const maxBytes = options.maxBytes ?? MAX_MEDIA_BYTES;
  const type = file.type as AllowedMediaType;

  if (!allowedTypes.includes(type)) {
    return { success: false as const, message: "Tipe file tidak didukung" };
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
    return {
      success: false as const,
      message: `Ukuran file maksimal ${Math.max(1, Math.floor(maxBytes / 1024 / 1024))} MB`,
    };
  }

  const extension = fileExtension(file.name);
  if (!extensionByMime[type].includes(extension)) {
    return {
      success: false as const,
      message: "Ekstensi file tidak sesuai dengan tipe file",
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return { success: false as const, message: "File tidak dapat diperiksa" };
  }

  if (!hasExpectedSignature(type, bytes)) {
    return {
      success: false as const,
      message: "Isi file tidak sesuai dengan format yang diizinkan",
    };
  }

  return { success: true as const, mimeType: type };
}

export function mediaStoragePath(
  userId: string,
  originalName: string,
  id: string = crypto.randomUUID(),
  now: Date = new Date(),
) {
  const owner =
    userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) || "unknown";
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${owner}/${year}/${month}/${id}-${sanitizeFileName(originalName)}`;
}
