"use client";

// Screen 01 · Action Dashboard · BACKEND-WIRED
// Real "things requiring action" composed from /api/admin/{revisions, audit}.
// Stub: tile health (no health probe yet — V0.8 plumbs it).
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../components/TopBar";
import { Icon } from "../../components/Icons";
import { ToastView, useToast } from "../../components/Toast";
import { RollbackModal } from "../../components/RollbackModal";
import { csrfHeader } from "../../components/CsrfBootstrap";

type Revision = {
  revisionNumber: number;
  publishedAt: string;
  publishedBy: { email: string; name: string };
  notes: string;
  isCurrent: boolean;
};

type AuditEvent = {
  id: string;
  ts: string;
  actor: { email: string; name: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function avatarChars(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Dashboard() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [me, setMe] = useState<{ email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetRevision, setTargetRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, ok, err } = useToast();

  useEffect(() => { reload(); }, []);

  async function reload() {
    try {
      const [rv, au, mer] = await Promise.all([
        fetch("/api/admin/revisions").then((r) => r.json()),
        fetch("/api/admin/audit?limit=40").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setRevisions(rv.revisions ?? []);
      setAudit(au.events ?? []);
      setMe(mer.user ?? null);
    } catch {
      // Soft fail — render empty states
    } finally {
      setLoading(false);
    }
  }

  async function confirmRollback(notes: string) {
    if (targetRevision == null) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ revisionNumber: targetRevision, notes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? j?.error ?? `HTTP ${r.status}`);
      ok(`Rolled back from v${j.rolledBackFrom ?? "?"} → v${j.rolledBackTo} · "${notes.slice(0, 40)}${notes.length > 40 ? "…" : ""}"`);
      setTargetRevision(null);
      await reload();
    } catch (e: any) {
      err(`Rollback failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  const recentPublishes = audit.filter((e) => e.action === "publish" || e.action === "rollback").slice(0, 5);
  const criticalEvents = audit.filter((e) => e.action.includes("denied") || e.action.endsWith("_failed")).slice(0, 5);
  const editEvents = audit.filter((e) => e.action.includes("updated") || e.action.includes("granted") || e.action.includes("rotated")).slice(0, 5);
  const current = revisions.find((r) => r.isCurrent);

  return (
    <>
      <TopBar
        crumbs={[{ label: "Overview", bold: true }]}
        pill={current ? { tone: "green", label: `Live · v${current.revisionNumber}` } : undefined}
      />
      <ActionBar
        title={`Good morning, ${me?.displayName?.split(" ")[0] ?? "Admin"}.`}
        sub={loading
          ? "Loading…"
          : `${revisions.length} revision${revisions.length === 1 ? "" : "s"} in history · ${audit.length} recent audit events · backend live.`}
        actions={<>
          <button className="btn" onClick={reload}>{Icon.rotate} Refresh</button>
          <a className="btn primary" href="/site/composer">Edit landing page {Icon.arrowRight}</a>
        </>}
      />
      <div className="content">
        <div className="dash dash-3" style={{ marginBottom: 18 }}>
          {/* Things requiring action (V0.7.1: critical audit events) */}
          <div className="card">
            <div className="card-h">
              <h3>🔔 Things requiring your attention</h3>
              <span className="meta">{criticalEvents.length} critical · {audit.length} recent</span>
            </div>
            <div className="card-b">
              {criticalEvents.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px 0" }}>
                  <h4>All clear</h4>
                  <p>No failed sign-ins or denials in recent audit. Edit landing copy, or browse the audit log.</p>
                </div>
              ) : (
                criticalEvents.map((e) => (
                  <div key={e.id} className="approval-row">
                    <span className="badge danger">Critical</span>
                    <div className="desc">
                      <b>{e.action}</b><br />
                      <span>{e.actor?.email ?? "System"} · {timeAgo(e.ts)}</span>
                    </div>
                    <a className="btn sm" href="/governance/audit">Open</a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stub: tiles failing health */}
          <div className="card">
            <div className="card-h"><h3>⚠ Tiles failing health</h3><span className="meta">stub · V0.8 plumbs probes</span></div>
            <div className="card-b">
              <div className="empty-state" style={{ padding: "16px 0" }}>
                <h4>Health probes coming V0.8</h4>
                <p>This widget will show per-tile manifest health, broken deep-links, and per-tile rollback once probes are wired.</p>
              </div>
            </div>
          </div>

          {/* Recent prod publishes — with REAL rollback */}
          <div className="card">
            <div className="card-h"><h3>⤺ Recent publishes</h3><span className="meta">{recentPublishes.length} in last 24h</span></div>
            <div className="card-b">
              {recentPublishes.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px 0" }}>
                  <h4>No recent publishes</h4>
                  <p>Edit a block in Site Composer and publish to see it here.</p>
                </div>
              ) : (
                recentPublishes.map((e) => (
                  <div key={e.id} className="approval-row">
                    <span className={`badge ${e.action === "rollback" ? "blue" : "good"}`}>{e.action === "rollback" ? `rb v${e.entityId}` : `v${e.entityId}`}</span>
                    <div className="desc">
                      <b>{e.action === "rollback" ? "Rollback" : "Publish"}</b><br />
                      <span>{e.actor?.name ?? "System"} · {timeAgo(e.ts)}</span>
                    </div>
                    {!current || Number(e.entityId) !== current.revisionNumber ? (
                      <button className="btn sm" disabled={busy} onClick={() => setTargetRevision(Number(e.entityId))}>
                        Rollback here
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "#1B6A55", fontWeight: 800 }}>CURRENT</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dash dash-eq3">
          {/* SCIM stub */}
          <div className="card">
            <div className="card-h"><h3>🔌 SCIM sync</h3><span className="meta">stub · V0.9 wires IPS</span></div>
            <div className="card-b">
              <div className="empty-state" style={{ padding: "16px 0" }}>
                <h4>No SCIM endpoint yet</h4>
                <p>SAP IPS push lands in V0.9 alongside IAS OIDC.</p>
              </div>
            </div>
          </div>
          {/* Recent edits */}
          <div className="card">
            <div className="card-h"><h3>✏ Recent edits</h3><span className="meta">{editEvents.length} shown</span></div>
            <div className="card-b">
              {editEvents.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px 0" }}>
                  <h4>No edits yet</h4>
                  <p>Use Site Composer, Tile Editor, or Snippets to make changes.</p>
                </div>
              ) : (
                editEvents.map((e) => {
                  const cls = ["a1", "a3", "a5", "a4", "a2", "a6"][avatarChars(e.actor?.name ?? "S").charCodeAt(0) % 6];
                  return (
                    <div key={e.id} className="audit-row-mini">
                      <span className="act">
                        <b>{avatarChars(e.actor?.name ?? "System")}</b> {e.action} on <b>{e.entityType}</b>
                        <br />
                        <small>{timeAgo(e.ts)}{e.entityId ? ` · ${e.entityId}` : ""}</small>
                      </span>
                      <span className="tag">{e.action}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Revisions glance */}
          <div className="card">
            <div className="card-h"><h3>📦 Revisions</h3><span className="meta">{revisions.length} total</span></div>
            <div className="card-b">
              {revisions.slice(0, 5).map((r) => (
                <div key={r.revisionNumber} className="audit-row-mini">
                  <span className="act">
                    <b>v{r.revisionNumber}</b> {r.isCurrent && <span style={{ fontSize: 10, marginLeft: 6, background: "#E0F5EB", color: "#1B6A55", padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>CURRENT</span>}
                    <br />
                    <small>{r.publishedBy?.name ?? "—"} · {timeAgo(r.publishedAt)}</small>
                  </span>
                  {!r.isCurrent ? (
                    <button className="btn ghost sm" disabled={busy} onClick={() => setTargetRevision(r.revisionNumber)}>Roll back</button>
                  ) : null}
                </div>
              ))}
              <a href="/governance/revisions" style={{ display: "block", marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--ust-dark)" }}>View all revisions →</a>
            </div>
          </div>
        </div>
      </div>

      <RollbackModal
        open={targetRevision != null}
        targetRevision={targetRevision}
        currentRevision={current?.revisionNumber ?? null}
        busy={busy}
        onConfirm={confirmRollback}
        onCancel={() => { if (!busy) setTargetRevision(null); }}
      />

      <ToastView toast={toast} />
    </>
  );
}
