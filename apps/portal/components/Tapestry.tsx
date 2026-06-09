import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function Tapestry() {
  return (
    <section className="section">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.fabric}<span>Capability fabric</span></div>
            <h2>What the portfolio covers</h2>
            <p>A simple visual view of the kinds of needs UST AI Suite+ for SAP can address today.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="tapestry">
            <div className="tile">
              <div><b>Impact and change intelligence</b><p>Understand likely ripple effects before moving work forward.</p></div>
              <div className="mini">
                <svg viewBox="0 0 120 72"><path d="M16 36h88" stroke="#0097AC" strokeWidth="3"/><circle cx="20" cy="36" r="8" fill="#0097AC"/><circle cx="104" cy="36" r="8" fill="#7AD5DE"/></svg>
              </div>
            </div>
            <div className="tile">
              <div><b>Assessment and readiness</b><p>Turn discovery into a clearer picture of fit, gaps, and next steps.</p></div>
              <div className="mini">
                <svg viewBox="0 0 120 72"><rect x="20" y="14" width="80" height="44" rx="12" fill="#fff" stroke="#0097AC"/><path d="M36 32h48M36 44h30" stroke="#0097AC" strokeWidth="3"/></svg>
              </div>
            </div>
            <div className="tile">
              <div><b>Value and business case</b><p>Support investment decisions with more structure and credibility.</p></div>
              <div className="mini">
                <svg viewBox="0 0 120 72"><rect x="18" y="36" width="16" height="18" rx="4" fill="#C7EFF2" stroke="#0097AC"/><rect x="44" y="22" width="16" height="32" rx="4" fill="#9CE3EA" stroke="#0097AC"/><rect x="70" y="12" width="16" height="42" rx="4" fill="#68D0DB" stroke="#0097AC"/></svg>
              </div>
            </div>
            <div className="tile">
              <div><b>Support and enablement</b><p>Improve learning, adoption, and guided self-service.</p></div>
              <div className="mini">
                <svg viewBox="0 0 120 72"><circle cx="38" cy="32" r="14" fill="#E8F8FA" stroke="#0097AC"/><path d="M66 24h28M66 36h22M66 48h18" stroke="#0097AC" strokeWidth="3"/></svg>
              </div>
            </div>
            <div className="tile">
              <div><b>Industry and business solutions</b><p>Connect SAP capability to real operational and sector needs.</p></div>
              <div className="mini">
                <svg viewBox="0 0 120 72"><path d="M18 50h84" stroke="#0097AC" strokeWidth="3"/><path d="M30 50V28l14-8 14 8v22" fill="#E9F8F9" stroke="#0097AC"/></svg>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
