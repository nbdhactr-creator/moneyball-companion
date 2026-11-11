# Moneyball Companion — Product & Architecture Blueprint

## 1. Product intent

Moneyball Companion is a practical recruitment and squad-building workstation for Football Manager. It should help answer real decisions:

- Where is the squad weak, and how urgent is the need?
- Which players fit a specific role, and how strong is the evidence?
- Which available players represent value rather than simply having high attributes?
- What will the squad look like after a signing or departure?
- Which markets and competitions are worth searching?
- How reliable and complete is the data behind each conclusion?

The product is not a generic analytics dashboard. It is a workflow tool for turning exported FM data into explainable recruitment decisions.

## 2. Experience and visual direction

### Design principles

1. **Information hierarchy over decoration.** Put the decision, its evidence and the next useful action in that order.
2. **Table-first where comparison matters.** Scouting, squad lists, contract windows and market results should use sortable, filterable tables rather than a wall of cards.
3. **Purposeful summaries.** Use compact summary metrics only when they help orient the user. Avoid decorative KPI tiles.
4. **Readable density.** Fit useful information on screen without shrinking text or cramming columns. Allow column control, sensible defaults and responsive horizontal scrolling.
5. **Progressive disclosure.** Show essential information first; reveal advanced metrics, methodology and secondary actions when needed.
6. **Consistent interaction.** Search, filters, sorting, selection, back navigation and dismissal should behave consistently across the product.
7. **Explainable analytics.** Never show a score without a route to its inputs, weighting, data coverage and relevant caveats.
8. **Quiet visual language.** Light, restrained, professional colours; typography with clear hierarchy; limited borders; no gratuitous gradients, glass effects, animated counters or oversized hero sections.

### Information architecture

Primary navigation should map to the user's work, not technical modules:

- **Overview** — current save context, squad alerts, recruitment priorities and recent activity.
- **Squad** — squad list, depth chart, positional coverage, profiles and squad assessment.
- **Scouting** — player search, role-based discovery, filters, comparisons and shortlists.
- **Market** — expiring contracts, free transfers and youth market as distinct workflows.
- **Intelligence** — club and league intelligence, team comparisons, benchmarks and transfer history.
- **Planning** — recruitment plan, squad-building scenarios and Director of Football evaluation.
- **Data & Saves** — imports, data health, seasons, backups, account and cloud sync.

Do not force every function into the primary navigation. Related tools should live in contextual sub-navigation or within the workflow where they are useful.

### Key screen behaviours

- Search opens as a deliberate focused state and can be dismissed by Escape, clicking outside, or an explicit close control.
- Every modal and overlay has predictable dismissal and focus behaviour.
- Tables retain filters and sort state when moving into a player profile and back, where practical.
- Empty states explain what is missing and how to resolve it.
- Loading, partial data, stale data, errors and success are distinct states.
- Destructive actions require clear confirmation and explain what will be affected.

## 3. Functional domains

### A. Data ingestion and identity

Responsibilities:
- Import supported FM exports.
- Parse and normalise columns.
- Validate required identifiers.
- Detect missing, duplicate and ambiguous UIDs.
- Preserve source values and distinguish zero from missing data.
- Group players, clubs and competitions reliably.
- Report import quality and actionable errors.

Rules:
- UID is the primary player identity where present and valid.
- Never silently merge ambiguous players.
- Missing statistics must not be treated as zero.
- Preserve raw source values separately from derived values.
- Large imports must not freeze the interface.


### G. Player image system

Player portraits are a first-class part of the product, but must never become a dependency for player identity or analysis.

Supported sources, in priority order:
1. **User-imported FM facepacks or image folders.** Match image filenames to FM person UIDs where the facepack follows UID naming conventions. Support bulk import and report matched, unmatched and ambiguous files.
2. **Manual profile images.** Let the user add, replace or remove a portrait for an individual player. Manual mapping must be stored against the stable player identity, not a season row.
3. **Optional external image providers.** Integrate only providers whose API terms, image rights, coverage and pricing have been checked. External provider IDs must be stored separately from FM UIDs; never assume they are interchangeable.

