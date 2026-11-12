# Local Save and Season Data Foundation

Status: local import, multi-season persistence, versioned career backup/restore, career-scoped player identities and the first season-history workflow are implemented, merged into main, deployed to GitHub Pages and confirmed working by the user. The first Scouting workspace foundation is implemented, merged through PRs #10 and #11, deployed to GitHub Pages and awaiting user browser verification.

## User workflow

1. Open Data & Saves.
2. Create a career container with a save name and optional current club.
3. Select the save to make it active.
4. Select a supported FM24 export.
5. Review the parser and UID validation report.
6. Enter a season label such as `2026/27`.
7. Save the season. The app confirms success only after the IndexedDB commit completes.

A save is a career container. A season dataset is an immutable imported snapshot within that save. A second import with the same file fingerprint or an existing season label is rejected; it never silently replaces existing data.

## IndexedDB schema v3

Version 3 adds a `playerIdentities` store, a unique `saveUid` identity index and a compound `datasetName` index on player-season rows. Existing player records are backfilled into one identity per `saveId + FM UID`; existing raw values and season records are preserved. A normalised name key is added for indexed prefix search, while the original source name remains unchanged.

## IndexedDB schema v2

Version 2 adds a `saveId` index to `playerRecords`. Existing version 1 databases are upgraded in place; existing records are preserved. The index lets backup export read only the selected career's player rows instead of loading player rows from every career in the browser.

## IndexedDB schema v1

Database: `moneyball-companion`.

| Store | Key | Purpose |
|---|---|---|
| `saves` | Save UUID | Career metadata and last-updated timestamp |
| `datasets` | Dataset UUID | Season label, source filename/size, format, SHA-256 fingerprint, row count and commit status |
| `playerRecords` | Dataset UUID + FM UID | One player's raw source row in one season; includes save, dataset, import-job and source-line references |
| `playerIdentities` | Save UUID + FM UID | Stable player identity within a career, independent of season rows |
| `importJobs` | Import-job UUID | Staging, committed or failed import status and diagnostics |

Indexes support save-to-dataset lookup, duplicate fingerprint detection, season-label uniqueness, dataset-to-player lookup, UID lookup across seasons and cleanup by import job.

Raw source values remain strings. This phase does not claim that every FM field has been semantically normalised. Player rows are season-scoped; the same FM UID can therefore appear in several seasons without overwriting earlier evidence. Player identity is scoped to a career plus FM UID; identical UIDs in unrelated careers remain separate. Names are search/display values, never identity keys.

## Import safety

- The worker strictly decodes UTF-8 and computes a SHA-256 fingerprint from the original file bytes.
- Only files that pass the existing parser and UID validation can be committed.
- Player rows are written in batches of 400 as staged records.
- Dataset metadata is written only after every batch succeeds.
- The dataset and import job are marked committed together in a final IndexedDB transaction.
- If a batch fails, staged records are deleted in bounded cleanup batches where possible. Uncommitted rows are not shown in the save library.
- On app launch, only staging jobs whose heartbeat (or legacy `createdAt` fallback) is older than five minutes are treated as abandoned; their staged rows are cleaned up and the job is marked failed. Active imports refresh their heartbeat between batches.
- Duplicate file fingerprints and duplicate season labels are blocked.
- Existing datasets are never overwritten by this workflow.
- Quota errors are reported without claiming that an import succeeded.

## Important browser-storage limitations

IndexedDB is local to the browser profile and origin. It is not a cloud backup. Clearing site data, using a different browser profile, private browsing, or moving to another device can make locally stored data unavailable. The application must explain this clearly.

### Career backup and restore

- Export creates a portable JSON file for the selected career only.
- The file contains the career metadata, all committed season metadata, committed import-job relationships and original player source rows.
- Backup format is versioned (`moneyball-companion-save-backup`, version 2) and includes stable player identities, a SHA-256 checksum plus record counts.
- Version 1 backups remain restorable; identities are derived from validated season rows during restore.
- Restore validates the format version, checksum, record counts, season ownership, player UID uniqueness, and season/import/player references before writing.
- Restore always creates a separate career named with a `(Restored)` suffix. It regenerates save, season, import-job and player-record IDs so the restored copy cannot overwrite or collide with the source career.
- The restored records are written in one IndexedDB transaction across all four stores. A failed transaction does not publish a partial restored career.
- The same backup can be restored more than once; each restore creates a separate copy.
- The checksum detects accidental corruption or edits; it is not a digital signature and does not prove who created the file.
- Keep exported backup files outside the browser profile. A backup stored only on the same device is not protection against device loss.

Explicit season replacement, cloud sync and conflict recovery remain separate future milestones.

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
- Upgrade existing v1/v2 databases without losing player rows; backfill one career-scoped identity per distinct save + UID.
- Confirm the same UID across seasons creates one identity and multiple immutable player-season rows.
- Search a selected dataset using its indexed normalised player-name prefix.
- Open a player history and show every committed season, explicitly distinguishing absence from zero/blank statistics.
- Confirm raw imported values remain unchanged and no calculated score is implied by the history view.
- Export a selected career and confirm the backup contains all committed seasons and raw player rows for that career only.
- Restore a valid backup and confirm it appears as a separate career while the source career remains unchanged.
- Restore the same backup twice and confirm both restored careers remain isolated.
- Reject unsupported backup versions, altered content, broken references and mismatched record counts without creating a save.
- Simulate a storage quota/transaction failure during restore and confirm no partial restored career is visible.
