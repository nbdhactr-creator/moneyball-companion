import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFm24Export, validateFm24Import } from "../../src/data/import/fm24-pipe-parser.ts";

function makeExport(dataRows, header = "UID|Name|Age|xG|Wage") {
  const wrap = (line) => `"${line}"`;
  const separator = `| ${header.split("|").map(() => "---").join(" | ")} |`;
  return [
    '"\uFEFF"',
    '""',
    wrap(`| ${header.split("|").join(" | ")} |`),
    wrap(separator),
    ...dataRows.map((row) => wrap(`| ${row.join(" | ")} |`)),
  ].join("\n");
}

test("detects the FM24 quoted pipe-table format and skips preamble/separator rows", () => {
  const parsed = parseFm24Export(makeExport([
    ["37079280", "Example Player", "24", "0.00", "£4,700 p/w"],
  ]));

  assert.equal(parsed.format, "fm24-pipe-table-v1");
  assert.deepEqual(parsed.headers, ["UID", "Name", "Age", "xG", "Wage"]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].values["Name"], "Example Player");
  assert.equal(parsed.rows[0].sourceLine, 5);
});

test("preserves zero, dash and formatted source values without coercion", () => {
  const parsed = parseFm24Export(makeExport([
    ["123", "Zero Player", "20", "0.00", "£0 p/w"],
    ["456", "Missing Player", "21", "-", "£1,250 p/w"],
  ]));

  assert.equal(parsed.rows[0].values["xG"], "0.00");
  assert.equal(parsed.rows[1].values["xG"], "-");
  assert.equal(parsed.rows[1].values["Wage"], "£1,250 p/w");
});

test("accepts unique positive numeric UIDs", () => {
  const parsed = parseFm24Export(makeExport([
    ["123", "One", "20", "0.00", "-"],
    ["456", "Two", "21", "0.10", "-"],
  ]));
  const validation = validateFm24Import(parsed);

  assert.equal(validation.canImport, true);
  assert.equal(validation.summary.validRows, 2);
  assert.equal(validation.summary.invalidRows, 0);
});

test("excludes every row in a duplicate UID group instead of merging", () => {
  const parsed = parseFm24Export(makeExport([
    ["123", "First", "20", "0.00", "-"],
    ["123", "Second", "21", "0.10", "-"],
    ["456", "Third", "22", "0.20", "-"],
  ]));
  const validation = validateFm24Import(parsed);

  assert.equal(validation.canImport, false);
  assert.equal(validation.summary.duplicateUids, 2);
  assert.deepEqual(validation.validRows.map((row) => row.values["UID"]), ["456"]);
  assert.equal(validation.issues.filter((issue) => issue.code === "duplicate-uid").length, 2);
});

test("rejects missing and malformed UIDs", () => {
  const parsed = parseFm24Export(makeExport([
    ["", "Missing", "20", "0.00", "-"],
    ["abc", "Malformed", "21", "0.10", "-"],
    ["0", "Zero UID", "22", "0.20", "-"],
  ]));
  const validation = validateFm24Import(parsed);

  assert.equal(validation.canImport, false);
  assert.equal(validation.summary.missingUids, 1);
  assert.equal(validation.summary.invalidUids, 2);
  assert.equal(validation.validRows.length, 0);
});

test("reports malformed rows and does not silently truncate them", () => {
  const parsed = parseFm24Export([
    '"\uFEFF"',
    '"| UID | Name | Age | xG | Wage |"',
    '"| --- | --- | --- | --- | --- |"',
    '"| 123 | Valid | 20 | 0.00 | £0 p/w |"',
    '"| 456 | Too short | 21 |"',
  ].join("\n"));
  const validation = validateFm24Import(parsed);

  assert.equal(parsed.rows.length, 1);
  assert.equal(validation.summary.malformedRows, 1);
  assert.equal(validation.canImport, false);
  assert.ok(validation.issues.some((issue) => issue.code === "malformed-row"));
});

test("rejects duplicate column names", () => {
  const parsed = parseFm24Export(makeExport(
    [["123", "Player", "20", "0.00", "-"]],
    "UID|Name|Age|Age|Wage",
  ));
  const validation = validateFm24Import(parsed);

  assert.equal(validation.canImport, false);
  assert.ok(validation.issues.some((issue) => issue.code === "duplicate-header"));
});


test("parses an HTML table, nested cell markup and common entities", () => {
  const html = `<!doctype html>
<html>
<body>
<table>
<tr><th>UID</th><th>Name</th><th>Age</th><th>Wage</th></tr>
<tr><td>123</td><td><span>O'Brien</span> &amp; Son</td><td>20</td><td>&pound;4,700&nbsp;p/w</td></tr>
</table>
</body>
</html>`;
  const parsed = parseFm24Export(html);
  const validation = validateFm24Import(parsed);

  assert.equal(parsed.format, "fm24-html-table-v1");
  assert.deepEqual(parsed.headers, ["UID", "Name", "Age", "Wage"]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].values["Name"], "O'Brien & Son");
  assert.equal(parsed.rows[0].values["Wage"], "£4,700 p/w");
  assert.equal(validation.canImport, true);
  assert.equal(validation.summary.validRows, 1);
});

test("applies the same duplicate UID safeguards to HTML imports", () => {
  const html = `<html><table>
<tr><th>UID</th><th>Name</th></tr>
<tr><td>123</td><td>First</td></tr>
<tr><td>123</td><td>Second</td></tr>
<tr><td>456</td><td>Third</td></tr>
</table></html>`;
  const validation = validateFm24Import(parseFm24Export(html));

  assert.equal(validation.canImport, false);
  assert.equal(validation.summary.duplicateUids, 2);
  assert.deepEqual(validation.validRows.map((row) => row.values["UID"]), ["456"]);
});

test("rejects HTML documents without a UID table header", () => {
  const parsed = parseFm24Export("<html><table><tr><th>Name</th></tr><tr><td>Player</td></tr></table></html>");

  assert.equal(parsed.format, "unknown");
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.issues[0].code, "header-not-found");
});

test("returns a clear error for an unsupported file", () => {
  const parsed = parseFm24Export("Name,Age,Club\nPlayer,20,Club");

  assert.equal(parsed.format, "unknown");
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.issues[0].code, "header-not-found");
});
