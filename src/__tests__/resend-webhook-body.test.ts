import { describe, it, expect } from "vitest";
import { stripQuotedReply, htmlToPlainText } from "@/lib/email/inbound-format";

describe("stripQuotedReply", () => {
  it("cuts a Gmail-style quoted trailer, keeping the new text and signature", () => {
    const text = [
      "Reply test",
      "",
      "Sincerely,",
      "Tittan Olson",
      "",
      "On Fri, Aug 28, 2026 at 6:03 PM Demo Company Test <demo-company-test@unifdata.com> wrote:",
      "> This is a test",
      ">",
    ].join("\n");

    expect(stripQuotedReply(text)).toBe("Reply test\n\nSincerely,\nTittan Olson");
  });

  it("cuts an Outlook-style Original Message trailer", () => {
    const text = "New reply\n\n-----Original Message-----\nFrom: someone@example.com\nSubject: Re: test\n\nOld content";
    expect(stripQuotedReply(text)).toBe("New reply");
  });

  it("cuts a forwarded-message trailer", () => {
    const text = "Forwarding this along\n\n---------- Forwarded message ----------\nFrom: someone@example.com";
    expect(stripQuotedReply(text)).toBe("Forwarding this along");
  });

  it("leaves plain text with no quote header untouched", () => {
    expect(stripQuotedReply("Just a normal reply, nothing quoted.")).toBe("Just a normal reply, nothing quoted.");
  });

  it("falls back to the original text instead of returning empty when the whole message is quoted", () => {
    const text = "On Fri, Aug 28, 2026 at 6:03 PM Demo Company Test <demo-company-test@unifdata.com> wrote:\n> hi";
    expect(stripQuotedReply(text)).toBe(text);
  });
});

describe("htmlToPlainText", () => {
  it("converts paragraphs and line breaks to readable plain text", () => {
    const html = "<p>First line.</p><p>Second line<br>continued.</p>";
    expect(htmlToPlainText(html)).toBe("First line.\n\nSecond line\ncontinued.");
  });

  it("strips tags, style, and script blocks", () => {
    const html = "<style>body{color:red}</style><div>Hello <b>world</b></div><script>evil()</script>";
    expect(htmlToPlainText(html)).toBe("Hello world");
  });

  it("decodes common HTML entities", () => {
    expect(htmlToPlainText("<p>Tom &amp; Jerry &quot;said&quot; &lt;hi&gt;</p>")).toBe("Tom & Jerry \"said\" <hi>");
  });
});
