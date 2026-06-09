"use client";

// Screen 08 · Preview-as-Role
import { useState } from "react";
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";

const roles = [
  { id: "viewer", label: "Viewer (default)" },
  { id: "suite", label: "Suite Admin" },
  { id: "content", label: "Content Admin" },
  { id: "cap-ria", label: "Capability Owner · RIA" },
  { id: "cap-flexiom", label: "Capability Owner · FlexIOM" },
  { id: "audit", label: "Auditor" },
  { id: "anon", label: "Anonymous" },
];

export default function PreviewAsPage() {
  const [role, setRole] = useState("cap-ria");
  const selectedLabel = roles.find((r) => r.id === role)?.label ?? "";

  return (
    <>
      <TopBar
        crumbs={[{ label: "Operate" }, { label: "Preview-as-Role", bold: true }]}
        pill={{ tone: "violet", label: "Impersonation mode · audited" }}
      />
      <ActionBar
        title="Preview as a role"
        sub={<>See the public portal exactly as the target role would. Every render is audited as <code style={{fontFamily:"ui-monospace, monospace", fontSize:12}}>preview.as_role</code>. The view shows which blocks change visibility vs. the default Viewer baseline.</>}
        actions={<>
          <button className="btn">Share read-only link</button>
          <button className="btn primary">Capture screenshot</button>
        </>}
      />
      <div className="content">
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="role-picker">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`rp ${role === r.id ? "on" : ""}`}
                aria-pressed={role === r.id}
              >
                <span className="dot" /> {r.label}
              </button>
            ))}
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#52646C", fontWeight: 600 }}>
              or IAS group:
              <select style={{ font: "inherit", fontSize: "12.5px", background: "#F4FAFB", border: "1px solid rgba(13,53,60,.10)", borderRadius: 8, padding: "6px 10px", color: "var(--ust-deep)" }}>
                <option>ust-ria-leads</option>
                <option>ust-sap-gtm</option>
                <option>ust-cx-ls-leads</option>
              </select>
            </span>
          </div>
          <div style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {/* Baseline pane */}
              <div style={{ borderRight: "1px solid rgba(13,53,60,.06)" }}>
                <div className="pp-top" style={{ borderRadius: 0, borderTop: 0 }}>
                  <div className="pp-top-l">
                    <span className="pp-readonly" style={{ background: "#EEF1F4", color: "#3F4F58" }}>Default · Viewer</span>
                    <span style={{ fontSize: 12, color: "#52646C" }}>baseline</span>
                  </div>
                </div>
                <div className="pp-stage" style={{ borderRadius: 0, minHeight: 440 }}>
                  <div className="pp-frame">
                    <div className="pp-url"><span><b>Default Viewer</b></span><code>/?role=viewer</code></div>
                    <div className="pp-hero">
                      <span className="eb">UST SAP capability showcase</span>
                      <h2>UST AI Suite+ for SAP</h2>
                      <p>A modern portfolio of AI-enabled accelerators…</p>
                    </div>
                    <div className="pp-grid">
                      <div className="pp-tile"><b>RIA</b><span>SAP change impact.</span><br /><span className="bd">Live</span></div>
                      <div className="pp-tile"><b>Client Univ.</b><span>Learning & adoption.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                      <div className="pp-tile"><b>Rapid Assess</b><span>Discovery.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                      <div className="pp-tile"><b>ROI Calc</b><span>Value cases.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                    </div>
                    <div style={{ padding: "14px 18px", fontSize: "11.5px", color: "#7F8B92", background: "#F8FBFC" }}>
                      Role-gated tiles hidden: <b>FlexIOM · Trade Promotion Optimizer</b>
                    </div>
                  </div>
                </div>
              </div>
              {/* Impersonated pane */}
              <div>
                <div className="pp-top" style={{ borderRadius: 0, borderTop: 0 }}>
                  <div className="pp-top-l">
                    <span className="pp-readonly">{selectedLabel}</span>
                    <span style={{ fontSize: 12, color: "#52646C" }}>live render</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#175AA8", background: "#E3F0FE", padding: "3px 9px", borderRadius: 999, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>+3 surfaces visible vs baseline</span>
                </div>
                <div className="pp-stage" style={{ borderRadius: 0, minHeight: 440 }}>
                  <div className="pp-frame">
                    <div className="pp-url"><span><b>{selectedLabel}</b></span><code>/?role={role}</code></div>
                    <div className="pp-hero" style={{ position: "relative", outline: "2px solid #175AA8", outlineOffset: "-2px" }}>
                      <span style={{ position: "absolute", top: -12, left: 14, fontSize: 9, textTransform: "uppercase", letterSpacing: ".10em", fontWeight: 800, color: "#fff", background: "#175AA8", padding: "3px 8px", borderRadius: 5, zIndex: 2 }}>Personalized</span>
                      <span className="eb">Welcome back, {role === "cap-ria" ? "RIA team" : role === "suite" ? "Suite Admin" : "Operator"}</span>
                      <h2>{role === "cap-ria" ? "RIA Q3 release plan" : "Your Suite+"}</h2>
                      <p>{role === "cap-ria" ? "3 active drafts · 1 publish scheduled Mon" : "Items requiring your attention shown first"}</p>
                    </div>
                    <div className="pp-grid">
                      <div className="pp-tile" style={{ outline: "2px solid #1B6A55", outlineOffset: "-2px", position: "relative" }}>
                        <span style={{ position: "absolute", top: -8, right: 6, fontSize: 8, fontWeight: 800, color: "#fff", background: "#1B6A55", padding: "2px 6px", borderRadius: 4 }}>EDIT</span>
                        <b>RIA</b><span>Configure tile · health 100%</span><br /><span className="bd">Live</span>
                      </div>
                      <div className="pp-tile"><b>Client Univ.</b><span>Learning & adoption.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                      <div className="pp-tile"><b>Rapid Assess</b><span>Discovery.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                      <div className="pp-tile"><b>ROI Calc</b><span>Value cases.</span><br /><span className="bd" style={{ background: "#E3F0FE", color: "#175AA8" }}>Demo</span></div>
                    </div>
                    <div style={{ padding: "14px 18px", fontSize: "11.5px", color: "#52646C", background: "#F0FBFC", borderTop: "1px solid rgba(0,151,172,.18)" }}>
                      <b style={{ color: "var(--ust-dark)" }}>+3 surfaces shown vs default Viewer:</b><br />
                      Personalized hero · Edit affordance on RIA tile · Capability admin shortcut bar (hidden in this preview)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
