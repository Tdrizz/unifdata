import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/crm/slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Acme Plumbing")).toBe("acme-plumbing");
  });

  it("strips punctuation and collapses runs of non-alphanumerics", () => {
    expect(slugify("A&B Plumbing, LLC!!!")).toBe("a-b-plumbing-llc");
  });

  it("strips accents down to their base letters", () => {
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--Acme--")).toBe("acme");
  });

  it("falls back to a default when nothing alphanumeric survives", () => {
    expect(slugify("!!!")).toBe("business");
    expect(slugify("")).toBe("business");
  });

  it("truncates very long names", () => {
    const result = slugify("a".repeat(100));
    expect(result.length).toBeLessThanOrEqual(40);
  });
});
