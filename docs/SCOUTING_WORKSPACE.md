# Scouting Workspace Foundation

## Status
Implemented on the feature branch for PR #10. The first build exposed one unused helper; it was removed. The follow-up CI run completed with all 32 unit tests passing and the production build succeeding. The latest small follow-up also ensures scouting state is reloaded after save creation, backup restore and season import; its CI run is pending. Deployment and browser verification are pending.

## Search behaviour
- Search is restricted to one selected, committed season dataset in the active career.
- Free-text search checks player name, club, position and the imported source values.
- Filter conditions support contains, equals, greater/less comparisons, and empty/not-empty checks.
- Conditions combine with an explicit AND or OR mode.
- Numeric comparisons require both values to be numeric. Blank and dash values are missing, not zero.
- Sorting is deterministic and numeric where both values are numeric.
- Results are capped at 200 per query and the total match count is shown. Refine filters when the result set is larger; pagination is a follow-up.

## Saved views and columns
- Saved searches store their dataset, text query, filter conditions, AND/OR mode, visible columns and sort settings.
- Visible columns can be selected from the fields present in the imported dataset.
- Saved searches and column preferences are stored as optional user-authored metadata on the career record. No IndexedDB schema migration is needed.
- Career backups already include the career record, so the optional scouting metadata is included in new backups and restored with the career. Older backups without this field remain compatible.

## Player decisions
Each career can store a separate scouting decision per FM UID:
- Unreviewed by default; watching, shortlist, reject, signed or revisit after a user decision.
- Free-text notes (up to 2,000 characters).
- Tags (up to 20).
- Optional next-review date.

These decisions are user-authored and never alter the original imported player-season rows. They follow the career backup/restore workflow.

## Known limitations and next steps
- The first filter builder combines conditions in one AND/OR group; nested groups are not yet implemented. Players with no saved decision are marked Unreviewed rather than being implicitly treated as watched.
- Results show the first 200 matches; next/previous page controls are planned.
- Filtering and sorting currently load the selected dataset's player records into the browser before applying conditions. This is suitable as a first implementation but must be profiled against larger exports before adding more complex filters.
- Saved search editing/renaming and duplicate names are not supported; saving an existing name replaces it.
- Player decisions are edited within each result row. A dedicated shortlist page with bulk actions is deferred.
- Comparison, role scoring, league adjustments and market eligibility are not part of this milestone.
- Facepack linking remains deferred by product decision.

## Verification
Unit tests cover AND/OR conditions, numeric missing-value semantics, free-text search, deterministic sorting, bounded results with total counts, and persistence of saved searches, columns and player decisions. CI build and deployment results are tracked in PR #10.
