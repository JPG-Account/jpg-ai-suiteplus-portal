import { SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function Value() {
  return (
    <section className="section alt" id="value">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.where}<span>Where it helps</span></div>
            <h2>How to position the portfolio in client conversations</h2>
            <p>Lead with the business situation first. Then connect the right capability to the specific decision, operational problem, or transformation goal in front of the client.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="story-strip">
            <div className="story">
              <div className="lead">For executive conversations</div>
              <h3>Start with value, clarity, and risk</h3>
              <p>Use ROI Calculator and Rapid Assessment to help leaders see the opportunity, understand the current state, and move toward a practical next step.</p>
            </div>
            <div className="story">
              <div className="lead">For delivery and SAP teams</div>
              <h3>Start with impact, quality, and readiness</h3>
              <p>Use RIA when the client needs confidence around change impact, coverage, testing, or release quality before work moves ahead.</p>
            </div>
            <div className="story">
              <div className="lead">For business and industry discussions</div>
              <h3>Start with outcomes in the flow of work</h3>
              <p>Use FlexIOM, Trade Promotion Optimizer, and the CX industry solutions when the conversation is about operations, customer experience, and industry-specific performance.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