Image handling requirements:
- Use a neutral initials/position placeholder when no verified image exists.
- Never silently attach a photograph based on name alone when multiple players could match.
- Provide a way to correct a wrong match.
- Store image source, external provider ID where applicable, attribution/licence metadata and import date.
- Keep image binaries out of player JSON records. Store blobs in IndexedDB or a suitable object store and keep only stable references in player records.
- Generate or retain appropriately sized thumbnails; lazy-load portraits in long tables and use responsive image sizes in profiles.
- Cache locally and avoid repeatedly downloading the same image.
- Handle broken URLs, offline mode and provider rate limits without blocking player data.
- Do not bundle or redistribute copyrighted facepacks or third-party images in the public repository.
- Explain that local facepack images are user-supplied and remain under their respective licence/terms.

A useful initial release should support bulk UID-based local facepack import and manual correction before any paid or API-based provider is considered. External providers can be added later behind a provider adapter, with API credentials kept out of public frontend code where the provider requires secret keys.

### B. Football data model

Core entities to define explicitly:
- Save
- Season / dataset
- Player identity
- Player season record
- Club
- Competition / league
- Position and role
- Contract snapshot
- Transfer event
- Shortlist entry
- Recruitment requirement
- Analysis configuration

Separate stable identity from season-specific player records. Avoid storing the same large dataset redundantly in multiple caches.

### C. Analytics and evaluation

Responsibilities:
- Role suitability and role-specific scores.
- League/context adjustments.
- Raw-stat and adjusted-stat views.
- Data coverage and confidence indicators.
- Similar-player discovery.
- Positional and squad-level analysis.
- Benchmarks and comparisons.

Non-negotiable evaluation rules:
- Keep role requirements distinct; do not reward unrelated attributes simply because they are available.
- Apply minimum data-coverage thresholds before presenting a score as reliable.
- Show when a score is provisional or unavailable.
- Keep raw values accessible.
- Make weights, formulas and league multipliers versioned and inspectable.
- Regression-test migrated calculations against known V1 examples before adopting them.

### D. Recruitment workflows

- Player search and scouting filters.
- Role-specific candidate ranking.
- Player profile and evidence breakdown.
- Side-by-side comparison.
- Similar Player Finder.
- Shortlists with notes and clear removal controls.
- Contract expiry: within 6 months and within 12 months.
- Free-transfer market.
- Separate youth market.
- Recruitment Plan and positional depth coverage.
- Director of Football evaluation.
- Squad-building scenario support.

Market screens should allow selecting the user's club and should clearly distinguish eligibility, contract timing, score and data completeness.

### E. Intelligence

- Club and team intelligence.
- Team comparison.
- League intelligence and multipliers.
- Competition benchmarks.
- Transfer history.
- Best XI and positional balance.
- Data Hub and season-to-season changes.

### F. Save, local storage and cloud

- Local-first use must remain possible without an account.
- Account creation must not be required merely to open the application.
- A new account should be able to initialise an empty cloud library before the first save is created or imported.
- Cloud sync must make local/cloud state and conflicts understandable.
- Use explicit version checks and recoverable conflict handling.
- Backups must be restorable, not merely downloadable.
- Import and save operations must not report success until required persistence has succeeded.
- Large season files must be handled safely; investigate compression and binary/text boundaries rather than assuming every stored payload is JSON text.
- Never place service-role keys or private credentials in client code. Supabase browser access must use a publishable/anon key with correctly configured Row Level Security.

## 4. Technical architecture

### Proposed stack

- **TypeScript** for domain types and application logic.
- **Vite** for development and production bundling.
- **Vanilla TypeScript with small, explicit UI components** initially; avoid adding a heavy framework unless a demonstrated need justifies it.
- **Web Workers** for parsing, validation and expensive calculations.
- **IndexedDB** for local datasets and durable browser storage.
- **Supabase** as optional authentication and cloud persistence.
- **Vitest** for unit and domain tests.
- **Playwright** for essential end-to-end workflows.
- **GitHub Actions** for build, type-check, tests and GitHub Pages deployment.

Use stable, pinned dependency versions and keep the dependency list small. All initial tooling should be free to use.

### Proposed folder structure

