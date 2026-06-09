import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function AtAGlance() {
  return (
    <section className="section alt">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.signals}<span>At-a-glance summary</span></div>
            <h2>Portfolio signals that matter in a first conversation</h2>
            <p>Use these visual summaries to quickly anchor the portfolio story.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="chart-zone">
            <div className="panel">
              <h3>Current portfolio mix</h3>
              <div className="bar-row"><span>Analyzers and assessments</span><div className="bar"><i style={{ width: "72%" }} /></div><span>72%</span></div>
              <div className="bar-row"><span>Business tools and calculators</span><div className="bar"><i style={{ width: "48%" }} /></div><span>48%</span></div>
              <div className="bar-row"><span>Industry and solution assets</span><div className="bar"><i style={{ width: "62%" }} /></div><span>62%</span></div>
              <div className="bar-row"><span>Ops and enablement support</span><div className="bar"><i style={{ width: "40%" }} /></div><span>40%</span></div>
            </div>
            <div className="panel">
              <h3>How the story lands</h3>
              <div className="ring"><b>8</b></div>
              <div className="legend">
                <div><span className="sw" style={{ background: "#006E74" }} />Current named capabilities</div>
                <div><span className="sw" style={{ background: "#0097AC" }} />Organized across audience lanes</div>
                <div><span className="sw" style={{ background: "#50C6D2" }} />Balanced between AI-enabled and SAP solution stories</div>
                <div><span className="sw" style={{ background: "#B4EEF2" }} />Ready for continued expansion</div>
              </div>
            </div>
            <div className="panel">
              <h3>Best lead-in questions</h3>
              <div className="feature-list">
                <div><span className="dot" /><span>Where is the client trying to improve decisions or speed?</span></div>
                <div><span className="dot" /><span>Is the need operational, advisory, executive, or industry-specific?</span></div>
                <div><span className="dot" /><span>Do they need insight, readiness, value, or execution support first?</span></div>
                <div><span className="dot" /><span>Which solution card best fits that starting point?</span></div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
