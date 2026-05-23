export type ImportError = {
  row: number;
  column?: string;
  value?: string;
  message: string;
};

// Builds a downloadable CSV string from an error array.
export function buildErrorCsv(errors: ImportError[]): string {
  const header = "Row,Column,Value,Error\n";
  const rows = errors
    .map((e) =>
      [String(e.row), e.column ?? "", e.value ?? "", e.message]
        .map(escapeCell)
        .join(","),
    )
    .join("\n");
  return header + rows;
}

// Returns a data: URI suitable for <a download>.
export function errorCsvDataUri(errors: ImportError[]): string {
  const csv = buildErrorCsv(errors);
  const encoded = encodeURIComponent(csv);
  return `data:text/csv;charset=utf-8,${encoded}`;
}

function escapeCell(value: string): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
