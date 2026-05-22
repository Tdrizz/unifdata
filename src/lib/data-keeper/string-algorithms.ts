// ── Jaro-Winkler Similarity ────────────────────────────────────────────────────
// Best algorithm for personal name matching. Weights prefix agreement heavily.
// Returns 0.0–1.0.

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (
    (matches / a.length +
      matches / b.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * p * (1 - j);
}

// ── Character Trigram Jaccard ──────────────────────────────────────────────────
// Same algorithm as PostgreSQL's pg_trgm. Pads with two spaces on each side.
// Returns 0.0–1.0.

function getTrigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()}  `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const ta = getTrigrams(a);
  const tb = getTrigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return intersection / (ta.size + tb.size - intersection);
}

// ── Normalized Levenshtein ─────────────────────────────────────────────────────
// Edit distance divided by max length. Good for short-string typos.
// Returns 0.0–1.0 (1 = identical).

export function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }

  return 1 - dp[n] / Math.max(m, n);
}

// ── Simplified Double Metaphone ────────────────────────────────────────────────
// Encodes a name by how it sounds. Returns the primary phonetic code.
// Handles the most common English phonetic patterns (~80 rules).
// "Catherine" = "Katherine", "Bryan" = "Brian", "Meyers" = "Myers".

export function doubleMetaphone(word: string): string {
  const w = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (w.length === 0) return "";

  let code = "";
  let i = 0;

  // Initial silent letters
  if (["AE", "GN", "KN", "PN", "WR"].some((p) => w.startsWith(p))) i = 1;

  // Initial vowels → A
  if (i === 0 && "AEIOU".includes(w[0])) {
    code += "A";
    i = 1;
  }

  while (i < w.length && code.length < 6) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    const prev = w[i - 1] ?? "";
    const next2 = w[i + 2] ?? "";

    switch (c) {
      case "B":
        if (prev !== "M") code += "P";
        i++;
        break;

      case "C":
        if (next === "I" || next === "E" || next === "Y") {
          code += "S";
        } else if (next === "H") {
          code += "X";
          i++;
        } else if (w.slice(i, i + 3) === "CIA" || w.slice(i, i + 3) === "CIO") {
          code += "X";
        } else {
          code += "K";
        }
        i++;
        break;

      case "D":
        if (next === "G" && "IEY".includes(next2)) {
          code += "J";
          i += 2;
        } else {
          code += "T";
          i++;
        }
        break;

      case "F":
        code += "F";
        i += next === "F" ? 2 : 1;
        break;

      case "G":
        if (next === "H") {
          if (!"AEIOU".includes(w[i - 1] ?? "")) {
            i += 2;
            break;
          }
          code += "K";
          i += 2;
        } else if (next === "N") {
          i++;
        } else if (next === "E" || next === "I" || next === "Y") {
          code += "K";
          i++;
        } else {
          code += "K";
          i++;
        }
        break;

      case "H":
        if ("AEIOU".includes(next) && !"AEIOU".includes(prev)) {
          code += "H";
        }
        i++;
        break;

      case "J":
        code += "J";
        i++;
        break;

      case "K":
        if (prev !== "C") code += "K";
        i++;
        break;

      case "L":
        code += "L";
        i += next === "L" ? 2 : 1;
        break;

      case "M":
        code += "M";
        i++;
        break;

      case "N":
        code += "N";
        i += next === "N" ? 2 : 1;
        break;

      case "P":
        if (next === "H") {
          code += "F";
          i += 2;
        } else {
          code += "P";
          i += next === "P" ? 2 : 1;
        }
        break;

      case "Q":
        code += "K";
        i += next === "Q" ? 2 : 1;
        break;

      case "R":
        code += "R";
        i += next === "R" ? 2 : 1;
        break;

      case "S":
        if (next === "H" || (next === "I" && (next2 === "O" || next2 === "A"))) {
          code += "X";
          i += 2;
        } else if (w.slice(i, i + 3) === "SCH") {
          code += "SK";
          i += 3;
        } else {
          code += "S";
          i += next === "S" ? 2 : 1;
        }
        break;

      case "T":
        if (next === "H") {
          code += "0"; // th sound
          i += 2;
        } else if (next === "I" && (next2 === "A" || next2 === "O")) {
          code += "X";
          i++;
        } else {
          code += "T";
          i += next === "T" ? 2 : 1;
        }
        break;

      case "V":
        code += "F";
        i++;
        break;

      case "W":
        if ("AEIOU".includes(next)) {
          code += "A";
        }
        i++;
        break;

      case "X":
        code += "KS";
        i++;
        break;

      case "Y":
        if ("AEIOU".includes(next)) code += "A";
        i++;
        break;

      case "Z":
        code += "S";
        i += next === "Z" ? 2 : 1;
        break;

      default:
        i++;
    }
  }

  return code;
}

// ── Composite name scorer ──────────────────────────────────────────────────────
// Returns the best similarity score across all three algorithms.

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return Math.max(
    jaroWinkler(al, bl),
    trigramSimilarity(al, bl),
    normalizedLevenshtein(al, bl),
  );
}

export function phoneticMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = doubleMetaphone(a);
  const cb = doubleMetaphone(b);
  return ca.length > 0 && cb.length > 0 && ca === cb;
}
