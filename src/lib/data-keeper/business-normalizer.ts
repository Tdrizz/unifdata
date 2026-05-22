const LEGAL_SUFFIXES = [
  "llc", "l.l.c.", "llc.", "inc", "inc.", "incorporated",
  "corp", "corp.", "corporation", "ltd", "ltd.", "limited",
  "co.", "company", "group", "partners", "associates",
  "& associates", "pllc", "llp", "l.l.p.",
];

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bintl\b/g, "international"],
  [/\bmgmt\b/g, "management"],
  [/\bsvcs\b/g, "services"],
  [/\bsvc\b/g, "service"],
  [/\bdept\b/g, "department"],
  [/\bassoc\b/g, "associates"],
  [/\bbldg\b/g, "building"],
  [/\bhq\b/g, "headquarters"],
  [/\bctr\b/g, "center"],
  [/\bsys\b/g, "systems"],
  [/\btech\b/g, "technology"],
];

export function normalizeBusinessName(name: string): string {
  let s = name.toLowerCase().trim();

  // Strip apostrophes (McDonald's → mcdonalds)
  s = s.replace(/'/g, "");

  // Replace & with and
  s = s.replace(/\s*&\s*/g, " and ");

  // Strip leading articles
  s = s.replace(/^the\s+/, "").replace(/^a\s+/, "");

  // Expand abbreviations
  for (const [pattern, replacement] of ABBREVIATIONS) {
    s = s.replace(pattern, replacement);
  }

  // Strip legal suffixes (longest match first)
  const sorted = [...LEGAL_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    const pattern = new RegExp(
      `[,\\s]+${suffix.replace(/\./g, "\\.")}\\s*$`,
      "i",
    );
    s = s.replace(pattern, "").trim();
  }

  // Collapse whitespace
  return s.replace(/\s+/g, " ").trim();
}
