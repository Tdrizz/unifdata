const STREET_TYPES: [RegExp, string][] = [
  [/\bst\b/g, "street"],
  [/\bave\b/g, "avenue"],
  [/\bblvd\b/g, "boulevard"],
  [/\bdr\b/g, "drive"],
  [/\bln\b/g, "lane"],
  [/\brd\b/g, "road"],
  [/\bct\b/g, "court"],
  [/\bpl\b/g, "place"],
  [/\bpkwy\b/g, "parkway"],
  [/\bhwy\b/g, "highway"],
  [/\bcir\b/g, "circle"],
  [/\bter\b/g, "terrace"],
  [/\btrl\b/g, "trail"],
];

const DIRECTIONS: [RegExp, string][] = [
  [/\bne\b/g, "northeast"],
  [/\bnw\b/g, "northwest"],
  [/\bse\b/g, "southeast"],
  [/\bsw\b/g, "southwest"],
  [/\bn\b/g, "north"],
  [/\bs\b/g, "south"],
  [/\be\b/g, "east"],
  [/\bw\b/g, "west"],
];

const UNIT_TYPES: [RegExp, string][] = [
  [/\bapt\b/g, "apartment"],
  [/\bste\b/g, "suite"],
  [/\bfl\b/g, "floor"],
  [/\brm\b/g, "room"],
];

export function normalizeAddress(addr: Record<string, string> | null): string {
  if (!addr) return "";
  const raw = [addr.street, addr.city, addr.state, addr.postalCode ?? addr.zip]
    .filter(Boolean)
    .join(" ");
  let s = raw.toLowerCase().trim();

  // Strip zip+4
  s = s.replace(/\b(\d{5})-\d{4}\b/g, "$1");

  for (const [pattern, replacement] of UNIT_TYPES) s = s.replace(pattern, replacement);
  for (const [pattern, replacement] of STREET_TYPES) s = s.replace(pattern, replacement);
  for (const [pattern, replacement] of DIRECTIONS) s = s.replace(pattern, replacement);

  return s.replace(/\s+/g, " ").trim();
}
