// AI-generated email/text bodies sometimes include markdown (bold, bullet
// lists) even when the prompt asks for plain text — model instruction-
// following on that point isn't reliable. Rather than trust the model,
// convert whatever comes back into a real HTML email and a markdown-free
// plain-text fallback, so a stray "**word**" never reaches an inbox as
// literal asterisks.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Splits into blocks (paragraphs and bullet-list runs) and renders each as
// real HTML — <p> for prose, <ul><li> for a run of "- "/"* " lines.
export function markdownToEmailHtml(text: string): string {
  const lines = text.trim().split("\n");
  const blocks: string[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push(`<p style="margin:0 0 12px;">${inlineMarkdownToHtml(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }
  function flushList() {
    if (listItems.length > 0) {
      const items = listItems.map((item) => `<li style="margin:0 0 4px;">${inlineMarkdownToHtml(item)}</li>`).join("");
      blocks.push(`<ul style="margin:0 0 12px;padding-left:20px;">${items}</ul>`);
      listItems = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks.join("\n");
}

// Plain-text fallback: strip markdown syntax rather than leave it visible,
// since some clients render the `text` part instead of `html`.
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "- ");
}
