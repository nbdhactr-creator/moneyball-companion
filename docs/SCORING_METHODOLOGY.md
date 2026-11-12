# FM24 Role and Philosophy Scoring

## Status

- **Implemented on feature branch:** the FM24 role/duty catalogue, V1-derived role and philosophy calculations, role-family evidence, the six philosophy principles, nine V1 templates, evidence coverage, league-factor hooks, V1's separate aerial adjustment for DoF evaluation, and an optional combined Tactical Fit score.
- **Scouting integration implemented:** select a role/duty and philosophy template; calculate across the full selected season in a Web Worker; show Role Fit, DoF Evaluation, Philosophy Fit, Tactical Fit, confidence and compact evidence breakdowns.
- **Source baseline recovered:** Recruitment Lab V1's actual role, philosophy, template and DoF candidate-ranking logic were inspected from its `recruitment-lab/custom-build` branch.
- **Not yet integrated into Planning/DoF recommendations.** V2's Planning module remains a placeholder. The scoring outputs and V1 DoF evaluation primitive are ready for that workflow, but the five recommendation categories, budgets, wage caps and feasibility filters are not yet built.
- **CI and deployment status:** see the latest pull request checks. This branch is not deployed to the live website.

## Scope and terminology

The V1 catalogue contains **115 selectable role/duty variants**, not 115 distinct role names. It covers FM24's role/duty combinations, including Defend, Support, Attack and role-specific duties such as Stopper, Cover and Automatic. FM24's role selector describes each role and appends duty-specific behaviour; duties affect the risk and instructions expected from the player. See the official [Football Manager 2024 tactics manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024/tactics-r4960/).

The catalogue contains 83 source/derived metric definitions and 45 role-type philosophy weight profiles. The role IDs, metric names, weights and metadata are adapted from Recruitment Lab V1 under its MIT licence. The licence notice and attribution are retained in the source file and this project document.

## 1. V1 role-score baseline

The recovered V1 role score is not a simple average of raw statistics or FM attributes.

1. Each role/duty has a configured set of performance metrics and weights.
2. Each metric is converted to a percentile within the role's FM position stratum (goalkeeper, centre-back, full-back, wing-back, defensive midfield, central midfield, wide midfield, attacking midfield, wide attack or striker).
3. The reference pool requires at least 900 minutes per player by default and at least 10 eligible players for a metric percentile to be calculated. V1 scales the pool threshold and confidence thresholds when an import represents a partial season; V2 now estimates season progress from the 26th-highest minute total among the top 50 players and applies the same 0.25/0.5/0.75/1.0 progress bands.
4. Negative-direction metrics are inverted. Tied values use a mid-rank percentile.
5. Metric attempt floors are applied where configured (for example, a rate with too few attempts is not treated as reliable).
6. Correlated metrics are grouped into evidence families. The family contributes its strongest configured weight, not the sum of every overlapping metric. Available metrics inside a family are averaged using their configured weights.
7. The score is available only when at least 60% of total family weight is represented and at least one highest-weight family is measured.

This family approach reduces obvious double-counting: several closely related chance-creation or defensive-volume columns cannot dominate merely because the export contains more variants of that same action.

The V1 role score is a **within-dataset screening percentile**, not an absolute ability rating, a match-rating prediction or a transfer-success probability. V1 also offers an optional small-sample shrinkage switch: below the high-confidence minute threshold, a score is pulled toward 50 using a square-root minutes weight. It is off by default.

## 2. V1 Philosophy Score baseline

V1 evaluates six principles:

| Principle | V1 evidence metrics | Interpretation |
|---|---|---|
| Keep the ball | Pass completion, loss rate | Ball security and circulation |
| Always available | Passes attempted per 90 | Participation in circulation |
| Move it to hurt | Progressive passes, open-play key passes, xA, dribbles | Progression and creation |
| Win it back quickly | Pressures attempted/completed, possession won | Pressure and regains |
| Defend on the front foot | Interceptions, tackle success, aerial success | Proactive defending and duels |
| Intensity | Distance per 90, sprints per 90 | Repeat physical output |

Each principle is calculated from the mean of its available metric percentiles in the player's role position group. Each role type has a six-value weight profile from 0 to 3. A role's philosophy score is the weighted average of measured principles. V1 requires 60% of the total configured principle weight to be available. It does not require a highest-weight principle to be measured.

V1 also includes editable principle metrics, role weights, extra search positions and nine starting style templates (Possession, Counter-press, Direct, Balanced, Low block and counter, Wing play, Positional play, High-intensity press and Physical).

### How V1 uses Philosophy in recruitment

