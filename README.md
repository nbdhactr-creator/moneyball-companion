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

The initial TypeScript/Vite application shell and GitHub Pages workflow are in place. Core recruitment modules and the FM data engine are being built in phases. The existing Recruitment Lab remains separate and operational.

See [the product and architecture blueprint](docs/PRODUCT_BLUEPRINT.md) for the working plan.


## Product research

See [User Research and Product Decisions](docs/USER_RESEARCH_AND_PRODUCT_DECISIONS.md) for community pain points, competitor capabilities, product decisions and the revised roadmap.
