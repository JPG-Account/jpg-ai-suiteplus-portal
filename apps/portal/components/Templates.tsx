import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

const solutionCardFields = [
  "Solution name", "Short description", "Primary audience lane",
  "Secondary lanes", "Capability type", "Business problem solved",
  "When to use it", "Key features", "Example client conversation",
  "Demo status", "Owner", "Route or location",
  "Data classification", "Governance status", "Seller notes",
  "Delivery notes",
];

const miniappFields = [
  "Miniapp name", "Purpose", "Target user",
  "Primary job-to-be-done", "Input data", "Output artifact",
  "Workflow steps", "AI involvement", "Human review",
  "System integrations", "Security assumptions", "Demo data source",
  "Known limitations", "Owner", "Build status",
  "Support model",
];

const checklist = [
  "No PII",
  "No PHI",
  "No customer confidential information",
  "No SOX-sensitive evidence",
  "No security credentials",
  "No access keys or tokens",
  "No unsanitized client process maps",
  "No screenshots with client system names, users, IDs, or URLs",
  "No proprietary customer data",
  "No unapproved pricing, margin, or commercials",
  "No unanonymized production incidents",
  "No UST pursuit strategy",
  "No non-UST private IP",
  "No personal startup IP",
];

export function Templates() {
  return (
    <section className="section alt" id="templates">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.templates}<span>Templates and checklists</span></div>
            <h2>Standardize each solution before it scales</h2>
            <p>Every project should have the same core definition, safety review, demo story, and seller guidance before it becomes part of the portfolio.</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="template-zone">
            <div className="template-card">
              <h3>Solution card template fields</h3>
              <div className="field-grid">
                {solutionCardFields.map((f) => <span className="field" key={f}>{f}</span>)}
              </div>
            </div>
            <div className="template-card">
              <h3>Miniapp definition fields</h3>
              <div className="field-grid">
                {miniappFields.map((f) => <span className="field" key={f}>{f}</span>)}
              </div>
            </div>
          </div>
        </Reveal>
        <div style={{ height: 18 }} />
        <Reveal>
          <div className="template-card">
            <h3>Client data safety checklist</h3>
            <div className="checklist">
              {checklist.map((c) => (
                <div className="check-item" key={c}>
                  <span className="check-icon">✓</span>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
