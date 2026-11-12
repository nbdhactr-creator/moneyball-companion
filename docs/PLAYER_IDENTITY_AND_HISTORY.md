# Player Identity and Season History

## Purpose

This milestone establishes the data model and first user workflow for Moneyball Companion's differentiator: following the same Football Manager player across immutable season exports and comparing the evidence without overwriting history.

## Identity contract

- A player identity is scoped to a career and a valid FM UID: `saveId + uid`.
- The UID is the only automatic identity key. Names, clubs, positions and nationality are descriptive fields, not merge keys.
- The same UID in two different career saves creates two separate identity records.
- One identity can have many player-season records.
- Every player-season record remains attached to its source dataset, import job and original source line.
- Original imported values remain strings and are not modified by search normalisation.
- A normalised player-name key is stored separately to support indexed prefix search.
- Existing records are migrated in place; no source rows or season datasets are discarded.

## IndexedDB v3

### playerIdentities

| Field | Meaning |
|---|---|
| `id` | Stable key formed from career ID and FM UID |
| `saveId` | Career container |
| `uid` | FM person UID |

Indexes:
- `saveId`
- Unique `saveUid` compound index

This record intentionally contains no season-specific attributes or player biography. Current display values come from the season rows. Future user-authored metadata such as notes, tags and manual portrait mappings will reference this stable identity.

### playerRecords

Existing raw season fields remain unchanged. The `normalizedName` field is a derived search key only; it is not a replacement for the source `Name` field.

New compound index:
- `datasetName`: `[datasetId, normalizedName]`

The index supports bounded name-prefix search inside a selected dataset. The initial UI displays at most 100 matches. More advanced filter groups and result pagination remain future work.

## History query semantics

A player history request:
1. Resolves the career-scoped identity.
2. Reads that UID's player-season rows through the `saveUid` index.
3. Reads all committed season datasets in the career.
4. Returns one entry per committed season.
5. Leaves the player row absent when the UID did not occur in that season.

An absent row is represented as absence, not as a zero-stat line. Blank source values remain blank/unavailable; a literal zero remains zero.

The first Squad workflow:
- Selects a season dataset.
- Prefix-searches players in that dataset.
- Opens a player history by UID.
- Lists presence/absence across every imported season.
- Compares the two most recently imported season snapshots using original source fields.
- Shows a single-season raw field view if the career contains only one season.

The comparison currently uses import order, not inferred football chronology. Users should import seasons in chronological order for the default comparison to read as previous/latest. A future explicit season-order field can remove this assumption.

## Backup compatibility

Backup format version 2 includes player identities and an identity count in its manifest. Restore validates that identities are unique and cover every player UID referenced by season rows.

Legacy version 1 backups remain supported. Since they predate the identity store, restore derives identities from the validated player-season rows.

Restore remains additive and atomic: it creates a separate career, regenerates all local IDs and commits the identity, dataset, import-job and player records together.

## Portrait system boundary

The stable identity key is now available for future portrait mapping. Portrait files themselves are not part of this milestone.

The facepack design remains:
- User-owned local folder; never upload the entire facepack.
- File System Access API directory selection where supported, with a standard folder/file-input fallback.
- Persist a directory handle and UID-to-relative-file index where browser permissions permit.
- Lazy-load image files only when a player row/profile needs them.
- Manual correction and unmatched/ambiguous review.
- Never auto-match on player name alone.
- Keep image binaries out of player/season JSON backups and the public repository.

## Verification requirements

- Existing IndexedDB v1/v2 data migrates to v3 without losing rows.
- Repeated UID across seasons produces one identity and multiple season records.
- Same UID in separate careers produces separate identities.
- Indexed prefix search is restricted to the selected dataset.
- History includes all committed seasons and marks absence explicitly.
- Blank, dash and zero values remain distinguishable.
- Backup v2 round-trip preserves identities.
- Legacy backup v1 restore derives identities.
- Failed migrations/restores do not publish partial data.
