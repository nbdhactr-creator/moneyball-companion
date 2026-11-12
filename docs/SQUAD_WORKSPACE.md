# Squad workspace

Updated: 13 November 2026

## Navigation
- Overview: imported club player count, age distribution and source position-label distribution.
- Players: existing searchable player database and UID-based season history.
- Tactics: FM24-style formation board, player assignment, role/duty selection and team instructions.
- Philosophy: shared club philosophy template and role/duty-specific principle weights.
- Depth & Needs: current tactical XI assignment coverage and unfilled slots.

## Tactical model
The builder uses the FM24 model and V2's existing 115-variant role/duty catalogue. Its 15 starting presets are 3-4-3, 4-2-2-2 DM AM Narrow, 4-3-3 DM Wide, 4-4-2, 4-4-2 Diamond Narrow, 4-2-4 DM Wide, 4-3-2-1 DM AM Narrow, 5-2-1-2 DM AM, 5-2-2-1 DM AM, 5-2-3 DM Wide, 5-3-2 DM WB, 4-2-3-1 DM AM Wide, 4-1-4-1 DM and 4-4-1-1 2DM, plus the existing 3-5-2 preset. Select a pitch slot to edit its assigned player, FM24 position, role/duty and exact pitch coordinates. Shirts can be dragged on the pitch with mouse or touch; sliders remain available for precise positioning. Formation changes preserve assignments for slot IDs that remain present. The player picker searches only the configured active club and requires at least two characters before showing up to 20 matches. Team instructions are grouped into In Possession, Transition and Out of Possession.

Tactic state is stored as an optional property in the career's existing ScoutingWorkspaceState in IndexedDB. Existing saves remain compatible. Formation changes preserve assignments for slot IDs that remain present.

## Philosophy
The Philosophy screen reuses the existing FM24 templates, six principle definitions and role/duty-specific custom weights. Its side panel explains each principle's source metrics, the relative 0–3 weighting, the weighted-average formula and the 60% evidence-coverage requirement. A zero weight excludes that principle; changing weights changes only score emphasis, not source statistics. It writes to the same saved analysis settings used by Scouting and Planning; there is one source of truth.

## Charts and evidence
- Age distribution uses the imported age field only where readable.
- Position counts group exact source position strings; they are not positional-competence ratings.
- Squad counts require an exact match between the configured club and imported Club field.
- Depth & Needs currently shows manually assigned XI coverage, not ranked backups or calculated role depth.

## Limitations
The FM24 export does not supply the full positional-competence matrix, tactical familiarity, event sequences or positional tracking. Player assignment is manual. Role selection represents the intended requirement, not proof of player eligibility or tactical execution. The board is a planning tool, not a match-engine simulator.

## Research basis
- Sports Interactive FM24 tactics manual: position slots can be selected to configure role, duty and instructions.
- Football Manager Squad Planner: organise player options against the active tactic's formation and role slots.
- FM Dossier: connect squad gaps to role-based discovery, feasibility and comparison.
- FMST26: reusable metric profiles, comparison pools and integrated filtering.
- FM26's dual-phase tactical visualiser is a useful later reference, but V2's initial board stays FM24-compatible with the existing scoring catalogue.
