export function Topbar() {
  return (
    <header className="topbar">
      <div className="shell">
        <a className="brand" href="#top">
          <div className="mark" aria-label="UST">
            <span className="mark-u">U</span>
            <span className="mark-dot" aria-hidden="true" />
            <span className="mark-s">S</span>
            <span className="mark-t">T</span>
          </div>
          <div className="brand-copy">
            <b>UST AI Suite+ for SAP</b>
            <span>Capability portfolio</span>
          </div>
        </a>
        <nav className="nav">
          <a href="#overview">Overview</a>
          <a href="#lanes">Lanes</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#value">How it helps</a>
          <a href="#charter">Operating Model</a>
          <a href="#shared-assets">Shared assets</a>
          <a href="#governance">Guardrails</a>
          <a href="#contact">Next steps</a>
        </nav>
        <a className="cta-top" href="#capabilities">
          Explore capabilities
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </header>
  );
}
