export type MappingCandidate = {
  column: string;
  confidence: number; // 0–1
};

export type ColumnMapping = Record<string, MappingCandidate>;

export type FieldSpec = {
  key: string;
  label: string;
  synonyms?: string[];
};

export function buildFuzzyMapping(
  headers: string[],
  fields: FieldSpec[],
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();

  for (const field of fields) {
    const candidates = headers
      .filter((h) => !usedHeaders.has(h))
      .map((h) => ({
        h,
        score: bestScore(
          normalise(h),
          [field.key, field.label, ...(field.synonyms ?? [])].map(normalise),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const { h, score } = candidates[0];
      mapping[field.key] = { column: h, confidence: score };
      usedHeaders.add(h);
    }
  }

  return mapping;
}

function bestScore(header: string, targets: string[]): number {
  let best = 0;

  for (const target of targets) {
    if (!target) continue;

    // Exact match
    if (header === target) return 1.0;

    // Contains match
    if (header.includes(target) || target.includes(header)) {
      const sim = Math.min(header.length, target.length) / Math.max(header.length, target.length);
      best = Math.max(best, 0.5 + 0.3 * sim);
      continue;
    }

    // Levenshtein similarity
    const dist = levenshtein(header, target);
    const maxLen = Math.max(header.length, target.length);
    if (maxLen === 0) continue;
    const sim = 1 - dist / maxLen;
    if (sim > 0.6) best = Math.max(best, sim * 0.8);
  }

  return best;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use single row DP
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
