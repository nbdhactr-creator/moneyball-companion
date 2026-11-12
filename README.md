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

The TypeScript/Vite application shell and GitHub Pages deployment are live. The FM24 pipe-table import preview is implemented. Local save and season persistence is under review in a feature pull request; it is not yet part of the live website.

The existing Recruitment Lab remains separate and operational.

## Project documentation

- [Product and architecture blueprint](docs/PRODUCT_BLUEPRINT.md)
- [User research and product decisions](docs/USER_RESEARCH_AND_PRODUCT_DECISIONS.md)
- [Local save and season data foundation](docs/LOCAL_DATA_FOUNDATION.md)
