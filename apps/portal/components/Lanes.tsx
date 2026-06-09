import type { Lane } from "../lib/registry";
import { LaneIcon, SectionIcon } from "./Icons";
import { Reveal } from "./Reveal";

type LanesProps = { lanes: Lane[] };

export function Lanes({ lanes }: LanesProps) {
  return (
    <section className="section alt" id="lanes">
      <div className="shell">
        <Reveal>
          <div className="head">
            <div className="label">{SectionIcon.audience}<span>Audience lanes</span></div>
            <h2>Start with who the conversation is for</h2>
            <p>UST AI Suite+ for SAP is organized around the people who use it, sponsor it, or benefit from it. That makes it easier for Client Partners, Account Managers, and SAP teams to position the right story quickly.</p>
          </div>
        </Reveal>
        <Reveal stagger>
          <div className="lane-grid">
            {lanes.map((lane) => (
              <div className="lane-card" key={lane.id}>
                <div className="lane-icon">{LaneIcon[lane.id] ?? null}</div>
                <h3>{lane.name}</h3>
                <span className="aud">{lane.audience}</span>
                <p>{lane.purpose}</p>
                <div className="tags">
                  {lane.tags.map((t) => (
                    <span className="tag" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
