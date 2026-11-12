# Scouting product review and development direction

Updated: 13 November 2026

This review compares the current Moneyball Companion V2 implementation with the separately maintained Recruitment Lab V1, other Football Manager scouting tools, and selected real-world football recruitment platforms. It is a product and workflow review, not a claim that the platforms use identical data or scoring methods.

## Executive assessment

V2 has a stronger engineering foundation than V1: TypeScript, modular domain logic, IndexedDB, Web Workers, automated tests, explicit missing-data handling and career-scoped identities. Its FM24 role/philosophy engine and DoF recommendation logic have been migrated into a more testable structure.

V1 remains a useful product reference because it covers a broader end-to-end manager workflow. V2 should recover the most valuable workflows without importing V1's monolithic architecture or reproducing features whose source data is not available.

The most immediate usability correction is consistent table interaction. Result tables should sort from their column headings, not separate Sort by and Order controls. Sorting must apply before pagination or display limits, numeric fields must sort numerically, missing values must remain last, and the active direction must be visible.

## 1. What Recruitment Lab V1 already established

The V1 custom-build tutorial and application cover a wider workflow than the current V2 foundation:

- Home dashboard: squad gaps, weakest tactical slots, contract windows, shortlist pipeline, recent changes and recruitment suggestions.
- DoF Picks: Dream, Upgrade, Value, Squad Player and Prospect categories, plus feasibility filters and exclusion explanations.
- Player profiles: role assessment, percentiles, philosophy principles, strengths/weaknesses, season progress, role alternatives, notes and scouting pipeline.
- Explore: role search, profile search, prospects, risers, custom filters, saved searches and league adjustment.
- Compare: up to four players, role lens, comparison pools and percentile-based comparisons.
- Scatter: plot two metrics, select clusters and move candidates to shortlist or comparison.
- Shortlist: first-team and prospect lists, recruitment stages, added-at score, shadow squad and notes.
- Tactic & best XI: formations, role assignments, player placement, positional eligibility and squad benchmarking.
- Philosophy: editable principle metrics, role weights, style templates and extra search positions.
- Scouting reports: printable one-page report with facts, verdict, percentile profile, role fit, comparison and notes.
- Season tracking: repeat imports, player progress, risers and shortlist score changes.
- Club Finder: squad readiness and positional gaps by club, using the selected tactic.

V2 has intentionally recovered some of the underlying scoring and recommendation logic, but most of these broader workflows remain planned rather than implemented. The current V2 export model must be checked before promising exact V1 parity.

