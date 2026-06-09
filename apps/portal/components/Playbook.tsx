import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

const steps = [
  { b: "01 Entry", h: "Qualify the need", p: "Confirm audience, business problem, urgency, data sensitivity, and whether the ask is advisory, demo, assessment, or delivery." },
  { b: "02 Demo", h: "Show fit", p: "Use the relevant capability card and demo script to show how UST can help without overpromising." },
  { b: "03 Workshop", h: "Structure discovery", p: "Capture context, gaps, stakeholders, and decision criteria using approved templates and sanitized inputs." },
  { b: "04 Proposal", h: "Use approved language", p: "Build the proposal from the reusable language library, solution card, and agreed next-step path." },
  { b: "05 Handoff", h: "Transfer cleanly", p: "Move only approved context into delivery with ownership, assumptions, work products, and governance checkpoints." },
];

export function Playbook() {
  return (
    <section className="section alt" id="playbook">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.playbook}<span>Offer-to-delivery playbook</span></div>
            <h2>Turn interest into a controlled next step</h2>
            <p>The portfolio should help teams move from conversation to demo, workshop, assessment, proposal, and delivery handoff without losing governance.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="playbook-flow">
            {steps.map((s) => (
              <div className="playbook-step" key={s.b}>
                <b>{s.b}</b>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
