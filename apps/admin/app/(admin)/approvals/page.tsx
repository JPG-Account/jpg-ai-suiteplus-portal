"use client";

// Screen 11 · Approvals Inbox · BACKEND-WIRED · V0.8 dual-control engine
import { useCallback, useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";
import { ToastView, useToast } from "../../../components/Toast";
import { csrfHeader } from "../../../components/CsrfBootstrap";

type Approval = {
  id: string;
  kind: "publish" | "role_grant" | "integration" | "secret_rotation";
  title: string;
  detail: string | null;
  justification: string | null;
  payload: Record<string, unknown>;
  requester: { id: string; email: string; name: string };
  approver: { id: string; email: string; name: string } | null;
  state: "pending" | "approved" | "rejected" | "withdrawn" | "executed";
  stateNotes: string | null;
  slaDueAt: string | null;
  createdAt: string;
  decidedAt: string | null;
  executedAt: string | null;
};

const KIND_LABEL: Record<Approval["kind"], string> = {
  publish: "Publish",
  role_grant: "Role grant",
  integration: "Integration",
  secret_rotation: "Secret rotation",
};

function timeUntil(iso: string | null): { tone: "danger" | "warn" | "ok"; label: string } {
  if (!iso) return { tone: "ok", label: "—" };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) {
    const past = Math.round(-ms / 60000);
    if (past < 60) return { tone: "danger", label: `Past SLA · ${past}m` };
    return { tone: "danger", label: `Past SLA · ${Math.round(past / 60)}h` };
  }
  const left = Math.round(ms / 60000);
  if (left < 60) return { tone: "warn", label: `SLA · ${left}m left` };
  const h = Math.round(left / 60);
  return { tone: h < 8 ? "warn" : "ok", label: `SLA · ${h}h left` };
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKind, setNewKind] = useState<Approval["kind"]>("publish");
  const [newTitle, setNewTitle] = useState("");
  const [newJustification, setNewJustification] = useState("");
  const [decideOpen, setDecideOpen] = useState<"approve" | "reject" | "execute" | "withdraw" | null>(null);
  const [decideNotes, setDecideNotes] = useState("");
  const { toast, ok, err } = useToast();

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/approvals");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setApprovals(j.approvals ?? []);
    } catch (e: any) {
      err(`Load failed: ${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  }, [err]);

  useEffect(() => { reload(); }, [reload]);

  const selected = approvals.find((a) => a.id === selectedId) ?? null;

  async function createApproval() {
    const t = newTitle.trim();
    const j = newJustification.trim();
    if (t.length < 3 || j.length < 10) {
      err(`Title (min 3) and justification (min 10) required.`);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ kind: newKind, title: t, justification: j }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message ?? data?.error ?? `HTTP ${r.status}`);
      ok(`Approval requested · ${data.approval.id}`);
      setCreateOpen(false);
      setNewTitle("");
      setNewJustification("");
      await reload();
      setSelectedId(data.approval.id);
    } catch (e: any) {
      err(`Request failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision() {
    if (!selected || !decideOpen) return;
    if (decideNotes.trim().length < 5) {
      err("Notes required (min 5 chars).");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/approvals/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ decision: decideOpen, notes: decideNotes.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message ?? data?.error ?? `HTTP ${r.status}`);
      if (decideOpen === "execute" && data.revisionNumber) {
        ok(`Executed · published revision v${data.revisionNumber} · portal updating`);
      } else {
        ok(`Decision recorded · state = ${data.state}`);
      }
      setDecideOpen(null);
      setDecideNotes("");
      await reload();
    } catch (e: any) {
      err(`Decision failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  const pending = approvals.filter((a) => a.state === "pending");
  const decided = approvals.filter((a) => a.state !== "pending");

  return (
    <>
      <TopBar
        crumbs={[{ label: "Approvals Inbox", bold: true }]}
        pill={{ tone: pending.length > 0 ? "amber" : "green", label: `${pending.length} pending · ${decided.length} decided` }}
      />
      <ActionBar
        title="Approvals Inbox"
        sub="V0.8 · dual-control queue + state machine + justification capture. Self-approval permitted in dev (single Super Admin); V0.9 enforces requester ≠ approver via IAS."
        actions={<>
          <button className="btn">Delegation rules (V0.9)</button>
          <button className="btn primary" onClick={() => setCreateOpen(true)}>{Icon.plus} New approval request</button>
        </>}
      />
      <div className="content" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Queue · {pending.length} pending</h3>
            <span className="meta">{decided.length} decided shown</span>
          </div>
          <div style={{ padding: 0 }}>
            {pending.length === 0 && decided.length === 0 && !loading && (
              <div className="empty-state">
                <h4>No approvals yet</h4>
                <p>Click <b>New approval request</b> to create one. Try a publish approval to walk the full flow.</p>
              </div>
            )}
            {[...pending, ...decided].map((a) => {
              const sla = timeUntil(a.slaDueAt);
              const isSel = a.id === selectedId;
              const isCritical = sla.tone === "danger" && a.state === "pending";
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: isSel ? "#F0FBFC" : isCritical ? "#FEF4F5" : "transparent",
                    borderLeft: isCritical ? "4px solid #9A1F2B" : isSel ? "4px solid var(--ust-dark)" : "4px solid transparent",
                    padding: "16px 18px",
                    border: "none",
                    borderBottom: "1px solid rgba(13,53,60,.08)",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span className={`pill ${a.state === "pending" ? (sla.tone === "danger" ? "danger" : "avail") : a.state === "executed" ? "live" : a.state === "rejected" || a.state === "withdrawn" ? "danger" : "demo"}`}>
                      {a.state === "pending" ? sla.label : a.state.toUpperCase()}
                    </span>
                    <span style={{ background: "rgba(0,110,116,.12)", color: "var(--ust-dark)", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".05em" }}>{KIND_LABEL[a.kind]}</span>
                    <span style={{ fontSize: 12, color: "#52646C" }}>{a.id.slice(0, 12)}</span>
                  </div>
                  <div style={{ fontSize: "14.5px", color: "var(--ust-deep)", fontWeight: 700, letterSpacing: "-.01em", marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: "#3F4F58" }}>
                    <b>Requester</b> {a.requester.name}
                    {a.approver && <> · <b>Approver</b> {a.approver.name}</>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>{selected ? `${selected.id.slice(0, 16)}…` : "Select an approval"}</h3>
            <span className="meta">{selected?.state ?? ""}</span>
          </div>
          <div className="card-b">
            {!selected ? (
              <div className="empty-state">
                <h4>Pick an approval from the queue</h4>
                <p>Approver actions appear here when selected.</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "#7F8B92", textTransform: "uppercase", letterSpacing: ".10em", fontWeight: 700, marginBottom: 8 }}>Detail</div>
                <div style={{ fontSize: 14, color: "var(--ust-deep)", fontWeight: 700, marginBottom: 4 }}>{selected.title}</div>
                <div style={{ fontSize: 13, color: "#3F4F58", marginBottom: 12 }}>{selected.detail ?? <em>(no detail)</em>}</div>

                <div style={{ background: "#F4FAFB", border: "1px solid rgba(13,53,60,.08)", borderRadius: 10, padding: "10px 12px", fontSize: "12.5px", color: "#3F4F58", marginBottom: 14 }}>
                  <b style={{ color: "var(--ust-deep)" }}>Justification:</b> &quot;{selected.justification}&quot;
                </div>

                <div style={{ fontSize: 11, color: "#7F8B92", textTransform: "uppercase", letterSpacing: ".10em", fontWeight: 700, marginBottom: 8 }}>Timeline</div>
                <div style={{ fontSize: 12.5, color: "#52646C", lineHeight: 1.8, marginBottom: 14 }}>
                  <div><b style={{ color: "var(--ust-deep)" }}>Requested</b> · {new Date(selected.createdAt).toLocaleString()} by {selected.requester.name}</div>
                  {selected.decidedAt && (
                    <div><b style={{ color: "var(--ust-deep)" }}>{selected.state === "approved" ? "Approved" : selected.state === "rejected" ? "Rejected" : "Withdrawn"}</b> · {new Date(selected.decidedAt).toLocaleString()}{selected.approver ? ` by ${selected.approver.name}` : ""}</div>
                  )}
                  {selected.executedAt && (
                    <div><b style={{ color: "var(--ust-deep)" }}>Executed</b> · {new Date(selected.executedAt).toLocaleString()}</div>
                  )}
                  {selected.stateNotes && <div style={{ marginTop: 4 }}><i>“{selected.stateNotes}”</i></div>}
                </div>

                {selected.state === "pending" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn primary" onClick={() => { setDecideOpen("approve"); setDecideNotes(""); }}>{Icon.check} Approve</button>
                    <button className="btn danger" onClick={() => { setDecideOpen("reject"); setDecideNotes(""); }}>{Icon.close} Reject</button>
                    <button className="btn" onClick={() => { setDecideOpen("withdraw"); setDecideNotes(""); }}>Withdraw</button>
                  </div>
                )}
                {selected.state === "approved" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn primary" onClick={() => { setDecideOpen("execute"); setDecideNotes(""); }}>{Icon.arrowRight} Execute</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="modal-host" role="dialog" aria-label="New approval request" onClick={(e) => { if (e.target === e.currentTarget && !busy) setCreateOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-h">
              <div><b>New approval request</b><span className="sub">routes through dual-control queue</span></div>
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={() => setCreateOpen(false)} disabled={busy}>{Icon.close}</button>
            </div>
            <div className="modal-b">
              <div className="field">
                <label>Kind</label>
                <select value={newKind} onChange={(e) => setNewKind(e.target.value as Approval["kind"])}>
                  <option value="publish">Publish (executes via approve→execute · creates new revision)</option>
                  <option value="role_grant">Role grant (noop in V0.8 · V0.9 wires the side-effect)</option>
                  <option value="integration">Integration (noop in V0.8)</option>
                  <option value="secret_rotation">Secret rotation (noop in V0.8)</option>
                </select>
              </div>
              <div className="field">
                <label>Title <span style={{ color: "#9A1F2B" }}>*</span></label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Publish SAPPHIRE hero v48 → Prod" />
              </div>
              <div className="field">
                <label>Justification <span style={{ color: "#9A1F2B" }}>*</span></label>
                <textarea value={newJustification} onChange={(e) => setNewJustification(e.target.value)} placeholder="Why is this needed? Captured in the audit forever." style={{ minHeight: 96 }} />
                <span className="help-line">Min 10 characters · {newJustification.trim().length} typed</span>
              </div>
            </div>
            <div className="modal-foot">
              <div style={{ fontSize: 12.5, color: "#52646C" }}>SLA: {SLA_HOURS_LABEL(newKind)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</button>
                <button className="btn primary" disabled={busy || newTitle.trim().length < 3 || newJustification.trim().length < 10} onClick={createApproval}>{busy ? "Submitting…" : "Submit request"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decide modal */}
      {decideOpen && selected && (
        <div className="modal-host" role="dialog" aria-label={`${decideOpen} approval`} onClick={(e) => { if (e.target === e.currentTarget && !busy) setDecideOpen(null); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-h">
              <div><b>{decideOpen === "approve" ? "Approve" : decideOpen === "reject" ? "Reject" : decideOpen === "execute" ? "Execute" : "Withdraw"}</b><span className="sub">{selected.title}</span></div>
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={() => setDecideOpen(null)} disabled={busy}>{Icon.close}</button>
            </div>
            <div className="modal-b">
              {decideOpen === "execute" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFF8EC", border: "1px solid #ECD8A6", borderRadius: 10, fontSize: 13, color: "#5E3700" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01"/></svg>
                  <b style={{ fontWeight: 800 }}>This will publish a new revision and update the public portal.</b>
                </div>
              )}
              <div className="field">
                <label>Notes <span style={{ color: "#9A1F2B" }}>*</span></label>
                <textarea value={decideNotes} onChange={(e) => setDecideNotes(e.target.value)} placeholder="Captured in audit log" style={{ minHeight: 96 }} />
                <span className="help-line">Min 5 characters · {decideNotes.trim().length} typed</span>
              </div>
            </div>
            <div className="modal-foot">
              <div style={{ fontSize: 12.5, color: "#52646C" }}>Audit lineage preserved</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setDecideOpen(null)} disabled={busy}>Cancel</button>
                <button className={`btn ${decideOpen === "approve" || decideOpen === "execute" ? "primary" : "danger"}`} disabled={busy || decideNotes.trim().length < 5} onClick={submitDecision}>
                  {busy ? "…" : decideOpen === "approve" ? "Confirm approve" : decideOpen === "reject" ? "Confirm reject" : decideOpen === "execute" ? "Confirm execute & publish" : "Confirm withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastView toast={toast} />
    </>
  );
}

function SLA_HOURS_LABEL(kind: Approval["kind"]): string {
  const h = { publish: 4, role_grant: 4, integration: 24, secret_rotation: 8 }[kind];
  return `${h}h`;
}
