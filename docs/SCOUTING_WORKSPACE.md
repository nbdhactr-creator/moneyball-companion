# Scouting Workspace

## Status
- The original search, saved-search and decision workspace is implemented on `main` through PRs #10 and #11.
- The FM24 role/philosophy scoring layer and Scouting UI integration were merged through PR #12 into `main` (squash commit `ece5e6ce31a530f7626bb174f9537bb2d0a31af6`).
- GitHub Actions build, 45 automated tests and TypeScript/Vite production build passed. The GitHub Pages deployment job also completed successfully (run #43314079346).
- User browser testing and independent visual verification of the live page remain pending.

## Search behaviour
- Search is restricted to one selected, committed season dataset in the active career.
- Free-text search checks player name, club, position and the imported source values.
- Filter conditions support contains, equals, greater/less comparisons, and empty/not-empty checks.
- Conditions combine with an explicit AND or OR mode.
- Numeric comparisons require both values to be numeric. Blank and dash values are missing, not zero.
- Sorting is deterministic and numeric where both values are numeric.
- When calculated scores are available, results can also be sorted globally by Core Role Fit, DoF Role Evaluation, Philosophy Fit or Tactical Fit before the 200-row page is returned.
- Results are capped at 200 per query and the total match count is shown. Refine filters when the result set is larger; pagination is a follow-up.

## Saved views and columns
- Saved searches store their dataset, text query, filter conditions, AND/OR mode, visible columns and sort settings.
- Visible columns can be selected from the fields present in the imported dataset.
- Saved searches, column preferences, player decisions and role/philosophy analysis settings are stored as optional user-authored metadata on the career record. No IndexedDB schema migration is needed.
- Career backups already include the career record, so the optional scouting metadata is included in new backups and restored with the career. Older backups without this field remain compatible.

## Player decisions
Each career can store a separate scouting decision per FM UID:
- Unreviewed by default; watching, shortlist, reject, signed or revisit after a user decision.
- Free-text notes (up to 2,000 characters).
- Tags (up to 20).
- Optional next-review date.

These decisions are user-authored and never alter the original imported player-season rows. They follow the career backup/restore workflow.

## FM24 role and philosophy scoring
- The user selects one of the 115 FM24 role/duty variants and one of nine V1 philosophy templates.
- Role Fit uses the recovered V1 role weights, position strata, percentile pools, attempt floors and family aggregation.
- Philosophy Fit uses the six V1 principles and role-type weights. The nine V1 templates are retained as starting profiles.
- DoF Role Evaluation preserves V1's 90/10 core-role/aerial adjustment for DC, DLR, WB and DM roles when the required evidence exists; otherwise it remains the core role score.
- Tactical Fit combines DoF Role Evaluation and Philosophy Fit. The default is 70/30; the UI offers 60/40 and 80/20 alternatives. This ratio is a transparent product choice, not a universal research result.
- Both component scores remain visible. Tactical Fit is unavailable if either component lacks sufficient evidence; missing evidence is never converted to zero or a neutral 50.
- The scoring worker reads the full selected dataset from IndexedDB and computes the reference pools off the main thread. It does not mutate imported player rows.
- The candidate table shows core Role Fit, the V1-adjusted DoF Role Evaluation, Philosophy Fit, combined Tactical Fit, confidence/evidence status, role-family evidence and the six philosophy principle scores. It can sort all matching records by calculated fit before applying the 200-row result cap.
- Analysis settings are saved per career and are included in the existing career backup/restore path.

## Known limitations and next steps
- Custom principle-stat lists and per-role principle weights are not yet editable in V2. The nine V1 templates are currently the available starting profiles.
- Explicit league factors are supported by the scoring engine but there is not yet a settings UI for mapping and auditing competition factors. Unknown leagues are not silently adjusted.
- The player profile does not yet show a full 115-variant role-fit matrix; Scouting currently calculates the selected role/duty.
- The DoF recommendation/Planning module is not yet implemented. Tactical Fit is available in Scouting and is intended to feed the later DoF workflow without merging affordability or squad need into the footballing-fit score.
- The current dataset export cannot directly measure pressing height, compactness, line height, off-ball runs, rest-defence or exact transition timing. Pressure and other season stats are proxies, not proof of tactical behaviour.
- The first filter builder combines conditions in one AND/OR group; nested groups are not yet implemented.
- Results show the first 200 matches; next/previous page controls are planned.
- Filtering and sorting currently load the selected dataset's player records before applying conditions. Scoring itself runs in a Web Worker, but large exports still need browser profiling.
- Saved search editing/renaming and duplicate names are not supported; saving an existing name replaces it.
- Player decisions are edited within each result row. A dedicated shortlist page with bulk actions is deferred.
- Facepack linking remains deferred by product decision.

## Verification
The original Scouting tests cover AND/OR conditions, missing-value semantics, free-text search, deterministic sorting, bounded results, saved searches, columns and decisions. The FM24 scoring tests cover catalogue size, zero-vs-missing handling, role-family coverage, position eligibility, philosophy coverage, template transformations, partial-season thresholds, distance units and combined-fit missing evidence. The latest branch CI result must pass before merge; PR #12 tracks this work.
