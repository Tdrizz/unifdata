// Extracts structured fields from freetext notes/description fields.
// All patterns are non-greedy and case-insensitive.

const PATTERNS: { key: string; pattern: RegExp; group: number }[] = [
  {
    key: "gate_code",
    pattern: /(?:gate|access|code|entry|door)\s*[:#]?\s*(\d{4,6})/i,
    group: 1,
  },
  {
    key: "unit",
    pattern: /(?:unit|suite|apt|apartment|ste|floor|fl)\s*#?\s*([A-Za-z0-9-]+)/i,
    group: 1,
  },
  {
    key: "alt_phone",
    pattern:
      /(?:alt(?:ernate)?\s+phone|secondary\s+phone|other\s+(?:phone|number))[\s:]*(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i,
    group: 1,
  },
  {
    key: "delivery_note",
    pattern: /(?:leave|deliver|drop)\s+(?:at|by)\s+(.+?)(?:\.|,|$)/i,
    group: 1,
  },
  {
    key: "contact_pref",
    pattern: /(text\s+only|no\s+calls?|call\s+before|email\s+only|prefer\s+text)/i,
    group: 1,
  },
  {
    key: "referral_source",
    pattern: /(?:referred|sent)\s+by\s+([A-Za-z\s]{2,40}?)(?:\.|,|$)/i,
    group: 1,
  },
  {
    key: "phone_ext",
    pattern: /(?:ext|extension|x)\s*\.?\s*(\d{1,6})/i,
    group: 1,
  },
];

export function extractMetadata(text: string | undefined | null): Record<string, string> {
  if (!text) return {};
  const result: Record<string, string> = {};
  for (const { key, pattern, group } of PATTERNS) {
    const match = text.match(pattern);
    if (match?.[group]) {
      result[key] = match[group].trim();
    }
  }
  return result;
}
