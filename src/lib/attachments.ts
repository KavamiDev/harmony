// Which mail attachments go to Documents.

export const MAX_BYTES = 10 * 1024 * 1024;

const TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], webp: ["image/webp"],
  heic: ["image/heic", "image/heif"], heif: ["image/heic", "image/heif"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  odt: ["application/vnd.oasis.opendocument.text"],
  txt: ["text/plain"],
};
const GENERIC = new Set(["application/octet-stream", ""]);

export function acceptAttachment(a: { mime: string; filename: string; size: number }) {
  const ext = a.filename.split(".").pop()?.toLowerCase() ?? "";
  const known = TYPES[ext];
  const mime = a.mime.toLowerCase();
  if (!known || !(known.includes(mime) || GENERIC.has(mime))) return { ok: false as const, reason: "type" as const };
  if (a.size > MAX_BYTES) return { ok: false as const, reason: "too_big" as const };
  return { ok: true as const };
}

export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()!.replace(/[\u0000-\u001f]/g, "").trim();
  return base || "piece-jointe";
}
