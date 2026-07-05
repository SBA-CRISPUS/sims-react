/**
 * CSV helpers with spreadsheet formula-injection protection.
 *
 * A cell whose text a spreadsheet would treat as a formula (it starts with
 * = + - @, or a tab/CR) is prefixed with a single quote so Excel/Sheets
 * render it as literal text rather than executing it (OWASP CSV injection).
 * Standard CSV quoting is then applied for commas/quotes/newlines.
 */
export function csvCell(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Serialises rows of string cells to a safe CSV string. */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Triggers a browser download of the given rows as a CSV file. */
export function downloadCsv(filename: string, rows: string[][]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
