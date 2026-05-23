import * as XLSX from "@e965/xlsx";
import { detectDelimiter } from "./delimiter-detector";

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
  format: string;
  sheetName?: string;
  totalRows: number;
};

const BINARY_EXTS = new Set([
  ".xlsx",
  ".xls",
  ".xlsm",
  ".xlsb",
  ".ods",
  ".fods",
  ".numbers",
]);

export const MAX_ROWS = 5000;

export async function parseUploadedFile(
  file: File,
  maxRows = MAX_ROWS,
): Promise<ParsedFile> {
  const ext = getExtension(file.name);

  if (BINARY_EXTS.has(ext)) {
    const buffer = await file.arrayBuffer();
    return parseBinary(buffer, ext, maxRows);
  }

  const text = await file.text();
  return parseText(text, ext, maxRows);
}

export async function parseBuffer(
  buffer: ArrayBuffer,
  filename: string,
  maxRows = MAX_ROWS,
): Promise<ParsedFile> {
  const ext = getExtension(filename);

  if (BINARY_EXTS.has(ext)) {
    return parseBinary(buffer, ext, maxRows);
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return parseText(text, ext, maxRows);
}

function parseBinary(
  buffer: ArrayBuffer,
  ext: string,
  maxRows: number,
): ParsedFile {
  const wb = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: false,
    raw: false,
  });

  const sheetName = wb.SheetNames[0] ?? "Sheet1";
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    return { headers: [], rows: [], format: ext.slice(1), sheetName, totalRows: 0 };
  }

  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });

  const headers =
    allRows.length > 0
      ? Object.keys(allRows[0] as Record<string, unknown>)
      : [];

  const totalRows = allRows.length;
  const capped = allRows.slice(0, maxRows);

  const rows: Record<string, string>[] = capped.map((row) =>
    Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([k, v]) => [
        k,
        stringify(v),
      ]),
    ),
  );

  return { headers, rows, format: ext.slice(1), sheetName, totalRows };
}

function parseText(text: string, ext: string, maxRows: number): ParsedFile {
  const delim = ext === ".tsv" ? "\t" : detectDelimiter(text);
  return parseDelimited(text, delim, ext.slice(1) || "csv", maxRows);
}

export function parseDelimited(
  text: string,
  delimiter: string,
  format: string,
  maxRows = MAX_ROWS,
): ParsedFile {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const nonEmpty: string[] = [];
  for (const line of lines) {
    if (line.trim()) nonEmpty.push(line);
  }

  if (nonEmpty.length < 1) {
    return { headers: [], rows: [], format, totalRows: 0 };
  }

  const headers = splitLine(nonEmpty[0], delimiter).map((h) => h.trim());
  const totalRows = nonEmpty.length - 1;
  const dataLines = nonEmpty.slice(1, maxRows + 1);

  const rows: Record<string, string>[] = dataLines.map((line) => {
    const values = splitLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows, format, totalRows };
}

function splitLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    if (i === line.length) {
      fields.push("");
      break;
    }

    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      // skip delimiter after closing quote
      if (line[i] === delimiter) i++;
    } else {
      const end = line.indexOf(delimiter, i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }

  return fields;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v).trim();
}

export function acceptedFileExtensions(): string {
  return ".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.xlsb,.ods,.numbers";
}

export function acceptedMimeTypes(): string {
  return [
    "text/csv",
    "text/tab-separated-values",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument.spreadsheet",
  ].join(",");
}
