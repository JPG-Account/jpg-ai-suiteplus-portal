import { Reveal } from "./Reveal";

export function OverviewBand() {
  return (
    <section className="section-band" id="overview">
      <div className="shell">
        <Reveal stagger>
          <div className="kpi-grid">
            <div className="kpi">
              <span>What it is</span>
              <b>One portfolio</b>
              <p>A single place to understand UST SAP capabilities across assessments, analyzers, calculators, accelerators, and solution assets.</p>
            </div>
            <div className="kpi">
              <span>What it solves</span>
              <b>Sharper fit</b>
              <p>Helps teams quickly connect client needs to the right capability, message, and next step.</p>
            </div>
            <div className="kpi">
              <span>What it includes</span>
              <b>AI + non-AI</b>
              <p>Includes AI-enabled offerings and important SAP solution capabilities such as FlexIOM.</p>
            </div>
            <div className="kpi">
              <span>How to use it</span>
              <b>Sell with clarity</b>
              <p>Start with the audience lane, move to the business problem, then lead with the most relevant capability.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
