# Moneyball Companion Beta 3 — release and verification

## Two major updates

1. **Role-first scouting and evidence benchmarks.** Scouting prioritises role/duty, division, minimum minutes and player/club search. Advanced filters stay available in a disclosure. Three essentials are selected by tactical role, with explicit positional peer group, division scope, metric-specific attempt floors, reference minimum minutes, median, top-fifth threshold, eligible sample count and missing-evidence explanations. A benchmark is never silently substituted when its reference group is too small. Values come from the user's local FM24 import; no fixed values are copied from the video.
2. **Shortlist comparison.** Add players directly from Scouting, open a board with up to six selected targets plus a current club starter, keep role and season fixed, and compare key evidence, Role Fit, Philosophy Fit (when configured), minutes, confidence, transfer estimates, wages and contract fields. Existing V2 shortlist statuses Watching / Shortlist / Revisit are included. Filter navigation is preserved where supported.

## Score semantics and data safety

- Model `fm24-v2.0` corrects the metadata tuple reading bug that prevented lower-is-better directions and minimum-attempt floors from being respected.
- Beta 3 explicitly opts into that corrected model. The original app continues using legacy semantics until its own model upgrade is approved. **Scores in Beta 3 can differ from Beta 2 or the original app; this is a calculation correction, not a new cosmetic score.**
- The original imported player fields are never overwritten; missing stays missing and zero stays zero. Scoring reference pools remain separate from search filters.
- Benchmarks are positional and scoped to a selected division or all divisions. No cross-league prediction, hidden fee, scouting opinion or role-appearance count is fabricated.
- Local beta shortlist selections and notes remain in the same browser's local storage and **are not included in original-app backups**. Nothing is synced across devices. Existing careers, current-app database schema and backup files are untouched.
- No private player exports or save records are committed to the repository.

## Validation gates

Run `npm test`, `npm run build`, and `node tests/browser/beta-smoke.mjs` in the CI workflow. Unit cases cover correction to direction/floors, observed zero versus missing, too-few peers, division isolation, role-specific essentials, legacy-version isolation, selection limit, and a **55,131-row synthetic-data stress check**. The browser test imports a test career and exercises filters, role report tabs, philosophy, notes, one-to-one comparison, Squad → Planning, shortlist selection and maximum-six enforcement, back navigation, and no horizontal overflow at mobile/desktop widths. Synthetic records are not a substitute for testing an individual's actual save.

## Still not included

- Automated player role-appearance records, true transfer acceptance or fee predictions, cross-device cloud synchronisation, multi-season benchmark pooling, and a validated independent iPhone/Safari run.
- The original app remains available at the repository root, while Beta 3 is at `/beta/index.html`.

## User acceptance

Open the hosted beta on the same browser and device where V2 was imported. Choose a squad slot → Find candidates → compare the three role essentials → shortlist 5–6 names → Compare shortlist → select a starter. Check the source values and peer N, try a small league or a low-minute player to verify withheld assessments, then switch reference scope and confirm Role Fit does not change. Open the original app afterwards to confirm the career and backup flow are still available.
