import "server-only";

export type JsonBodyResult =
  | { success: true; data: unknown }
  | { success: false; status: 400 | 413; message: string };

export async function readJsonBody(
  request: Request,
  maxBytes = 32 * 1024,
): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      success: false,
      status: 413,
      message: "Ukuran data yang dikirim terlalu besar",
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { success: false, status: 400, message: "Data tidak valid" };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      success: false,
      status: 413,
      message: "Ukuran data yang dikirim terlalu besar",
    };
  }

  try {
    return { success: true, data: JSON.parse(text) as unknown };
  } catch {
    return { success: false, status: 400, message: "Data tidak valid" };
  }
}

export function requestBodyExceeds(request: Request, maxBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));
  return Number.isFinite(contentLength) && contentLength > maxBytes;
}
