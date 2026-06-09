import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function Charter() {
  return (
    <section className="section alt" id="charter">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.governance}<span>Portfolio operating model</span></div>
            <h2>Govern the portfolio with discipline</h2>
            <p>This section shows how UST AI Suite+ for SAP is organized, governed, reused, and enabled across the portfolio.</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="charter-hero">
            <h3>Portfolio objective</h3>
            <p>Create a governed, reusable UST SAP capability portfolio that can be maintained by multiple contributors, presented consistently, and expanded safely over time.</p>
            <div className="charter-strip">
              <div className="strip-card"><span>Portfolio</span><b>UST AI Suite+ for SAP</b></div>
              <div className="strip-card"><span>Operating model</span><b>Shared portfolio governance</b></div>
              <div className="strip-card"><span>Ownership</span><b>Clear solution accountability</b></div>
              <div className="strip-card"><span>Guardrail</span><b>Approved content only</b></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
