/**
 * Central CSV and Spreadsheet Formula Injection Sanitizer (CWE-1236 Prevention).
 * Neutralizes characters that trigger formula execution in Microsoft Excel,
 * Google Sheets, LibreOffice Calc, and Apple Numbers: '=', '+', '-', '@', '\t', '\r'.
 */

const FORMULA_START_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Sanitizes an individual CSV cell value:
 * 1. Converts null/undefined to empty string.
 * 2. If the value begins with a formula execution character, prepends a single quote (').
 * 3. Escapes embedded double-quotes by doubling them ("").
 * 4. Wraps in quotes if it contains commas, quotes, line breaks, or leading single quotes.
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Strip or neutralize formula prefixes
  if (str.length > 0 && FORMULA_START_CHARS.has(str[0])) {
    str = `'${str}`;
  }

  // Escape double quotes
  const needsQuotes =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.startsWith("'");

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats an array of rows into a sanitized, CRLF-delimited CSV document.
 */
export function sanitizeCSVRow(row: unknown[]): string {
  return row.map(sanitizeCSVCell).join(",");
}

export function formatSanitizedCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = sanitizeCSVRow(headers);
  const rowLines = rows.map((row) => sanitizeCSVRow(row));
  return [headerLine, ...rowLines].join("\r\n");
}
