import { describe, expect, it } from "vitest";
import { loadLanguage, LANGUAGES, type LangId } from "./languages";

describe("LANGUAGES", () => {
  it("has a unique id and label for every entry", () => {
    const ids = LANGUAGES.map((lang) => lang.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lang of LANGUAGES) {
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });
});

describe("loadLanguage", () => {
  it("resolves to null for plaintext, which has no CodeMirror language pack", async () => {
    await expect(loadLanguage("plaintext")).resolves.toBeNull();
  });

  it.each(LANGUAGES.filter((lang) => lang.id !== "plaintext").map((lang) => lang.id))(
    "loads a language pack for %s",
    async (id: LangId) => {
      const support = await loadLanguage(id);
      expect(support).not.toBeNull();
    },
  );
});
