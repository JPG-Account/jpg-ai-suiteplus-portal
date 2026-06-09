import { AssetIcon, SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function SharedAssets() {
  return (
    <section className="section" id="shared-assets">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.shared}<span>Shared assets allowed</span></div>
            <h2>Reuse the shell, not the sensitive content</h2>
            <p>Shared assets create a consistent UST experience across the portfolio. Solution-specific logic, data, and claims still require ownership and review.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="asset-matrix">
            <div className="asset-card">
              <h3><span className="asset-ico">{AssetIcon.experience}</span>Experience assets</h3>
              <ul>
                <li>UST AI Suite+ landing page</li>
                <li>UST design system</li>
                <li>UST icons</li>
                <li>Navigation shell</li>
                <li>Solution card template</li>
              </ul>
            </div>
            <div className="asset-card">
              <h3><span className="asset-ico">{AssetIcon.portfolio}</span>Portfolio assets</h3>
              <ul>
                <li>App registry</li>
                <li>Demo data standards</li>
                <li>Shared UI components</li>
                <li>Shared chart components</li>
                <li>Shared environment configuration pattern</li>
              </ul>
            </div>
            <div className="asset-card">
              <h3><span className="asset-ico">{AssetIcon.platform}</span>Platform patterns</h3>
              <ul>
                <li>SAP Cloud Foundry deployment patterns</li>
                <li>Authentication pattern</li>
                <li>Logging and audit pattern</li>
                <li>Common configuration</li>
                <li>Environment setup conventions</li>
              </ul>
            </div>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="reuse-band">
            <div className="reuse-card encouraged">
              <h3>Reuse encouraged</h3>
              <ul>
                <li>Visual design</li>
                <li>Navigation</li>
                <li>Layouts</li>
                <li>Card templates</li>
                <li>Charts</li>
                <li>Common configuration</li>
                <li>Demo-safe sample data patterns</li>
                <li>Logging and audit conventions</li>
                <li>Authentication wrappers</li>
                <li>Environment setup conventions</li>
              </ul>
            </div>
            <div className="reuse-card review">
              <h3>Reuse requires review</h3>
              <ul>
                <li>AI prompts</li>
                <li>Scoring logic</li>
                <li>Assessment models</li>
                <li>Data schemas</li>
                <li>Demo datasets</li>
                <li>Client-facing claims</li>
                <li>Industry-specific language</li>
                <li>Solution-specific workflows</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