The recovered DoF implementation keeps Role Score and Philosophy Score as separate outputs rather than averaging them into one score:
- Dream, Upgrade and Squad Player groups are sorted by role evaluation score, with Philosophy Score as the tie-breaker when role scores are equal.
- The Value group is ranked by its role-score improvement per transfer-value unit; Philosophy Score is calculated and shown, but is not the primary value-ratio formula.
- The Prospect group is ranked using its age-group-adjusted role score; Philosophy Score is still attached to the candidate for display/filtering.
- By default, a measured Philosophy Score below 50 is a blocker ("against the idea"). This can be switched off. A missing Philosophy Score does **not** trigger the blocker.
- Recommendation cards show a Philosophy band and score, and the player/scouting report exposes the six principle breakdowns.
- Upgrade explanations include the Philosophy Score when it is available.

This distinction matters: V1 does not calculate a universal weighted Role + Philosophy average. It uses Role Score as the main performance ranking, Philosophy as an independent fit signal, a secondary tie-break in most categories, and an optional minimum-fit filter. V2 should preserve that transparent baseline while offering an explicitly labelled, configurable combined view as an additional ranking mode.

The DoF role evaluation also has a separate, limited aerial adjustment for centre-back, full-back, wing-back and defensive-midfield strata: 90% core role score and 10% aerial score, when both aerial quality and output are available. Aerial quality is the position-group percentile for header win percentage; aerial output is the mean percentile of headers won per 90 and key headers won per 90 where available. Missing aerial evidence leaves the core score unchanged. This is a V1-specific adjustment, not part of the general role formula. V2 exposes it as a separate DoF Evaluation value so the unadjusted Role Fit remains visible.

## 3. Improvements in the V2 calculation layer

### Evidence quality

- Every role metric reports its raw/normalised value, percentile, configured weight and availability reason.
- Role results report family-by-family evidence, weighted coverage and minute-based confidence.
- The V1 partial-season progress estimate is retained: the 26th-highest minute total among the top 50 players is compared with 4,400 minutes; pool and confidence thresholds scale to the estimated 25%, 50%, 75% or full-season band.
- The optional V1 small-sample shrinkage switch is retained and off by default. When enabled, DoF Role Evaluation is pulled toward 50 by the square root of minutes divided by the progress-adjusted high-confidence threshold. The raw core Role Fit remains visible; Philosophy Fit is not shrunk.
- Each philosophy principle reports its metric coverage and component percentiles.
- A principle with multiple metrics needs at least 60% of its own metrics measured before it contributes. This is a V2 evidence-quality improvement over V1, which allowed a principle to contribute from any one available metric.
- Missing values stay missing. A genuine zero stays zero.
- Advanced metrics that are entirely absent in a sufficiently large competition are inferred as missing rather than interpreted as a league of players who all recorded zero. The inference uses a minimum league sample and a cross-dataset presence check; small samples are left unclassified.

### Units

V1's source parser stripped unit suffixes. The V2 calculation layer converts an explicitly labelled distance in miles to kilometres before calculating distance per 90. A distance value without a unit is not silently labelled kilometres; the derived metric remains unavailable.

### League adjustment

V1 supports league-strength adjustment of per-90 volume metrics while leaving percentages and efficiency rates unscaled. The V2 calculation layer supports explicit league factors and applies them only to rate/volume metrics. It does not silently assign an unverified factor to an unknown competition. A future UI should expose the factor, source, effective date and whether it is manual or mapped. League adjustment must remain optional and inspectable.

### Combined tactical fit

The engine exposes a separate **Tactical Fit** indicator:

