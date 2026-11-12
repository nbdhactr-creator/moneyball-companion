# User Research: Football Manager Recruitment Tools and Data Workflows

Research snapshot: 13 November 2026

## Purpose and method

This document records public user reports and current competitor capabilities relevant to Moneyball Companion. It is not a statistically representative survey. Forum posts and Reddit threads are qualitative evidence: they reveal concrete pain points and desired workflows, but do not establish how common a problem is across all Football Manager users.

Evidence is separated into:
- **Reported pain:** a user or community member describes a problem.
- **Observed product capability:** a product's own public documentation describes a feature.
- **Product decision:** our response, which is an engineering/product judgement rather than a claim made by the source.

The most recent FM26/FM27 reports are used to identify recurring workflow patterns, not to assume that the same bugs exist in FM24 or in our application.

## 1. Recurring user problems

### A. Scouting discovery is unreliable or laborious

Users describe recruitment focuses returning few or no useful players, scouting reports not appearing where expected, and having to search the player database manually instead. One Reddit discussion describes a user with a large player database who found manual filtering more dependable than recruitment focuses. Another SI community thread reports months without recruitment-focus reports and player reports appearing in the news feed but not the expected scouting area.

Sources:
- https://www.reddit.com/r/footballmanagergames/comments/1ds39yq
- https://www.reddit.com/r/footballmanagergames/comments/1qllv8b
- https://community.sports-interactive.com/forums/topic/592274-only-using-scouts-to-find-players-not-using-player-search/

**Product decision:** Moneyball Companion should make direct, deterministic player search a first-class workflow. Recruitment discovery must not depend on in-game scout recommendations. Saved filters, reusable searches, shortlist states and clear eligibility filters should reduce repeated manual work.

### B. Comparison workflows are constrained and can be misleading

Users report comparison screens that only allow comparisons against their own squad, confusing player ordering, missing or inappropriate metrics, and difficulty finding a target among large shortlists. SI forum reports also describe comparison reports failing to render and requests for sorting/filtering in comparison selection.

Sources:
- https://www.reddit.com/r/footballmanagergames/comments/1og5z9o
- https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/user-interface/2166_advanced-access-betas-ui-issues/2077_recruitment-ui-issues/player-comparison-issue-r25787/
- https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/1883_transfer-scouting-contracts-intermediaries/comparison-tool-issue-r25637/

**Product decision:** Comparison must work across any players in the active dataset, not only the user's club. Users should select two or more players from search results or shortlists, choose a role/position context, and compare relevant evidence. Do not force one generic radar chart across all positions. Use role-relevant metrics, aligned scales, clear units, and a raw-data table.

### C. Search, filters and saved views need predictable behaviour

Community reports describe filters or saved views disappearing, lists appearing empty after shortlist changes, sorting that removes expected players, and repeated navigation to configure a search. Other reports describe the need to repeatedly recreate filters and manually inspect players.

Sources:
- https://community.sports-interactive.com/forums/topic/598916-fm26-comprehensive-bug-missing-features-uiux-issues-megalist-updated/
- https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/all-other-issues/player-search-not-showing-all-players-after-latest-update-r46355/
- https://www.reddit.com/r/footballmanagergames/comments/1ghiyjo

**Product decision:** Search state must be stable and explicit. Filters, sort order, visible columns and pagination should survive opening a player profile and returning. Saved searches should be named, editable, duplicable and deletable. A zero-result state must explain which filters are active and offer a clear reset action. Sorting must never silently drop rows.

### D. Large scouting workloads create information overload

Users describe large volumes of scouting reports, report caps, inbox clutter and the risk of missing useful players. A current SI community discussion specifically reports a recruitment report list reaching roughly 99–100 entries, with newer reports replacing older unread ones.

Sources:
- https://community.sports-interactive.com/forums/topic/612937-recruitment-scouting-questions-and-observations/
- https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/user-interface/2166_advanced-access-betas-ui-issues/2075_portal-messages-user-interface-issues/advanced-settings-and-filters-not-working-cluttered-messages-r36903/

**Product decision:** The app should not mimic an inbox. It should offer persistent shortlists, saved searches, tags, notes, decision states (watching, shortlist, reject, signed, revisit), and filters by those states. Preserve user decisions across seasons and imports.

### E. Speed is a core feature, not a polish item

