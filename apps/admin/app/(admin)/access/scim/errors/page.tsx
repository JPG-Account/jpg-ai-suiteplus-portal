// Screen 10 · SCIM Sync Errors
import { TopBar, ActionBar } from "../../../../../components/TopBar";
import { Icon } from "../../../../../components/Icons";
import { scimActiveError, scimResolved } from "../../../../../lib/data";

export default function ScimErrorsPage() {
  return (
    <>
      <TopBar
        crumbs={[{ label: "People & Access" }, { label: "SSO & SCIM" }, { label: "Errors", bold: true }]}
        pill={{ tone: "amber", label: "1 active · 3 resolved 24h" }}
      />
      <ActionBar
        title="SCIM sync errors"
        sub="Provisioning failures from SAP IPS that the sync engine could not auto-recover. Each error is paired with a suggested fix and a retry button. Silent IdP failures are the leading cause of orphan admins and ghost users — surface them here."
        actions={<>
          <button className="btn">{Icon.rotate} Trigger full re-sync</button>
          <button className="btn primary">Open in IPS {Icon.external}</button>
        </>}
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><span className="lbl">Active errors</span><b style={{color:"#8E520E"}}>1</b><div className="trend flat" style={{color:"#8E520E"}}>3 retries used</div></div>
          <div className="kpi"><span className="lbl">Resolved 24h</span><b>3</b><div className="trend up">All auto-recovered</div></div>
          <div className="kpi"><span className="lbl">Last good sync</span><b>04:00</b><div className="trend flat">412 users · 7 groups</div></div>
          <div className="kpi"><span className="lbl">Next scheduled</span><b>16:00</b><div className="trend flat">Q15 cycle</div></div>
        </div>

        <div className="card" style={{ marginTop: 18, borderColor: "#ECD8A6" }}>
          <div className="card-h" style={{ background: "#FFF8EC", borderBottomColor: "#ECD8A6" }}>
            <h3>⚠ Active error · {scimActiveError.id}</h3>
            <span className="meta warn">3 retries · {scimActiveError.ts}</span>
          </div>
          <div className="card-b" style={{ padding: "18px 22px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".10em", color: "#7F8B92", fontWeight: 700, marginBottom: 6 }}>Error</div>
                <div style={{ fontSize: 15, color: "var(--ust-deep)", fontWeight: 700, letterSpacing: "-.01em", marginBottom: 8 }}>{scimActiveError.title}</div>
                <div style={{ fontSize: "12.5px", color: "#52646C", lineHeight: 1.55 }}>{scimActiveError.body}</div>

                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".10em", color: "#7F8B92", fontWeight: 700, margin: "14px 0 6px" }}>Impact</div>
                <div style={{ fontSize: "12.5px", color: "#52646C", lineHeight: 1.55 }}>{scimActiveError.impact}</div>

                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".10em", color: "#7F8B92", fontWeight: 700, margin: "14px 0 6px" }}>Suggested fix</div>
                <div style={{ fontSize: "12.5px", color: "#52646C", lineHeight: 1.55 }}>{scimActiveError.fix} <a style={{color:"var(--ust-dark)", fontWeight:700}}>Open IPS group editor →</a></div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".10em", color: "#7F8B92", fontWeight: 700, marginBottom: 6 }}>Last failing payload</div>
                <div className="json">
                  {Object.entries(scimActiveError.payload).map(([k, v]) => (
                    <span key={k}><span className="k">&quot;{k.replace(/_/g, '.')}&quot;</span>: <span className="s">{v}</span>,<br /></span>
                  ))}
                  <br /><span className="n">// IPS response: 409 Conflict — externalId already exists</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn primary sm">Retry now</button>
                  <button className="btn sm">Suppress 24h</button>
                  <button className="btn ghost sm">View 3 prior attempts</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h"><h3>Resolved 24h</h3><span className="meta">3 events · auto-recovered</span></div>
          {scimResolved.map((r, i) => (
            <div className="audit-event" key={i} style={{cursor:"default"}}>
              <span className="ts">{r.ts}</span>
              <span className="who" style={{ background: "linear-gradient(135deg,#1B6A55,#7AD6B1)" }}>⚙</span>
              <span className="desc"><b>{r.desc}</b><br /><small>{r.detail}</small></span>
              <span className="tags"><span className="tag sev-info">info</span><span className="tag">{r.tag}</span></span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
