# Local Save and Season Data Foundation

Status: implementation in progress on `feature/local-save-season-persistence`.

## User workflow

1. Open Data & Saves.
2. Create a career container with a save name and optional current club.
3. Select the save to make it active.
4. Select a supported FM24 export.
5. Review the parser and UID validation report.
6. Enter a season label such as `2026/27`.
7. Save the season. The app confirms success only after the IndexedDB commit completes.

A save is a career container. A season dataset is an immutable imported snapshot within that save. A second import with the same file fingerprint or an existing season label is rejected; it never silently replaces existing data.

## IndexedDB schema v1

Database: `moneyball-companion`.

| Store | Key | Purpose |
|---|---|---|
| `saves` | Save UUID | Career metadata and last-updated timestamp |
| `datasets` | Dataset UUID | Season label, source filename/size, format, SHA-256 fingerprint, row count and commit status |
| `playerRecords` | Dataset UUID + FM UID | One player's raw source row in one season; includes save, dataset, import-job and source-line references |
| `importJobs` | Import-job UUID | Staging, committed or failed import status and diagnostics |

Indexes support save-to-dataset lookup, duplicate fingerprint detection, season-label uniqueness, dataset-to-player lookup, UID lookup across seasons and cleanup by import job.

Raw source values remain strings. This phase does not claim that every FM field has been semantically normalised. Player rows are season-scoped; the same FM UID can therefore appear in several seasons without overwriting earlier evidence.

## Import safety

- The worker strictly decodes UTF-8 and computes a SHA-256 fingerprint from the original file bytes.
- Only files that pass the existing parser and UID validation can be committed.
- Player rows are written in batches of 400 as staged records.
- Dataset metadata is written only after every batch succeeds.
- The dataset and import job are marked committed together in a final IndexedDB transaction.
- If a batch fails, staged records are deleted in bounded cleanup batches where possible. Uncommitted rows are not shown in the save library.
- On the next app launch, any import job left in `staging` is treated as interrupted; its staged rows are cleaned up and the job is marked failed.
- Duplicate file fingerprints and duplicate season labels are blocked.
- Existing datasets are never overwritten by this workflow.
- Quota errors are reported without claiming that an import succeeded.

## Important browser-storage limitations

IndexedDB is local to the browser profile and origin. It is not a cloud backup. Clearing site data, using a different browser profile, private browsing, or moving to another device can make locally stored data unavailable. The application must explain this clearly.

Backup export, integrity-checked restore, explicit season replacement, cloud sync and conflict recovery are separate follow-up milestones. Do not imply that they are included in this first persistence phase.

## Research-led product implications

Public Football Manager discussions repeatedly describe:
- unreliable or restrictive player search and filters;
- inability to combine conditions flexibly;
- comparisons limited to certain player pools and poor selection when shortlists are large;
- saved views or shortlist state that are difficult to trust;
- scouting information overload;
- manual scouting processes that become difficult to organise;
- desire for season-over-season player development and notes.

The design response is deterministic local search over the imported dataset, saved filters, stable sorting, persistent shortlist/decision state, cross-dataset comparison and season-aware profiles. These are roadmap requirements, not all features delivered by the save foundation.

Community reports are qualitative and often version-specific. FM26/FM27 reports are treated as workflow signals, not proof that FM24 has the same bugs. Competitor pages are vendor-published feature descriptions, not independent benchmarks.

## Acceptance checks for this phase

- Create a save and see it after reloading the page.
- Import the supplied 29-player sample as a labelled season.
- See the committed season and player count after reload.
- Import the exact same file into the same save and receive a duplicate warning.
- Attempt the same season label with a different file and receive a protected-season warning.
- Import a second season with a different label and retain both datasets.
- Reject malformed UTF-8 and structurally invalid files.
- Simulate or encounter a storage failure and verify that no partial dataset appears as committed.
- Leave a staging job behind and verify startup recovery removes its uncommitted rows.
- Confirm the app remains usable without an account or network connection after the page has loaded.