A community-built scouting app is explicitly positioned around reading tens of thousands of players quickly, then making search and filtering instantaneous. Its creator describes prior tools as slow or buggy. This is a strong indication that users value responsiveness across the full database, not just fast initial load.

Sources:
- https://www.reddit.com/r/footballmanagergames/comments/1uy0kto
- https://github.com/mavarobli/FMSuperScout

**Product decision:** Keep parsing and expensive calculations off the main thread. Avoid repeated full-dataset transforms on each keystroke. Use indexed local storage, cached derived calculations keyed by dataset/configuration version, and virtualised tables only when measurements show they are needed. Set performance budgets against representative large exports.

### F. Historical context and season-to-season development matter

Community spreadsheet users describe reviewing players at season boundaries, comparing per-90 output and team performance, and writing keep/sell/plan notes. Other tools advertise development tracking or history as a key capability.

Sources:
- https://www.reddit.com/r/footballmanagergames/comments/1v0mrgg
- https://github.com/mavarobli/FMSuperScout
- https://geniescout.com/

**Product decision:** A save is a container for multiple season datasets. Player identity must persist across seasons by valid FM UID. Player-season records must remain separate. Profiles should show season-by-season performance, contract snapshots, club changes and data coverage without overwriting prior seasons. User notes and decisions should persist independently from imported source rows.

## 2. Existing product capabilities and competitive baseline

This is a feature comparison from public product pages, not a hands-on benchmark.

### SortitoutSI Save Explorer

Public documentation describes uploading a save to an account, then searching players/staff, using quick filters for wonderkids, free agents, expiring contracts and listed players, saving searches, downloading CSVs, viewing detailed profiles and calculating role suitability.

Source:
- https://sortitoutsi.net/content/77841/new-fm-scouting-tool-access-your-save-from-anywhere

**Implication:** Search, saved searches, expiring contracts, player profiles and role suitability are baseline expectations. Moneyball Companion should not treat them as differentiators by themselves. Our opportunity is a transparent, export-driven, local-first workflow with season-over-season performance evidence and explainable data coverage.

### Genie Scout

Public documentation describes broad player/staff/club search, filters for attributes, ability, age, nation, division, contract, sale value and wage, role/duty searches, saved searches, player shortlists, similar-player search and side-by-side comparisons.

Sources:
- https://geniescout.com/features/
- https://geniescout.com/

**Implication:** A generic player database with filters and role scores is not enough. Moneyball Companion should focus on performance evidence, value context, squad needs and decision history, and clearly distinguish exported match-performance statistics from hidden in-game attributes or CA/PA.

### FMSuperScout

Its public repository describes a local scouting application with fast whole-save extraction, instant search/filter, role ratings, comparisons, squad-gap analysis, saved filters and development tracking. Its approach reads a running game and exposes data beyond a standard statistical export.

Source:
- https://github.com/mavarobli/FMSuperScout

**Implication:** We should not attempt to copy its live-memory extraction or hidden-attribute access. Our product has a different trust boundary: user-supplied exports, no memory reading, no fabricated hidden attributes, and analysis based on available source statistics. Its speed and workflow expectations are still useful benchmarks.

## 3. Product direction and differentiation

Moneyball Companion should be positioned as:

**A transparent, season-aware recruitment and squad-planning workstation built around the data the user actually exports from Football Manager.**

The differentiators should be:

1. **Season-over-season evidence:** identify one-season spikes, sustained performance, development and decline.
2. **Squad need before player hype:** connect positional depth, age profile, contract status and tactical requirements to recruitment priorities.
3. **Explainable role suitability:** show relevant metrics, formula version, coverage and caveats; do not imply attribute-based Genie Scout equivalence when only performance data is available.
4. **Context-aware value:** compare players within league/competition context and make league multipliers visible and editable.
5. **Persistent decisions:** saved searches, shortlists, notes and keep/sell/watch decisions survive imports and seasons.
6. **Local ownership:** no mandatory account, no default upload of private save exports, explicit backups and optional cloud sync.
7. **Reliable large-data UX:** predictable filters, stable sorting, responsive tables and background processing.

## 4. Data and persistence requirements derived from research

### Canonical entities