```text
moneyball-companion/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── docs/
│   ├── PRODUCT_BLUEPRINT.md
│   ├── DATA_DICTIONARY.md
│   ├── SCORING_METHODOLOGY.md
│   └── TEST_PLAN.md
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── bootstrap.ts
│   │   ├── router.ts
│   │   └── state/
│   ├── domain/
│   │   ├── players/
│   │   ├── clubs/
│   │   ├── competitions/
│   │   ├── saves/
│   │   └── recruitment/
│   ├── data/
│   │   ├── import/
│   │   ├── normalise/
│   │   ├── validation/
│   │   └── repositories/
│   ├── analytics/
│   │   ├── roles/
│   │   ├── league-context/
│   │   ├── similarity/
│   │   ├── benchmarks/
│   │   └── squad/
│   ├── features/
│   │   ├── overview/
│   │   ├── squad/
│   │   ├── scouting/
│   │   ├── market/
│   │   ├── intelligence/
│   │   ├── planning/
│   │   └── data-saves/
│   ├── infrastructure/
│   │   ├── storage/
│   │   ├── cloud/
│   │   └── workers/
│   ├── shared/
│   │   ├── components/
│   │   ├── tables/
│   │   ├── charts/
│   │   ├── utils/
│   │   └── styles/
│   └── styles/
├── tests/
│   ├── unit/
│   └── e2e/
└── .github/
    └── workflows/
```

This is a target structure, not a requirement to create empty folders for every item immediately. Add modules when their boundaries are understood.

### Performance strategy

- Parse large exports in a Worker so the interface remains responsive.
- Stream or chunk data where practical; avoid retaining duplicate raw and parsed copies unnecessarily.
- Persist large datasets in IndexedDB rather than repeatedly serialising them into localStorage.
- Use indexes for frequent player, club, UID and competition lookups.
- Cache derived analysis by dataset version and scoring configuration.
- Paginate or virtualise genuinely large result tables after measuring real bottlenecks.
- Lazy-load secondary workflows and charts.
- Keep UI rendering separate from calculation logic.

### Deployment and security

- Host the static application on GitHub Pages.
- Build and deploy through GitHub Actions.
- Treat all deployed frontend code and configuration as public.
- Use Supabase Row Level Security to isolate each user's records.
- Never embed service-role secrets in the frontend or repository.
- Keep local-only mode functional if cloud services are unavailable.

## 5. Migration strategy from Recruitment Lab V1

V1 is the reference implementation and remains operational. V2 is not a copy of V1's codebase.

Migration process:
1. Inventory each V1 feature and its dependencies.
2. Identify the underlying business rules and data contracts.
3. Capture representative input/output examples from proven calculations.
4. Implement domain logic in isolated V2 modules.
5. Compare V2 output against V1 on the same datasets.
6. Add regression tests for confirmed behaviour.
7. Rebuild the workflow in the new interface.
8. Test import, persistence, backup, restore and cloud conflict handling.
9. Only then mark a feature as migrated.

Do not migrate bugs or unexplained formulas simply because they exist in V1.

## 6. Delivery phases

### Phase 0 — Definition
- Confirm product map and visual principles.
- Inventory V1 features and scoring logic.
- Define canonical data model and import contract.
- Agree on acceptance tests.

### Phase 1 — Foundation
- TypeScript/Vite project.
- Build, lint/type-check and test commands.
- GitHub Actions CI and Pages deployment.
- Application shell, navigation and design tokens.
- Local database abstraction.

### Phase 2 — Data engine
- Import worker.
- Normalisation and UID validation.
- Data-quality report.
- IndexedDB persistence.
- Large-file and malformed-file tests.

### Phase 3 — Analytics engine
- Role scoring.
- League adjustments.
- Coverage/confidence explanations.
- Similarity and comparison calculations.
- Regression tests against V1.

### Phase 4 — Core recruitment workflows
- Squad and player profiles.
- Scouting and shortlists.
- Contract expiry and free-transfer markets.
- Youth market.
- Recruitment Plan and DoF evaluation.

### Phase 5 — Intelligence and planning
- Club/team comparisons.
- League intelligence and benchmarks.
- Transfer history.
- Squad planning and Best XI.

### Phase 6 — Accounts and cloud
- Optional account flow.
- Empty cloud library initialisation.
- Sync, conflict handling and recovery.
- Backup and restore verification.

### Phase 7 — Release readiness
- End-to-end regression.
- Mobile and desktop usability.
- Accessibility and keyboard behaviour.
- Performance checks on large exports.
- V1/V2 calculation parity review.

## 7. Definition of done

A feature is not complete just because it renders.

It must:
- Have a clear user purpose and place in navigation.
- Work with valid, missing and malformed data as appropriate.
- Explain loading, empty, error and success states.
- Preserve user data and recover from failures.
- Have tests for important calculations and interactions.
- Be usable by keyboard and on mobile.
- Avoid unnecessary visual complexity.
- Be verified in the actual deployed environment before being called live.
