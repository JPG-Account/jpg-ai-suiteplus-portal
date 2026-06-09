import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

const ops = [
  { n: 1, h: "Portfolio Operating Model", p: "Defines how the portfolio is governed, organized, maintained, reviewed, expanded, and retired.", items: ["Portfolio purpose", "Solution ownership", "Lane taxonomy", "Intake, review, release", "Repository and demo ownership"] },
  { n: 2, h: "Reusable Proposal Language Library", p: "A controlled library of approved UST SAP proposal and positioning language.", items: ["Approved positioning", "Client-safe value propositions", "Use-case language", "Workshop and demo language", "Next-step language"] },
  { n: 3, h: "Solution Card Template", p: "Standard card format for every capability in the portfolio.", items: ["Audience lanes", "Capability type", "Problem solved", "When to use it", "Demo and owner details"] },
  { n: 4, h: "Miniapp Definition Template", p: "Defines every miniapp or solution app before it is added to the portfolio.", items: ["Purpose and user", "Inputs and outputs", "Workflow steps", "AI involvement", "Support model"] },
  { n: 5, h: "Client Data Safety Checklist", p: "Prevents unsafe content from moving into UST-controlled assets.", items: ["No PII or PHI", "No client confidential data", "No credentials", "No unsanitized maps", "No non-UST private IP"] },
  { n: 6, h: "Demo Script", p: "Reusable demo flow for each solution, written for client-facing conversations.", items: ["Demo objective", "Target audience", "Business scenario", "User flow", "Closing next step"] },
  { n: 7, h: "GTM Enablement Guide", p: "Helps sellers position the portfolio without overpromising or misclassifying assets.", items: ["Audience lane guide", "Capability catalog", "Discovery questions", "Conversation starters", "What not to promise"] },
  { n: 8, h: "Build Backlog", p: "Visible backlog for platform, portfolio onboarding, demo, security, documentation, and enablement work.", items: ["Priorities", "Owners", "Dependencies", "Status", "Acceptance criteria"] },
  { n: 9, h: "Offer-to-Delivery Playbook", p: "Shows how a capability moves from sales conversation into delivery.", items: ["Qualification", "Demo path", "Workshop path", "Proposal path", "Delivery handoff"] },
  { n: 10, h: "Governance Review Checklist", p: "Review gate before an onboarded or new solution is published or presented outside the core team.", items: ["Business fit", "UST ownership", "Data safety", "Brand alignment", "Support ownership"] },
];

export function OperatingAssets() {
  return (
    <section className="section" id="operating-assets">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.ops}<span>Operating assets</span></div>
            <h2>What supports the portfolio</h2>
            <p>These assets help Client Partners, Account Managers, SAP practice teams, and delivery teams position, demo, govern, and deliver the portfolio consistently.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="ops-grid">
            {ops.map((o) => (
              <div className="ops-card" key={o.n}>
                <div>
                  <div className="num">{o.n}</div>
                  <h3>{o.h}</h3>
                  <p>{o.p}</p>
                </div>
                <ul>{o.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
