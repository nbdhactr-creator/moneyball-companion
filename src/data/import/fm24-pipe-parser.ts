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
  format: "fm24-pipe-table-v1" | "fm24-html-table-v1" | "unknown";
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


const HTML_ENTITIES: Record<string, string> = {
  amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  pound: "£", euro: "€", ndash: "–", mdash: "—", hellip: "…",
};

function decodeHtmlText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      const codePoint = Number.parseInt(name.slice(2), 16);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint) : entity;
    }
    if (name.startsWith("#")) {
      const codePoint = Number.parseInt(name.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint) : entity;
    }
    return HTML_ENTITIES[name] ?? entity;
  });
}

/**
 * Extracts the first HTML table whose header row contains a UID column.
 * A small tokenizer is used so this also works inside the import Web Worker,
 * where browser DOMParser is not available. Markup is treated only as data.
 */
function parseFm24HtmlExport(source: string): Fm24ParseResult {
  const tableRows: Array<{ cells: string[]; line: number }> = [];
  let currentRow: { cells: string[]; line: number } | null = null;
  let currentCell = "";
  let inCell = false;
  let ignoredTagDepth = 0;
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi;
  let match: RegExpExecArray | null;

  while ((match = tokens.exec(source)) !== null) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (!token.startsWith("<")) {
      if (inCell && ignoredTagDepth === 0) currentCell += decodeHtmlText(token);
      continue;
    }

    const tagMatch = token.match(/^<\s*(\/?)\s*([a-z0-9:-]+)/i);
    if (!tagMatch) continue;
    const closing = tagMatch[1] === "/";
    const tag = tagMatch[2].toLowerCase();
    const line = source.slice(0, match.index).split(/\r\n|\r|\n/).length;

    if (tag === "script" || tag === "style") {
      if (closing) ignoredTagDepth = Math.max(0, ignoredTagDepth - 1);
      else if (!/\/\s*>$/.test(token)) ignoredTagDepth += 1;
      continue;
    }
    if (ignoredTagDepth > 0) continue;

    if (tag === "tr") {
      if (closing) {
        if (currentRow) tableRows.push(currentRow);
        currentRow = null;
        inCell = false;
      } else {
        if (currentRow) tableRows.push(currentRow);
        currentRow = { cells: [], line };
      }
      continue;
    }
    if (tag === "td" || tag === "th") {
      if (closing) {
        if (currentRow && inCell) currentRow.cells.push(currentCell.replace(/\s+/g, " ").trim());
        currentCell = "";
        inCell = false;
      } else {
        if (!currentRow) currentRow = { cells: [], line };
        currentCell = "";
        inCell = true;
      }
      continue;
    }
    if (tag === "br" && !closing && inCell) currentCell += " ";
  }

  if (currentRow) {
    if (inCell) currentRow.cells.push(currentCell.replace(/\s+/g, " ").trim());
    tableRows.push(currentRow);
  }

  const headerIndex = tableRows.findIndex((row) =>
    row.cells.some((cell) => cell.replace(/\s+/g, " ").trim().toLowerCase() === "uid"));
  if (headerIndex < 0) {
    return {
      format: "unknown",
      headers: [],
      rows: [],
      issues: [{
        code: "header-not-found",
        severity: "error",
        message: "Could not find an HTML table header containing a UID column.",
      }],
    };
  }

  const headers = tableRows[headerIndex].cells.map((cell) => cell.trim());
  const issues: Fm24ImportIssue[] = [];
  const headerCounts = new Map<string, number>();
  for (const header of headers) {
    const key = header.toLowerCase();
    headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
  }
  for (const [header, count] of headerCounts) {
    if (!header) {
      issues.push({
        code: "empty-header",
        severity: "error",
        line: tableRows[headerIndex].line,
        message: "The HTML export contains an unnamed column. The file cannot be imported safely.",
      });
    } else if (count > 1) {
      issues.push({
        code: "duplicate-header",
        severity: "error",
        line: tableRows[headerIndex].line,
        message: \`The HTML export contains the duplicate column name "\${header}".\`,
      });
    }
  }

  const rows: Fm24RawPlayerRow[] = [];
  for (const sourceRow of tableRows.slice(headerIndex + 1)) {
    if (sourceRow.cells.length === 0 || sourceRow.cells.every((cell) => !cell)) continue;
    if (sourceRow.cells.length !== headers.length) {
      issues.push({
        code: "malformed-row",
        severity: "error",
        line: sourceRow.line,
        message: \`Expected \${headers.length} columns but found \${sourceRow.cells.length}; this row was excluded.\`,
      });
      continue;
    }
    const values: Record<string, string> = {};
    headers.forEach((header, index) => { values[header] = sourceRow.cells[index] ?? ""; });
    rows.push({ sourceLine: sourceRow.line, values });
  }

  if (rows.length === 0) {
    issues.push({
      code: "no-player-rows",
      severity: "error",
      message: "The HTML table header was found, but no player rows were found.",
    });
  }

  return { format: "fm24-html-table-v1", headers, rows, issues };
}

/**
 * Parses the FM24 pipe-table export observed in test-for-git.csv.
 * Values intentionally remain strings; type conversion belongs to a later,
 * field-aware normalisation layer.
 */
export function parseFm24Export(source: string): Fm24ParseResult {
  if (/<(?:!doctype\s+html|html\b|table\b|head\b|body\b)/i.test(source)) {
    return parseFm24HtmlExport(source);
  }

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