Reference: [Recruitment Lab V1 custom-build repository](https://github.com/nbdhactr-creator/FM24-Recruitment-Lab-Save-Journal/tree/recruitment-lab/custom-build).

## 2. Football Manager scouting tools

### FM Scouting Tool 26 (FMST26)

The current FMST26 description lists percentile/distribution analysis, custom metrics, custom comparison pools, position benchmarks, relative and field-vs-field filtering, grouped filters, shortlists, additional player columns, save-change detection and auto-refresh. It is a read-only live-memory tool, so its data access model is fundamentally different from V2's imported season exports.

Useful lessons for V2:
- Let users define reusable metric profiles rather than relying only on one fixed view.
- Support comparison against a chosen player pool, with the pool clearly described.
- Keep filtering, grouping, shortlist and table columns integrated.
- Track changes between snapshots without overwriting historical evidence.

Do not copy live-memory claims or assume V2 can access CA/PA, contract or world data unless the imported file actually contains those fields.

Reference: [FM Scout — FMST 26](https://www.fmscout.com/a-fmst-26.html).

## 3. Real-world recruitment and scouting platforms

### Hudl StatsBomb IQ

StatsBomb's recruitment material describes a process of identification, shortlisting and evaluation. It supports role-specific metric filters, saved searches, similarity search and tailoring metric importance to the role or target profile. Its similar-player material stresses that statistical similarity is a starting point, not proof of equal ability, potential, value or interchangeability.

Useful lessons:
- Separate discovery from evaluation.
- Make player-profile criteria role-specific.
- Save repeatable searches.
- Add similar-player discovery with dimension-by-dimension explanations.
- Keep statistical fit separate from value and recruitment feasibility.

References:
- [StatsBomb — Using StatsBomb for Player Recruitment](https://blogarchive.statsbomb.com/articles/soccer/using-statsbomb-iq-for-player-recruitment/)
- [StatsBomb — Finding Similar Players](https://blogarchive.statsbomb.com/articles/soccer/finding-similar-players/)
- [StatsBomb — Full-back recruitment profiles](https://blogarchive.statsbomb.com/articles/soccer/using-statsbomb-iq-for-player-recruitment-full-backs/)

### Hudl Wyscout

Wyscout combines video, tagged match events, player data, search, comparison, reports and shared shortlists. Its main lesson is that statistical discovery should lead into contextual review, not end at a score.

V2's standard FM24 season export does not contain tagged video events. We should provide a clear evidence checklist and user notes now, and only add clips/video when the user supplies a supported source or the app has a lawful integration.

Reference: [Hudl Wyscout FAQ](https://www.hudl.com/products/wyscout/faq).

### Tifolab

Tifolab describes per-90 normalisation, percentiles within position and league, player comparison, and value/context exploration. The useful lesson is to label the comparison population beside every percentile and avoid comparing unlike player roles or competition contexts without explanation.

Reference: [Tifolab — About](https://www.tifolab.com/about).

### Football Manager's recruitment direction

Sports Interactive's recruitment-revamp material emphasises a consolidated recruitment hub, player search, recruitment focuses, scouting coverage, recommendations and more contextual transfer history. V2 should similarly keep workflows connected, but not collapse every function into a crowded single screen.

References:
- [Football Manager — Recruitment Revamp](https://www.footballmanager.com/features/recruitment-revamp)
- [Football Manager — FM26 recruitment revamp with TransferRoom](https://www.footballmanager.com/fm26/features/powered-transferroom-fm26s-recruitment-revamp)

## 4. V2 source-level interface audit

The deployed app was reported by the user to work in live testing. This audit inspects the current source and workflows; it is not a fresh screenshot-based browser audit.

### Corrected in this development branch

- Removed the separate Sort by and Order controls from Scouting.
- Added clickable headings for visible source columns and all four calculated scores.
- Added active ascending/descending indicators and accessible sort labels.
- Sorting remains global across the filtered season before the 50-player page is sliced.
- Added click-to-sort to DoF category tables. Sorting is applied to the full category before the eight-row display cap.
- Added click-to-sort to Squad search results. The indexed name-prefix search now collects all matching records, sorts them, and only then applies the 100-result display limit.
- Numeric values sort numerically; blank values remain at the bottom; UID is the deterministic tie-breaker.
- The third click restores the default order (name for Scouting/Squad, recommendation order for DoF).

### Existing strengths to preserve

- Calm, light visual direction.
- Table-first presentation for player comparison.
- Filters and saved searches.
- Clear separation of Role Fit, DoF Evaluation, Philosophy Fit and Tactical Fit.
- Evidence coverage and confidence.
- Explicit missing-data semantics.
- Career-scoped decisions and notes.
- Local-first persistence and backup/restore.

### Remaining usability opportunities

- Add a proper player comparison workspace (V1 supports four players) with a shared role lens, same comparison pool, per-90 values where supplied, percentiles and evidence coverage.
- Expand player profiles from raw source-field comparison into a structured report: identity/context, role fit, philosophy principles, key strengths, weaknesses, missing evidence, season progression and scouting notes.
- Add Similar Player Finder only after implementing and testing a transparent role-normalised distance method. Explain which dimensions drive similarity and how much evidence overlaps; do not describe similarity as equal quality.
- Build squad depth and positional-needs views around a user-selected tactic/formation, but do not infer a formation from season statistics.
- Add market workflows for contract expiry, free agents and youth only where the relevant fields exist and have been validated.
- Add exclusion reasons and data-quality explanations to recruitment recommendations.
- Persist table sort state per view/search when it is useful, rather than unexpectedly sharing unrelated table sort preferences.
- Add keyboard focus, touch-friendly table headers and mobile overflow checks to all sortable tables.
- Consider a compact table-density control and user-managed visible columns; avoid shrinking text to fit every statistic.
- Keep raw imported values accessible from every analytical profile.

## 5. Squad workspace implementation direction

The next major workflow is the club's Squad workspace. Keep tactical configuration, club philosophy, player records and squad assessment connected but separately navigable. The FM24 tactical board is the correct initial reference because V2's current role catalogue and imported data are FM24-based. FM26's dual in-possession/out-of-possession formations and role redesign should be treated as a later, separately versioned tactical model rather than mixed into the FM24 role catalogue.

Useful references: [FM24 tactics manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024/tactics-r4960/), [FM Squad Planner](https://www.footballmanager.com/features/recruitment-revamp), [FM Dossier Analysis](https://fmdossier.dev/features/analysis), [FM Dossier Recruitment](https://www.fmdossier.dev/features/recruitment), [FMST26](https://www.fmscout.com/a-fmst-26.html), [FM26 tactical evolution](https://www.footballmanager.com/fm26/features/in-possession-out-possession-fm26s-new-tactical-evolution).

## 6. Recommended development sequence

1. Complete and verify consistent sortable tables (this branch).
2. Build player comparison as a reusable cross-workspace feature.
3. Upgrade player profiles into evidence-led scouting reports.
4. Add squad structure, depth and recruitment-priority analysis.
5. Build Market workflows: 6-month contracts, 12-month contracts, free transfers and youth market.
6. Add Intelligence: competition benchmarks, club comparison and league-factor configuration.
7. Add similar-player search after its distance model and failure modes are documented and tested.
8. Add optional video/evidence references only when supported by user-provided assets or a verified integration.

## 7. Data and methodology guardrails

- A field absent from an export is unavailable, not zero.
- Do not label FM season-stat proxies as direct measurements of pressing height, compactness, rest-defence, off-ball movement or tactical execution.
- Do not invent transfer acceptance, league reputation, medical risk, personality or player potential.
- Keep footballing fit separate from affordability, wage, contract and squad need.
- Show the selected role, duty, competition/position pool and evidence coverage alongside any score.
- Similarity is not ability, potential, value or tactical interchangeability.
- Video and qualitative scouting remain necessary for validating context.

## 8. Source notes

This review uses the V1 custom-build tutorial and repository, V2's current product blueprint and scoring methodology, and the linked public platform documentation/articles above. Platform capabilities vary by package and product version. These references inform workflow design; they do not validate V2's numerical weights.
