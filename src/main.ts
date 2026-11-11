import "./styles.css";

type Section = "Overview" | "Squad" | "Scouting" | "Market" | "Intelligence" | "Planning" | "Data & Saves";

const sections: Section[] = ["Overview", "Squad", "Scouting", "Market", "Intelligence", "Planning", "Data & Saves"];
const descriptions: Record<Section, string> = {
  Overview: "Your recruitment workspace, organised around the decisions that matter.",
  Squad: "Understand squad balance, positional cover and player evidence.",
  Scouting: "Find players by role, compare evidence and build shortlists.",
  Market: "Track expiring contracts, free transfers and emerging youth.",
  Intelligence: "Put clubs, leagues and player performance into context.",
  Planning: "Test squad changes before committing to a recruitment decision.",
  "Data & Saves": "Manage imports, local data, backups and optional cloud sync.",
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root was not found.");

let activeSection: Section = "Overview";

function render(): void {
  app!.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <a class="brand" href="#overview" aria-label="Moneyball Companion home">
          <span class="brand-mark">M</span>
          <span class="brand-copy"><strong>Moneyball</strong><small>COMPANION</small></span>
        </a>
        <div class="workspace-label">WORKSPACE</div>
        <nav class="nav-list">
          ${sections.map((section) => `
            <button class="nav-item ${activeSection === section ? "active" : ""}" data-section="${section}" ${activeSection === section ? 'aria-current="page"' : ""}>
              <span class="nav-indicator"></span><span>${section}</span>
            </button>`).join("")}
        </nav>
        <div class="sidebar-bottom">
          <div class="local-status"><span class="status-dot"></span><span>Local-first workspace</span></div>
          <span class="version">EARLY FOUNDATION · 0.1</span>
        </div>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div class="breadcrumb"><span>Moneyball Companion</span><span class="crumb-divider">/</span><strong>${activeSection}</strong></div>
          <div class="topbar-right"><span class="save-chip"><span class="status-dot muted"></span>No save loaded</span></div>
        </header>
        <section class="page-content">
          <div class="page-heading">
            <div><div class="eyebrow">RECRUITMENT WORKSPACE</div><h1>${activeSection}</h1><p>${descriptions[activeSection]}</p></div>
            <span class="build-label">FOUNDATION BUILD</span>
          </div>
          ${activeSection === "Overview" ? overview() : sectionView(activeSection)}
        </section>
        <footer class="footer"><span>Evidence before decoration.</span><span>Player data stays yours.</span></footer>
      </main>
    </div>`;
}

function overview(): string {
  return `
    <section class="welcome-panel">
      <div class="welcome-copy">
        <div class="eyebrow">YOUR NEXT STEP</div>
        <h2>Start with your Football Manager data.</h2>
        <p>Import a save export to unlock squad analysis, role evaluation and recruitment markets. Your first workspace can stay entirely local.</p>
        <button class="primary-button" data-section="Data & Saves">Open Data &amp; Saves <span aria-hidden="true">→</span></button>
      </div>
      <div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="pitch"><span></span><i></i><b></b></div></div>
    </section>
    <div class="section-caption"><span>WORKSPACE MODULES</span><span>Ready to be built in sequence</span></div>
    <div class="module-grid">
      ${[
        ["01", "Squad", "Depth, positional cover and player profiles", "Users start with their own squad data."],
        ["02", "Scouting", "Role fit, candidate discovery and comparison", "Evidence-led player evaluation."],
        ["03", "Market", "Contract windows, free agents and youth", "Separate markets, clear eligibility."],
        ["04", "Intelligence", "League context, club comparison and benchmarks", "Understand performance in context."],
        ["05", "Planning", "Recruitment priorities and squad scenarios", "See the consequences of each move."],
        ["06", "Data & Saves", "Imports, data quality and backup controls", "Local storage first, cloud optional."]
      ].map(([number, title, summary, note]) => `
        <button class="module-card" data-section="${title === "Data & Saves" ? title : title}">
          <span class="module-top"><span class="module-number">${number}</span><span class="module-arrow">↗</span></span>
          <strong>${title}</strong><span class="module-summary">${summary}</span><small>${note}</small>
        </button>`).join("")}
    </div>
    <div class="principle-strip"><span class="principle-mark">i</span><p><strong>No demo numbers.</strong> This workspace will not invent player rankings or squad metrics. Analysis appears only after real data has been imported and validated.</p></div>`;
}

function sectionView(section: Section): string {
  if (section === "Data & Saves") return `
    <div class="data-layout">
      <section class="content-card import-card">
        <div class="card-kicker">DATA WORKFLOW</div><h2>Bring in a save export</h2>
        <p>Import your Football Manager data when the data engine is ready. The import process will validate identifiers, columns and missing values before saving anything.</p>
        <div class="drop-placeholder"><span class="upload-symbol">↑</span><strong>FM export import</strong><span>CSV and supported export formats · coming in the data-engine phase</span></div>
        <div class="muted-note">Your existing Recruitment Lab remains separate. This new app will not modify it.</div>
      </section>
      <section class="content-card storage-card">
        <div class="card-kicker">LOCAL STORAGE</div><h2>Designed for large saves</h2>
        <div class="storage-row"><span>Player and season data</span><strong>IndexedDB</strong></div>
        <div class="storage-row"><span>Large imports</span><strong>Background worker</strong></div>
        <div class="storage-row"><span>Facepack images</span><strong>Local folder reference</strong></div>
        <div class="storage-row"><span>Cloud sync</span><strong>Optional</strong></div>
        <p class="storage-footnote">Your 10 GB facepack will not be copied into the app or uploaded to the repository. A folder-linking workflow is planned, with a browser-compatible fallback.</p>
      </section>
    </div>
    <section class="content-card roadmap-card"><div class="card-kicker">DATA SAFETY</div><h2>Import should be recoverable</h2><p>Every import will have validation, a clear result report and a persistence check. The app should never claim an import succeeded before the data is safely stored.</p></section>`;
  return `
    <section class="empty-workspace content-card">
      <span class="empty-icon">◎</span><div class="card-kicker">MODULE FOUNDATION</div>
      <h2>${section} is mapped, not populated yet.</h2>
      <p>${descriptions[section]} This module will be connected to validated save data rather than filled with sample players or fabricated metrics.</p>
      <button class="secondary-button" data-section="Data & Saves">Go to Data &amp; Saves <span aria-hidden="true">→</span></button>
    </section>`;
}

app.addEventListener("click", (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-section]");
  const next = target?.dataset.section as Section | undefined;
  if (next && sections.includes(next)) {
    activeSection = next;
    render();
  }
});

render();