- Save: user-defined career container.
- SeasonDataset: one imported export with season label, in-game date if available, source metadata and import fingerprint.
- PlayerIdentity: stable FM UID and carefully managed identity metadata.
- PlayerSeasonRecord: raw source row plus normalized fields for one player in one dataset.
- Club and Competition: season-scoped source identities and normalized display names.
- ContractSnapshot: contract/value/wage fields captured from that dataset.
- UserPlayerState: user-owned notes, tags, shortlist status and decisions keyed by save + player UID.
- SavedSearch: filter definition, selected columns and sort state.
- AnalysisConfig: versioned league adjustments, role formulas and thresholds.
- ImportJob: staged/validated/committed/failed state and diagnostics.

### Import transaction

1. Select a file and detect a supported format.
2. Decode strictly and parse in a worker.
3. Validate structure, required columns, UIDs and duplicate groups.
4. Show a preview and import summary.
5. Ask which save and season the dataset belongs to.
6. Compute a deterministic fingerprint and detect likely duplicate imports.
7. Stage records in IndexedDB in bounded batches.
8. Commit dataset metadata only after all batches are written and verified.
9. On failure, mark the job failed and clean up staged rows; never display success for partial persistence.
10. Keep prior season datasets immutable. Replacing a season must be an explicit, recoverable operation.

### Storage rules

- Use IndexedDB for structured records and indexes; do not store large season payloads in localStorage.
- Keep original source values and normalized values distinct.
- Use a schema version and explicit migrations.
- Index player UID, dataset ID, club, competition and commonly filtered fields.
- Avoid duplicating the same full player rows in multiple stores.
- Include storage-quota handling and clear recovery messaging.
- Backups must include a manifest, schema version, data checksums and all user-created state. Restore must validate before replacing anything.
- Cloud sync remains optional and later; do not couple initial local persistence to Supabase.

## 5. Prioritised roadmap changes

### P0 — Trustworthy data foundation
- Strict decoding and import format identification.
- Save and season creation.
- IndexedDB repository with schema versioning.
- Atomic/staged import and rollback.
- Duplicate import detection.
- Immutable season snapshots and safe explicit replacement.
- Backup and restore with integrity checks.
- Large-file and quota failure tests.

### P1 — Useful recruitment workflow
- Canonical player identity and season history.
- Search, stable filters, saved searches and visible-column controls.
- Player profile with season-by-season evidence.
- Shortlists, notes, tags and decision states.
- Comparison across any players in the active dataset.

### P2 — Moneyball intelligence
- Role suitability with formula transparency and coverage thresholds.
- League/context adjustments with versioned configuration.
- Squad depth and age-profile assessment.
- Contract expiry, free-transfer and youth-market workflows.
- Value and recruitment-priority models.

### P3 — Planning and intelligence
- Squad scenarios and positional depth chart.
- Club/team comparisons and league benchmarks.
- Transfer history and development tracking.
- Optional account/cloud sync after local data safety is proven.

## 6. Risks and limitations

- Public forum reports are qualitative and can be version-specific, subjective or later fixed.
- Competitor feature descriptions are vendor-published; this research did not perform a full hands-on usability or performance benchmark.
- The current import contract is based on one supplied FM24 export configuration (119 columns, 29 rows). It does not establish support for every FM24 view, FM version or future FM export format.
- A valid UID establishes row identity within the observed export; it does not prove that every metric, contract field or competition label is semantically correct.
- Role suitability based on performance statistics must not be presented as a direct equivalent of attribute-based role ratings.

## 7. Sources

- Reddit — scouting UI complaints: https://www.reddit.com/r/footballmanagergames/comments/1ds39yq
- Reddit — scouting frustrations and manual player search: https://www.reddit.com/r/footballmanagergames/comments/1qllv8b
- SI Community — scouting reports and recruitment focus issues: https://community.sports-interactive.com/forums/topic/592274-only-using-scouts-to-find-players-not-using-player-search/
- SI Community — recruitment/scouting questions and report limits: https://community.sports-interactive.com/forums/topic/612937-recruitment-scouting-questions-and-observations/
- Reddit — player comparison regression: https://www.reddit.com/r/footballmanagergames/comments/1og5z9o
- SI Bug Tracker — comparison issue: https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/user-interface/2166_advanced-access-betas-ui-issues/2077_recruitment-ui-issues/player-comparison-issue-r25787/
- SI Community — FM26 UI/UX and recruitment issues: https://community.sports-interactive.com/forums/topic/598916-fm26-comprehensive-bug-missing-features-uiux-issues-megalist-updated/
- Reddit — spreadsheet-based squad review: https://www.reddit.com/r/footballmanagergames/comments/1v0mrgg
- Reddit — FMSuperScout performance and workflow: https://www.reddit.com/r/footballmanagergames/comments/1uy0kto
- FMSuperScout repository: https://github.com/mavarobli/FMSuperScout
- SortitoutSI Save Explorer: https://sortitoutsi.net/content/77841/new-fm-scouting-tool-access-your-save-from-anywhere
- Genie Scout features: https://geniescout.com/features/
- Genie Scout: https://geniescout.com/


