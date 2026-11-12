# Moneyball Companion

A data-led football recruitment and squad-planning workspace.

Moneyball Companion is being built as an independent successor to the original FM24 Recruitment Lab. It will retain proven recruitment analysis while starting with a cleaner, testable, maintainable application architecture.

## Product principles

- **Evidence before decoration.** Every score and recommendation should be traceable to the data behind it.
- **Information-dense, not cluttered.** Use clear tables, filters, comparison views and purposeful visualisations.
- **Explain the reasoning.** A player score must show what contributed to it, what data is missing and where uncertainty remains.
- **Fast with large saves.** Heavy parsing and calculations should not block the interface.
- **User-owned data.** Local-first operation, explicit cloud sync, reliable backups and recoverable imports.
- **No feature regression.** Existing Recruitment Lab logic is migrated only after its behaviour is understood and tested.

## Technology direction

The planned foundation is a static web application that can be hosted on GitHub Pages using free tooling:

- TypeScript for clearer contracts and safer changes.
- Vite for development and production builds.
- Web Workers for expensive import and analysis tasks.
- IndexedDB for substantial local datasets.
- Supabase for optional authentication and cloud synchronisation, with strict row-level security.
- Automated unit and browser-level checks before releases.

The exact dependency choices will be confirmed in the architecture blueprint. No paid service is required for the initial foundation.

## Product areas

1. **Overview** — save health, squad needs, shortlist activity and recruitment priorities.
2. **Squad** — squad structure, depth, positional coverage and player profiles.
3. **Scouting** — player discovery, role fit, filters, comparisons and shortlists.
4. **Market** — contract expiry windows, free transfers and youth market.
5. **Intelligence** — club and league context, benchmarks, team comparisons and transfer history.
6. **Planning** — recruitment plan, depth chart and Director of Football evaluation.
7. **Data & Saves** — imports, data quality, season history, backups and optional cloud sync.

## Current status

The TypeScript/Vite application shell and GitHub Pages deployment are live. FM24 import, local multi-season persistence, career-scoped player identities, season history, versioned backup/restore, Scouting search, the FM24 role/philosophy scoring engine and the Planning/DoF recommendation workspace are implemented and merged. The DoF release is deployed to GitHub Pages (deployment run 43316162142 succeeded). User browser verification of the new Planning workflow remains pending.

The existing Recruitment Lab remains separate and operational.

## Project documentation

- [Product and architecture blueprint](docs/PRODUCT_BLUEPRINT.md)
- [User research and product decisions](docs/USER_RESEARCH_AND_PRODUCT_DECISIONS.md)
- [Local save and season data foundation](docs/LOCAL_DATA_FOUNDATION.md)
- [Scouting product review and roadmap](docs/SCOUTING_PRODUCT_REVIEW.md)


## Scoring methodology

The FM24 role/duty catalogue, role-score methodology, Philosophy Score principles, evidence coverage and known export limitations are documented in [Scoring Methodology](docs/SCORING_METHODOLOGY.md). The Scouting workflow status and limitations are documented in [Scouting Workspace](docs/SCOUTING_WORKSPACE.md).
