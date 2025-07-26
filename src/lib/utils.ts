import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fileTypeFromBlob } from "file-type";

export async function detectMimeType(blob: Blob): Promise<string> {
  try {
    const result = await fileTypeFromBlob(blob);
    return result?.mime || blob.type || "application/octet-stream";
  } catch {
    return blob.type || "application/octet-stream";
  }
}

export function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    mime === "application/xml" ||
    mime.endsWith("+xml")
  );
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
