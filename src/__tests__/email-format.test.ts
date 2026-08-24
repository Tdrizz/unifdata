import { describe, it, expect } from "vitest";
import { markdownToEmailHtml, stripMarkdown } from "@/lib/email/format";

describe("stripMarkdown", () => {
  it("removes bold markers", () => {
    expect(stripMarkdown("Revenue is **up 12%** this week.")).toBe("Revenue is up 12% this week.");
  });

  it("removes heading markers", () => {
    expect(stripMarkdown("## Summary\nEverything looks good.")).toBe("Summary\nEverything looks good.");
  });

  it("normalizes bullet markers", () => {
    expect(stripMarkdown("* first\n- second")).toBe("- first\n- second");
  });

  it("leaves plain text untouched", () => {
    expect(stripMarkdown("Nothing to report this week.")).toBe("Nothing to report this week.");
  });
});

describe("markdownToEmailHtml", () => {
  it("converts bold to <strong> inside a paragraph", () => {
    const html = markdownToEmailHtml("Revenue is **up 12%** this week.");
    expect(html).toContain("<strong>up 12%</strong>");
    expect(html).toContain("<p");
  });

  it("converts a run of bullet lines into a real list", () => {
    const html = markdownToEmailHtml("Top alerts:\n- Overdue invoice\n- Stale job");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Overdue invoice");
    expect(html).toContain("Stale job");
  });

  it("escapes raw HTML so it can't inject markup", () => {
    const html = markdownToEmailHtml("Contact <script>alert(1)</script> flagged.");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("separates blank-line paragraphs into distinct <p> blocks", () => {
    const html = markdownToEmailHtml("First point.\n\nSecond point.");
    const count = (html.match(/<p/g) ?? []).length;
    expect(count).toBe(2);
  });
});