## 8. Additional community evidence checked on 13 November 2026

A second targeted review was used to test whether the earlier themes were supported by more specific user reports. These examples add detail; they do not turn the research into a representative survey.

### Search flexibility and result correctness

- An FM24 forum user reported that the revised search conditions made OR-style combinations of attribute and contract conditions difficult or impossible to express in the way they expected. Replies also described the interface as less flexible and unintuitive. This supports a deliberate filter builder with explicit AND/OR groups rather than hidden or inconsistent condition behaviour.
  - https://community.sports-interactive.com/forums/topic/583943-why-cant-we-add-certain-filters-to-additional-conditions-in-player-searches/
- An FM26 Reddit report described a player database returning a subset of the full database and contract-expiry filters returning incomplete or unexpected results. This is a version-specific report, but it reinforces the need for transparent result counts and testable filter semantics.
  - https://www.reddit.com/r/footballmanagergames/comments/1ohvr2w
- SI community reports also describe age, attribute and contract filters returning incorrect results or behaving inconsistently.
  - https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/1883_transfer-scouting-contracts-intermediaries/search-filter-not-working-in-player-database-r30672/
  - https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/user-interface/2166_advanced-access-betas-ui-issues/2077_recruitment-ui-issues/filter-by-attributes-doesnt-work-on-player-database-r35266/

**Product decision:** Filter results must be deterministic and unit-tested. Show the active conditions and matched/total counts. Provide a one-action reset. Filters should support grouped AND/OR logic where the underlying data permits it. Never silently cap results or discard rows during sorting.

### Comparison access and selection

- SI bug reports describe comparison being restricted to a manager's squad or shortlist, and users asking for sorting/filtering when selecting from large shortlists.
  - https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/1883_transfer-scouting-contracts-intermediaries/comparison-tool-issue-r25637/
  - https://community.sports-interactive.com/bugtracker/previous-versions/1644_football-manager-26-bugs-tracker/1883_transfer-scouting-contracts-intermediaries/comparison-issue-r31245/
- The SI community's FM26 UX issue list also records saved-view reliability, shortlist refresh problems, missing player history and difficult search navigation.
  - https://community.sports-interactive.com/forums/topic/598916-fm26-comprehensive-bug-missing-features-uiux-issues-megalist-updated/

**Product decision:** Candidate comparison should be independent of in-game shortlist membership. Select candidates from any loaded dataset, search within the selection dialog, and compare with role-relevant metrics plus a raw evidence table.

### Scouting workload and organisation

- Reddit users describe being overwhelmed by dozens of recommendations and unsure how to organise shortlists, report grades, scout duration and discard decisions.
  - https://www.reddit.com/r/footballmanagergames/comments/1ok7muq
- Another discussion describes the difficulty of building a proactive shortlist before transfer windows when budgets and squad exits are uncertain.
  - https://www.reddit.com/r/footballmanagergames/comments/1th72u0

**Product decision:** Shortlists need meaningful states, tags, notes, next-review dates and filters. A recruitment plan should connect future squad exits and positional needs to saved candidate searches rather than merely accumulating names.

### Research-to-build mapping

| Community pain signal | Product response |
|---|---|
| Filters are inflexible or return confusing results | Explicit filter groups, stable result counts, deterministic tests |
| Comparison is limited to a squad/shortlist | Dataset-wide candidate selection and role-aware comparisons |
| Saved views and shortlist state are unreliable | Local persistence and explicit saved-search/decision records |
| Scouting volume becomes overwhelming | Persistent shortlist states, tags, notes and review workflow |
| Season planning is difficult | Career containers, immutable season datasets and player history |
| Large datasets make workflows slow | Worker processing, IndexedDB indexes and measured table rendering |

These findings reinforce the previously documented product direction. They do not justify importing hidden attributes, CA/PA, or any field absent from the user's export.
