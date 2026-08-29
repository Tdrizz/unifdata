// Good-enough HTML -> plain text for storing/previewing an inbound email
// whose text field came back empty -- not meant to be a faithful render,
// just readable instead of blank.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Trims the quoted-reply trailer most email clients append below what
// someone actually typed ("On <date>, <name> wrote: > ..." from Gmail/Apple
// Mail, "-----Original Message-----" from Outlook) -- keeps only the new
// part instead of storing the whole quoted thread as the message body.
// Heuristic by nature (every client formats this slightly differently), so
// it only cuts at a pattern that starts its own line, and falls back to the
// untouched text if that would empty the message out entirely (a message
// that's only quoted content, or an unrecognized format, still shows
// something rather than nothing).
export function stripQuotedReply(text: string): string {
  const patterns = [
    /\n\s*-{2,}\s*Original Message\s*-{2,}/i,
    /\n\s*-{2,}\s*Forwarded message\s*-{2,}/i,
    /\n\s*On .{0,150}wrote:/i,
  ];

  let cutoff = text.length;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined && match.index < cutoff) {
      cutoff = match.index;
    }
  }

  const trimmed = text.slice(0, cutoff).trim();
  return trimmed || text.trim();
}
