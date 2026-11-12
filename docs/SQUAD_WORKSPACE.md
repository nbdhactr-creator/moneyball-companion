# Squad workspace

Updated: 13 November 2026

## Navigation
- Overview: imported club player count, age distribution and source position-label distribution.
- Players: existing searchable player database and UID-based season history.
- Tactics: FM24-style formation board, player assignment, role/duty selection and team instructions.
- Philosophy: shared club philosophy template and role/duty-specific principle weights.
- Depth & Needs: current tactical XI assignment coverage and unfilled slots.

## Tactical model
The initial builder uses the FM24 model and V2's existing 115-variant role/duty catalogue. It includes 4-3-3 DM Wide, 4-2-3-1 Wide, 4-4-2 and 3-5-2. Select a pitch slot to edit its player and role/duty. Team instructions are grouped into In Possession, Transition and Out of Possession.

Tactic state is stored as an optional property in the career's existing ScoutingWorkspaceState in IndexedDB. Existing saves remain compatible. Formation changes preserve assignments for slot IDs that remain present.

## Philosophy
The Philosophy screen reuses the existing FM24 templates, six principle definitions and role/duty-specific custom weights. It writes to the same saved analysis settings used by Scouting and Planning; there is one source of truth.

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
