import { Reveal } from "./Reveal";

export function CTAPanel() {
  return (
    <section className="section" id="contact">
      <div className="shell">
        <Reveal>
          <div className="cta-panel">
            <h2>Lead with the right story.</h2>
            <p>Use UST AI Suite+ for SAP to guide the conversation from client need to practical capability, then rely on the governance model to keep content approved, consistent, and safe.</p>
            <div className="cta-actions">
              <a className="btn primary" href="#capabilities">
                Browse capabilities
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a className="btn secondary" href="#lanes">Browse by audience lane</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
