import { describe, expect, it } from "vitest";
import { formatSize, linkify } from "./documents";

describe("formatSize", () => {
  it.each([[500, "500 o"], [2048, "2 Ko"], [1_572_864, "1,5 Mo"]])("%i → %s", (b, out) => expect(formatSize(b)).toBe(out));
});

describe("linkify", () => {
  it("keeps text and extracts links without trailing punctuation", () => {
    expect(linkify("Menu : https://ecole.example/menu.pdf. Merci")).toEqual([
      { text: "Menu : " }, { text: "https://ecole.example/menu.pdf", href: "https://ecole.example/menu.pdf" }, { text: ". Merci" },
    ]);
  });
  it("ignores javascript: and other schemes", () => {
    expect(linkify("javascript:alert(1) mailto:a@b.c")).toEqual([{ text: "javascript:alert(1) mailto:a@b.c" }]);
  });
});
