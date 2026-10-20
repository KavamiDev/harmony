import { describe, expect, it } from "vitest";
import { acceptAttachment, MAX_BYTES, safeFileName } from "./attachments";

describe("acceptAttachment", () => {
  it.each([
    ["application/pdf", "bulletin.pdf"],
    ["image/jpeg", "photo.jpg"],
    ["image/heic", "IMG_0001.HEIC"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "mot.docx"],
    ["application/octet-stream", "sortie-scolaire.pdf"], // generic mime, known extension
  ])("accepts %s (%s)", (mime, filename) => {
    expect(acceptAttachment({ mime, filename, size: 1000 })).toEqual({ ok: true });
  });

  it("refuses files over 10 MB", () => {
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(acceptAttachment({ mime: "application/pdf", filename: "a.pdf", size: MAX_BYTES + 1 })).toEqual({ ok: false, reason: "too_big" });
  });

  it.each([
    ["application/x-msdownload", "setup.exe"],
    ["text/html", "page.html"],
    ["application/zip", "photos.zip"],
    ["application/octet-stream", "script.js"],
  ])("refuses %s (%s)", (mime, filename) => {
    expect(acceptAttachment({ mime, filename, size: 1000 })).toEqual({ ok: false, reason: "type" });
  });
});

describe("safeFileName", () => {
  it.each([
    ["Bulletin 1er trimestre.pdf", "Bulletin 1er trimestre.pdf"],
    ["../../etc/passwd", "passwd"],
    ["a/b\\c.pdf", "c.pdf"],
    ["", "piece-jointe"],
    ["   ", "piece-jointe"],
  ])("%j → %j", (input, out) => expect(safeFileName(input)).toBe(out));
});
