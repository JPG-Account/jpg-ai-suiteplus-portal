import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

const restricted = [
  "Client data",
  "Customer-specific demo content",
  "Commercials",
  "Internal pursuit strategy",
  "Private credentials",
  "Production incident data",
  "UST confidential delivery details",
  "Personal startup or non-UST private IP",
  "Client-specific process maps unless sanitized and approved",
];

const handling = [
  "Stop portfolio onboarding for that asset.",
  "Mark it as restricted.",
  "Remove it from the working set.",
  "Create a sanitized replacement if needed.",
  "Request review from the portfolio owner and appropriate UST governance owner.",
  "Do not publish, demo, or reuse until approved.",
];

const principles = [
  { b: "UST-owned or approved", s: "Assets must be owned by UST or explicitly approved for UST use." },
  { b: "Relevant to the portfolio", s: "Assets must support UST AI Suite+ for SAP, not unrelated work." },
  { b: "Client-safe", s: "No client confidential information, proprietary customer data, or unsanitized client context." },
  { b: "Free of non-UST IP", s: "No personal or external private IP without sign-off." },
  { b: "Safe for portfolio storage", s: "No credentials, tokens, private data, or restricted artifacts." },
  { b: "Ready for UST governance", s: "Assets must have clear ownership, review status, and support expectations." },
];

export function Guardrails() {
  return (
    <section className="section alt" id="governance">
      <div className="shell">
        <Reveal>
          <div className="guardrail-panel">
            <h2>Content that requires approval</h2>
            <p>Sensitive or restricted material must not be reused across solutions unless it has been reviewed, sanitized, and approved.</p>
            <div className="restricted-grid">
              {restricted.map((r) => <div className="restricted-item" key={r}>{r}</div>)}
            </div>
          </div>
        </Reveal>
        <div style={{ height: 28 }} />
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.handle}<span>Handling rules</span></div>
            <h2>What to do when restricted content is found</h2>
            <p>The portfolio review process must stop, isolate, sanitize, and review before anything is moved, reused, or shown.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="handling-flow">
            {handling.map((step, i) => (
              <div className="handling-step" key={step}>
                <b>{i + 1}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <div style={{ height: 28 }} />
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.principle}<span>Approved content principle</span></div>
            <h2>Only publish what UST can safely own and support</h2>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="clean-principle">
            {principles.map((p) => (
              <div className="clean-card" key={p.b}>
                <b>{p.b}</b>
                <span>{p.s}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
