export type ParsedName = {
  firstName: string | null;
  lastName: string | null;
  isInitialOnly: boolean; // e.g. "J. Smith"
};

const NAME_SUFFIXES = new Set([
  "jr", "sr", "ii", "iii", "iv", "v", "esq", "phd", "md", "dds", "jd",
]);

// Strips known suffixes from the end of a name token array.
function stripSuffixes(tokens: string[]): string[] {
  while (
    tokens.length > 0 &&
    NAME_SUFFIXES.has(tokens[tokens.length - 1].replace(/\./g, "").toLowerCase())
  ) {
    tokens = tokens.slice(0, -1);
  }
  return tokens;
}

// Strips middle initials/names from an array of > 2 tokens.
function stripMiddle(tokens: string[]): string[] {
  if (tokens.length <= 2) return tokens;
  // Remove any single-letter tokens from the middle
  return [tokens[0], tokens[tokens.length - 1]];
}

export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseName(raw: string): ParsedName {
  const trimmed = raw.trim();
  if (!trimmed) return { firstName: null, lastName: null, isInitialOnly: false };

  // Comma-swap: "Smith, John" → firstName: John, lastName: Smith
  if (trimmed.includes(",")) {
    const [last, ...firstParts] = trimmed.split(",").map((s) => s.trim());
    const firstName = firstParts.join(" ").trim() || null;
    return {
      firstName: firstName ? toTitleCase(firstName) : null,
      lastName: last ? toTitleCase(last) : null,
      isInitialOnly: false,
    };
  }

  let tokens = trimmed.split(/\s+/).filter(Boolean);
  tokens = stripSuffixes(tokens);
  tokens = stripMiddle(tokens);

  if (tokens.length === 0) return { firstName: null, lastName: null, isInitialOnly: false };
  if (tokens.length === 1) {
    return {
      firstName: toTitleCase(tokens[0]),
      lastName: null,
      isInitialOnly: false,
    };
  }

  const firstToken = tokens[0];
  // Detect initial-only first name: single letter optionally followed by a period
  const isInitialOnly = /^[a-zA-Z]\.?$/.test(firstToken);

  return {
    firstName: toTitleCase(firstToken.replace(/\.$/, "")),
    lastName: toTitleCase(tokens.slice(1).join(" ")),
    isInitialOnly,
  };
}
