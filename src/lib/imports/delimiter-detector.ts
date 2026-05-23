export type Delimiter = "," | "\t" | ";" | "|";

export function detectDelimiter(sample: string): Delimiter {
  const lines = sample.split(/\r?\n/).slice(0, 5).filter(Boolean);
  if (lines.length === 0) return ",";

  const candidates: Delimiter[] = [",", "\t", ";", "|"];

  // Score each delimiter by consistency across lines (std dev of count per line)
  let bestDelim: Delimiter = ",";
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.map((line) => countUnquoted(line, delim));
    const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
    if (mean === 0) continue;

    // Higher mean + lower variance = better delimiter
    const variance =
      counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length;
    const score = mean / (1 + variance);

    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

function countUnquoted(line: string, delim: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (!inQuotes && line[i] === delim) count++;
  }
  return count;
}