- 70% DoF role evaluation (the core role score, plus V1's 10% aerial adjustment for DC, DLR, WB and DM roles when both aerial quality and at least one aerial-output percentile are available)
- 30% philosophy fit

This is a transparent starting product setting, not a scientifically established universal ratio. It should be configurable (within a bounded range) and both component scores must remain visible. If either component is unavailable, the combined score is **incomplete**, not a fabricated 50 or zero.

The core Role Fit and DoF role evaluation remain separately visible. Affordability, wage, contract, age, transfer feasibility and squad need must remain separate recruitment dimensions. They should not be hidden inside a footballing-fit number.

## 4. What real-world football research changes

Research supports a multidimensional model rather than one generic “style” label:

- A critical review of soccer playing-style research identifies recurring dimensions including possession, directness, crosses, high press, progression, defensive pressure, transitions and width. The dimensions vary by study and data source; no single short list is a complete universal taxonomy. [Identifying Soccer Teams' Styles of Play: A Scoping and Critical Review (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10123610/)
- A 2024/2025 grounded-theory study describes playing styles across game phases, including established attack/defence and attacking/defensive transitions. It distinguishes possession/direct play, progression speed, passing tempo, high/deep pressing and counterpressing. [A grounded theory for professional soccer teams' playing styles](https://doi.org/10.1177/17479541241300605)
- A 2025 study derives four interpretable styles from event-based possession metrics using PCA and Varimax rotation, reinforcing that styles emerge from combinations of behaviours rather than a single statistic. [Data-driven approach to defining football styles in major leagues](https://doi.org/10.1016/j.chaos.2025.116926)
- A 2026 open-access study on a context-adjusted, position-specific Player Stat Index warns that observed actions are shaped by tactical role, team possession, teammates, opposition, score state and opportunity. It retains multiple task domains rather than treating one scalar as a complete player profile. [From player actions to player profiles](https://doi.org/10.1177/22150218261497769)

The practical consequence for Moneyball Companion: the Philosophy Score should be described as a **role-weighted match-output alignment indicator**, not proof that a player will execute a team's game model. The role score and philosophy score are useful screens; they do not replace video, scouting or tactical judgement.

### FM24 template fidelity

The nine V1 philosophy templates are retained as explicit transformations of each role type's six baseline weights. V2 uses the same transformations and role-specific exceptions (including goalkeeper exceptions for Low Block, Wing Play, Positional Play, High-intensity Press and Physical). The template names and descriptions follow V1. Templates are starting profiles, not claims that every team using a broad label behaves identically. Users should be able to tune principle weights after applying a template.

## 5. What an FM24 player-search export cannot prove

The supplied FM24 export contains season-level player statistics and player/club metadata. It does not contain event sequences or positional tracking. Therefore, it cannot directly measure:

- whether pressure occurred within five seconds of a turnover;
- the team's actual pressing height, defensive line or compactness;
- the player's average position, spacing, width or occupation of half-spaces;
- the timing and direction of off-ball runs;
- rest-defence structure or counterpress coverage;
- the exact build-up pattern, passing lanes or transition speed.

Pressures, possession won, progressive passes, crossing and distance can be used as **proxies**, but their interpretation is conditional on the player's role and team context. A high pressure count can reflect team exposure or assignment, not necessarily better pressing. A high pass count can reflect team possession, not automatically superior availability.

FM24's own manual explains that positional comfort affects performance and that a player can be used outside a natural position when their attributes and tactical structure support it. The current V2 export foundation preserves the position string, but it does not yet model FM's full 1–20 positional competence ratings. Out-of-position candidates must therefore be tagged for review, not silently treated as normal role fits. [Football Manager 2024 Players manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024/players-r4958/)

## 6. DoF and Scouting presentation requirements

The planned user interface should show:

1. **Role Fit** — score, role/duty, percentile group, coverage, confidence and metric-family breakdown.
2. **Philosophy Fit** — score, selected club style/profile, six principle scores, role weights and missing evidence.
3. **Tactical Fit** — configurable composite, only when both component scores are measurable.
4. **Recruitment feasibility** — value, wage, contract, age, league step and likely interest, shown separately.
5. **Recommendation reason** — explicit strengths, weaknesses, data gaps and why the player appears in a recommendation category.

A Philosophy Score below a threshold should be a configurable filter or warning, not an unexplained hard rejection. Missing evidence should be labelled “insufficient evidence” and should not be interpreted as poor fit.

### DoF ranking policy recommended for V2

Until a user deliberately changes the ranking mode, preserve the V1 interpretation:
1. Apply hard feasibility filters only when the underlying data exists (budget, wage, contract, league step and user-enabled philosophy threshold).
2. Rank candidates by role evaluation score.
3. Use Philosophy Score as a tie-breaker and a visible independent fit indicator.
4. Offer a separate "Balanced Tactical Fit" mode that uses the configurable composite. Its weight must be visible and editable; do not present 70/30 as research-derived.
5. Keep the five recruitment categories (Dream, Upgrade, Value, Squad Player and Prospect) distinct. Their eligibility rules differ; one generic sort order would distort their purpose.
6. Explain every exclusion and keep a list of high-scoring excluded candidates with reasons.
7. If a philosophy score is unavailable, keep the player eligible unless another independent requirement excludes them. Never impute zero or 50.

## 7. Source and licence

The role catalogue, metric metadata, role weights, six principle definitions and baseline philosophy weights are adapted from:

- Repository: [Recruitment Lab V1](https://github.com/nbdhactr-creator/FM24-Recruitment-Lab-Save-Journal)
- Branch inspected: `recruitment-lab/custom-build`
- Source file: `index.html`
- Licence: MIT, copyright Recruitment Lab contributors (2026)

This project is separate from Recruitment Lab V1. V2 does not modify V1. The source licence notice must remain with copied/adapted substantial portions.

External research references are provided above. The research informs interpretation and limitations; it does not supply or validate the numerical weights in the V1 catalogue.
