export type Fm24ImportSeverity = "error" | "warning";

export interface Fm24ImportIssue {
  code: string;
  severity: Fm24ImportSeverity;
  message: string;
  line?: number;
  uid?: string;
}

export interface Fm24RawPlayerRow {
  /** One-based source line number in the original export. */
  sourceLine: number;
  /** Exact source header names mapped to unmodified, trimmed cell strings. */
  values: Record<string, string>;
}

export interface Fm24ParseResult {
  format: "fm24-pipe-table-v1" | "unknown";
  headers: string[];
  rows: Fm24RawPlayerRow[];
  issues: Fm24ImportIssue[];
}

export interface Fm24ValidationSummary {
  sourceRows: number;
  validRows: number;
  invalidRows: number;
  malformedRows: number;
  missingUids: number;
  invalidUids: number;
  duplicateUids: number;
}

export interface Fm24ValidationResult {
  validRows: Fm24RawPlayerRow[];
  invalidRows: Fm24RawPlayerRow[];
  issues: Fm24ImportIssue[];
  summary: Fm24ValidationSummary;
  canImport: boolean;
}

function unwrapExportLine(source: string): string {
  let line = source.trim();

  // FM24 wraps each physical table line in a CSV-style quote pair.
  if (line.startsWith('"') && line.endsWith('"') && line.length >= 2) {
    line = line.slice(1, -1).replace(/""/g, '"');
  }

  return line.replace(/^\uFEFF/, "").trim();
}

function splitPipeCells(source: string): string[] {
  let line = source;
  if (line.startsWith("|")) line = line.slice(1);
  if (line.endsWith("|")) line = line.slice(0, -1);

  const cells: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "|" && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  cells.push(value.trim());
  return cells;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => cell.length > 0 && /^-+$/.test(cell));
}

/**
 * Parses the FM24 pipe-table export observed in test-for-git.csv.
 * Values intentionally remain strings; type conversion belongs to a later,
 * field-aware normalisation layer.
 */
export function parseFm24Export(source: string): Fm24ParseResult {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  const issues: Fm24ImportIssue[] = [];
  let headerLineIndex = -1;
  let headers: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const candidate = unwrapExportLine(lines[index]);
    if (!candidate.includes("|")) continue;

    const cells = splitPipeCells(candidate);
    if (cells.some((cell) => cell.toLocaleLowerCase() === "uid")) {
      headerLineIndex = index;
      headers = cells.map((cell) => cell.replace(/^\uFEFF/, "").trim());
      break;
    }
  }

  if (headerLineIndex < 0) {
    return {
      format: "unknown",
      headers: [],
      rows: [],
      issues: [{
        code: "header-not-found",
        severity: "error",
        message: "Could not find an FM24 pipe-table header containing a UID column.",
      }],
    };
  }

  const uidHeader = headers.find((header) => header.toLocaleLowerCase() === "uid");
  const headerCounts = new Map<string, number>();
  for (const header of headers) {
    const key = header.toLocaleLowerCase();
    headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
  }

  for (const [header, count] of headerCounts) {
    if (!header) {
      issues.push({
        code: "empty-header",
        severity: "error",
        line: headerLineIndex + 1,
        message: "The export contains an unnamed column. The file cannot be imported safely.",
      });
    } else if (count > 1) {
      issues.push({
        code: "duplicate-header",
        severity: "error",
        line: headerLineIndex + 1,
        message: `The export contains the duplicate column name "${header}".`,
      });
    }
  }

  if (!uidHeader) {
    issues.push({
      code: "uid-column-missing",
      severity: "error",
      line: headerLineIndex + 1,
      message: "The required UID column is missing.",
    });
  }

  const rows: Fm24RawPlayerRow[] = [];

  for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
    const line = unwrapExportLine(lines[index]);
    if (!line) continue;

    const cells = splitPipeCells(line);
    if (isSeparatorRow(cells)) continue;

    if (cells.length !== headers.length) {
      issues.push({
        code: "malformed-row",
        severity: "error",
        line: index + 1,
        message: `Expected ${headers.length} columns but found ${cells.length}; this row was excluded.`,
      });
      continue;
    }

    const values: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      values[header] = cells[cellIndex] ?? "";
    });

    rows.push({ sourceLine: index + 1, values });
  }

  if (rows.length === 0) {
    issues.push({
      code: "no-player-rows",
      severity: "error",
      message: "The export header was found, but no player rows were found.",
    });
  }

  return {
    format: "fm24-pipe-table-v1",
    headers,
    rows,
    issues,
  };
}

/**
 * Validates stable player identity without changing or merging source rows.
 * Rows with missing, invalid or duplicate UIDs are excluded from validRows.
 */
export function validateFm24Import(parsed: Fm24ParseResult): Fm24ValidationResult {
  const issues = [...parsed.issues];
  const uidHeader = parsed.headers.find((header) => header.toLocaleLowerCase() === "uid");
  const uidCounts = new Map<string, number>();

  if (uidHeader) {
    for (const row of parsed.rows) {
      const uid = row.values[uidHeader]?.trim() ?? "";
      if (/^[1-9]\d*$/.test(uid)) {
        uidCounts.set(uid, (uidCounts.get(uid) ?? 0) + 1);
      }
    }
  }

  const validRows: Fm24RawPlayerRow[] = [];
  const invalidRows: Fm24RawPlayerRow[] = [];
  let missingUids = 0;
  let invalidUids = 0;
  let duplicateUids = 0;

  for (const row of parsed.rows) {
    const uid = uidHeader ? (row.values[uidHeader] ?? "").trim() : "";

    if (!uid || uid === "-") {
      missingUids += 1;
      invalidRows.push(row);
      issues.push({
        code: "missing-uid",
        severity: "error",
        line: row.sourceLine,
        message: "Player row has no UID and cannot be assigned a stable identity.",
      });
      continue;
    }

    if (!/^[1-9]\d*$/.test(uid)) {
      invalidUids += 1;
      invalidRows.push(row);
      issues.push({
        code: "invalid-uid",
        severity: "error",
        line: row.sourceLine,
        uid,
        message: `UID "${uid}" is not a positive integer.`,
      });
      continue;
    }

    if ((uidCounts.get(uid) ?? 0) > 1) {
      duplicateUids += 1;
      invalidRows.push(row);
      issues.push({
        code: "duplicate-uid",
        severity: "error",
        line: row.sourceLine,
        uid,
        message: `UID "${uid}" appears more than once. All rows with this UID are excluded; no automatic merge is performed.`,
      });
      continue;
    }

    validRows.push(row);
  }

  const malformedRows = issues.filter((issue) => issue.code === "malformed-row").length;
  const summary: Fm24ValidationSummary = {
    sourceRows: parsed.rows.length + malformedRows,
    validRows: validRows.length,
    invalidRows: invalidRows.length + malformedRows,
    malformedRows,
    missingUids,
    invalidUids,
    duplicateUids,
  };

  return {
    validRows,
    invalidRows,
    issues,
    summary,
    canImport: issues.every((issue) => issue.severity !== "error") && validRows.length > 0,
  };
}
