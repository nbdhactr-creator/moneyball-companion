# FM24 Import Contract

Status: Initial contract, based on the supplied `test-for-git.csv` sample.
Format identifier: `fm24-pipe-table-v1`

## 1. Evidence and scope

The inspected sample contains 29 player rows and 119 named columns. All 29 rows contain positive numeric UIDs, with no duplicate UIDs in this sample.

This describes one observed export configuration. It does not prove that every Football Manager export view or version uses the same format. The importer must identify this format explicitly and reject unsupported structures with a useful message.

The original sample is user-provided and is not included in the public repository. Tests use synthetic player values.

## 2. Observed physical structure

- Text is UTF-8; a byte-order mark appears inside the first quoted preamble line.
- Several empty quoted lines precede the table.
- The header and each data row are pipe-delimited.
- Each complete physical table line is wrapped in a pair of double quotes.
- The first and last pipe delimit the table row; they are not data columns.
- A hyphen-only separator row follows the header and may appear between data rows.
- The sample has 119 columns and 29 complete player rows.
- No malformed-width player rows were observed in the sample.

The extension is `.csv`, but the observed table is not a conventional comma-delimited CSV. Do not parse it using comma splitting.

## 3. Parsing contract

1. Decode the uploaded file as text. The browser implementation must report a decoding/read failure rather than silently replacing undecodable bytes.
2. Remove an optional leading BOM and tolerate the observed BOM-only preamble line.
3. Unwrap the outer whole-line quote pair used by this export.
4. Find a pipe-table header containing a `UID` column (header matching is case-insensitive; original header spelling is retained).
5. Ignore blank preamble lines and hyphen-only separator rows.
6. Split cells on unquoted pipe characters and trim surrounding whitespace.
7. Require every player row to have exactly the header column count. A malformed row is reported and excluded; it is never silently truncated or padded.
8. Preserve every cell as its original trimmed string. Numeric, date, currency, range and unit parsing belongs in a later field-aware normalisation layer.

The first implementation identifies this observed format as `fm24-pipe-table-v1`. It must not claim support for arbitrary CSV/TSV exports.

## 4. Identity and validation

- `UID` is required.
- A valid UID is a positive integer represented by decimal digits.
- Blank and `-` UIDs are missing, not zero.
- Non-numeric, zero and otherwise malformed UIDs are invalid.
- If a UID occurs more than once, every row in that duplicate group is excluded from the importable set.
- Duplicate rows are never merged automatically, even if their names or other fields match.
- Duplicate or empty column names are structural errors.
- A row with the wrong number of cells is a structural error.
- The first importer version blocks committing a dataset when any error exists. It may show valid rows in the preview, but must not silently import a partial dataset.

## 5. Missing values and source preservation

The sample uses both empty cells and `-` markers. A literal numeric zero is also present (for example, `0.00`).

The parser therefore preserves:
- `"0"` and `"0.00"` as source values;
- `"-"` as a source marker;
- an empty cell as an empty string.

It does not convert any of these to JavaScript numbers or null at parse time. Later normalisation must use field-specific rules and retain the original source string.

## 6. Observed column names

The following 119 headers were present in the supplied sample, in source order:

```text
UID, Name, Position, Age, Height, Weight, Inf, Club, Division, Nat,
2nd Nat, Home-Grown Status, Personality, Media Handling, Wage,
Transfer Value, Asking Price, Expires, Preferred Foot, Yel, xG, Starts,
Red, PoM, Pen/R, Pens S, Pens Saved Ratio, Pens Saved, Pens Faced, Pens,
Mins, Gls/90, Conc, Gls, Fls, FA, xG/90, xG-OP, xA/90, xA, Con/90,
Clean Sheets, Av Rat, Mins/Gl, Ast, Hdrs A, Apps, Tck/90, Tck W, Tck A,
Tck R, Shot/90, Shot %, ShT/90, ShT, Shots Outside Box/90,
Shts Blckd/90, Shts Blckd, Shots, Svt, Svp, Svh, Sv %, Pr passes/90,
Pr Passes, Pres C/90, Pres C, Pres A/90, Pres A, Poss Won/90,
Poss Lost/90, Ps C/90, Ps C, Ps A/90, Pas A, Pas %, OP-KP/90, OP-KP,
OP-Crs C/90, OP-Crs C, OP-Crs A/90, OP-Crs A, OP-Cr %, Off, Gl Mst,
K Tck/90, K Tck, K Ps/90, K Pas, K Hdrs/90, Int/90, Itc, Sprints/90,
Hdr %, Hdrs W/90, Hdrs, Hdrs L/90, Goals Outside Box, xSv %, xGP/90,
xGP, Drb/90, Drb, Dist/90, Distance, Cr C/90, Cr C, Crs A/90, Cr A,
Cr C/A, Conv %, Clr/90, Clear, CCC, Ch C/90, Blk/90, Blk, Asts/90,
Aer A/90
```

These are source labels, not yet a complete semantic data dictionary. Abbreviations and potentially ambiguous names must remain unchanged until their meaning and units are verified.

## 7. Field groups observed

The headers suggest identity/profile, club/competition, contract, attacking, passing, defensive, aerial, physical-distance and goalkeeping groups. This is a navigation aid only; it is not a claim that every metric is applicable to every position.

Examples of values that must remain raw until field-specific parsing is implemented:
- Wage: `£4,700 p/w`
- Transfer Value: `£750K - £1.7M`
- Height: `177 cm`
- Distance: `55.4mi`
- Expires: `30/6/2029`
- Percentages such as `83%`
- Counts with grouping separators such as `1,297`

## 8. Current parser output model

The first parser returns:
- detected format identifier;
- exact source headers;
- source line number for each structurally valid row;
- raw string values keyed by original headers;
- parse/validation issues with codes, severity and source line;
- a set of rows with unique valid UIDs;
- a summary of valid, invalid, malformed, missing, invalid and duplicate UID counts.

It does not yet:
- convert metrics to numbers;
- infer units;
- resolve club/competition identity;
- merge records across seasons;
- persist data;
- run in a Web Worker;
- import data into IndexedDB.

## 9. Required follow-up samples

Before claiming broad FM24 export compatibility, test additional exports where available:
- a larger player dataset;
- a goalkeeper-heavy export;
- a view with different selected columns;
- exports containing non-ASCII names;
- a file with blank/missing values;
- a malformed or truncated file.

Any new supported format should receive its own explicit detector and tests rather than weakening this format's validation rules.
