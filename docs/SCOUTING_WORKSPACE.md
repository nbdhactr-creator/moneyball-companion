# Scouting Workspace

## Status
- The original search, saved-search and decision workspace is implemented on `main` through PRs #10 and #11.
- The FM24 role/philosophy scoring layer and Scouting UI integration were merged through PR #12. The DoF Planning workspace and editable role/duty philosophy profiles were merged through PR #14.
- Optional V1-style small-sample shrinkage was merged through PR #13. It remains off by default.
- Pagination, grouped AND/OR filters and the dedicated shortlist workflow were merged through PR #21 (merge commit `67b12946bd6a0e7ab787d6541fefad6ba5329ab4`).
- The latest main-branch GitHub Actions run (#43316843858) passed the import/domain test suite, TypeScript/Vite production build and GitHub Pages deployment.
- User manually tested the deployed Scouting and DoF workflows and reports that they work. An independent screenshot-based browser audit has not been performed.

## Search behaviour
- Result tables use clickable column headings rather than separate Sort by/Order controls. Scouting sorting applies to the full filtered result set before 50-row pagination; DoF category sorting applies before the eight-row display cap. Numeric values sort numerically, missing values remain last, and the third click restores the default ordering.
- Search is restricted to one selected, committed season dataset in the active career.
- Free-text search checks player name, club, position and the imported source values.
- Filter conditions support contains, equals, greater/less comparisons, and empty/not-empty checks.
- Conditions can be arranged into groups. Each group combines its own conditions with AND or OR; an outer AND/OR combines the groups. Existing flat saved searches are loaded as a single group.
- Numeric comparisons require both values to be numeric. Blank and dash values are missing, not zero.
- Sorting is deterministic and numeric where both values are numeric.
- When calculated scores are available, results can also be sorted globally by Core Role Fit, DoF Role Evaluation, Philosophy Fit or Tactical Fit before the 50-row page is returned.
- Results are paginated at 50 players per page. Sorting and filtering happen across the full selected dataset before the page is sliced, and the total count remains visible.

## Saved views and columns
- Saved searches store their dataset, text query, grouped filter conditions, outer AND/OR mode, visible columns and sort settings. Legacy flat conditions remain in the record for compatibility.
- Visible columns can be selected from the fields present in the imported dataset.
- Saved searches, column preferences, player decisions and role/philosophy analysis settings are stored as optional user-authored metadata on the career record. No IndexedDB schema migration is needed.
- Career backups already include the career record, so the optional scouting metadata is included in new backups and restored with the career. Older backups without this field remain compatible.

## Player decisions
Each career can store a separate scouting decision per FM UID. The Discover view supports multi-select and bulk addition to the shortlist. The dedicated Shortlist view filters shortlist/watch/revisit records. Bulk removal moves only selected players whose current status is Shortlist back to Watching; other selected statuses are left unchanged, and notes, tags and review dates are retained.
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
- The optional V1 small-sample shrinkage setting is off by default. When enabled, DoF Role Evaluation is pulled toward 50 for lower-minute samples; the raw score remains available in the tooltip and the Philosophy Score is not shrunk.
- The scoring worker reads the full selected dataset from IndexedDB and computes the reference pools off the main thread. It does not mutate imported player rows.
- The candidate table shows core Role Fit, the V1-adjusted DoF Role Evaluation, Philosophy Fit, combined Tactical Fit, confidence/evidence status, role-family evidence and the six philosophy principle scores. It can sort all matching records by calculated fit before applying the 50-row page limit.
- Analysis settings are saved per career and are included in the existing career backup/restore path.

## Known limitations and next steps
- Custom principle weights are editable; custom principle-stat lists remain deferred. The nine V1 templates remain starting profiles, not universal tactical truths.
- Explicit league factors are supported by the scoring engine but there is not yet a settings UI for mapping and auditing competition factors. Unknown leagues are not silently adjusted.
- The player profile does not yet show a full 115-variant role-fit matrix; Scouting currently calculates the selected role/duty.
- The DoF recommendation workspace is merged and deployed. It provides Best Role Fits, Upgrades, Value Options, Squad Depth and Young Targets, with editable budget/wage caps, starter selection and a measured-philosophy threshold. It preserves V1's role-led ranking by default and offers an explicit balanced mode.
- Custom six-principle philosophy weights are editable per V1 role-type/duty key and persist per career. The underlying metric membership per principle is still fixed to the recovered V1 list.
- The current V2 export has no verified league reputation mapping or transfer acceptance model. Dream-signing/stronger-league filters are therefore deliberately not claimed.
- The current dataset export cannot directly measure pressing height, compactness, line height, off-ball runs, rest-defence or exact transition timing. Pressure and other season stats are proxies, not proof of tactical behaviour.
- Filter groups currently support one nested grouping level (conditions within groups, then groups combined at the top level); arbitrary recursive subgroups are not yet supported.
- Bulk selection is scoped to the active career and selected season. Player scouting decisions remain keyed by FM UID within the career.
- Filtering and sorting currently load the selected dataset's player records before applying conditions. Scoring itself runs in a Web Worker, but large exports still need browser profiling.
- Saved search editing/renaming and duplicate names are not supported; saving an existing name replaces it.
- The dedicated shortlist view is season-scoped; cross-season shortlist aggregation and a player-profile role matrix remain future work.
- Facepack linking remains deferred by product decision.

## Verification
The Scouting tests cover legacy AND/OR conditions, grouped AND/OR logic, missing-value semantics, free-text search, deterministic sorting, pagination offsets, shortlist filtering, saved-search persistence, columns and decisions. Filter groups support one grouping level; arbitrary recursive subgroups are deferred. Shortlist views are scoped to the selected season, while scouting decisions remain career-wide and UID-keyed. The FM24 scoring tests cover catalogue size, zero-vs-missing handling, role-family coverage, position eligibility, philosophy coverage, template transformations, partial-season thresholds, distance units and combined-fit missing evidence. The latest branch CI result must pass before merge; the active Scouting workflow upgrade is tracked in its own pull request.
