import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

const cols = [
  { h: "Platform shell", items: ["Landing page", "App registry", "Shared UI components", "Shared chart components", "Solution cards"] },
  { h: "Solution portfolio onboarding", items: ["RIA portfolio onboarding", "Client University portfolio onboarding", "Rapid Assessment portfolio onboarding", "ROI Calculator portfolio onboarding", "FlexIOM portfolio onboarding"] },
  { h: "Industry assets", items: ["Trade Promotion Optimizer portfolio onboarding", "CX for Life Sciences portfolio onboarding", "CX for Insurance portfolio onboarding", "Demo data", "Industry copy review"] },
  { h: "Controls and enablement", items: ["Security and governance", "Documentation", "Enablement assets", "Demo scripts", "GTM guide"] },
];

const backlogFields = [
  "Item name", "Description", "Solution area",
  "Priority", "Owner", "Dependency",
  "Status", "Acceptance criteria", "Target release",
];

export function Backlog() {
  return (
    <section className="section" id="backlog">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.backlog}<span>Build backlog</span></div>
            <h2>Visible work queue for the portfolio</h2>
            <p>The build backlog keeps platform, portfolio onboarding, demo, security, documentation, and enablement work visible and owned.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="backlog-board">
            {cols.map((c) => (
              <div className="backlog-col" key={c.h}>
                <h3>{c.h}</h3>
                {c.items.map((i) => <span className="backlog-pill" key={i}>{i}</span>)}
              </div>
            ))}
          </div>
        </Reveal>
        <div style={{ height: 18 }} />
        <Reveal>
          <div className="template-card">
            <h3>Backlog item fields</h3>
            <div className="field-grid">
              {backlogFields.map((f) => <span className="field" key={f}>{f}</span>)}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
