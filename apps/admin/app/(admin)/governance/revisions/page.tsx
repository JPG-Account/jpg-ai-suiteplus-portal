"use client";

// Screen NEW · Revisions · browse history + rollback (with REQUIRED notes)
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { ToastView, useToast } from "../../../../components/Toast";
import { RollbackModal } from "../../../../components/RollbackModal";

type Revision = {
  revisionNumber: number;
  publishedAt: string;
  publishedBy: { email: string; name: string };
  notes: string;
  isCurrent: boolean;
};

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [targetRevision, setTargetRevision] = useState<number | null>(null);
  const { toast, ok, err } = useToast();

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function reload() {
    try {
      const r = await fetch("/api/admin/revisions");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRevisions(j.revisions ?? []);
    } catch (e: any) {
      err(`Load failed: ${e?.message ?? "unknown"}`);
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
        headers: { "Content-Type": "application/json" },
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

  const current = revisions.find((r) => r.isCurrent);

  return (
    <>
      <TopBar
        crumbs={[{ label: "Governance" }, { label: "Revisions", bold: true }]}
        pill={current ? { tone: "green", label: `Current · v${current.revisionNumber}` } : undefined}
      />
      <ActionBar
        title="Revisions"
        sub={loading
          ? "Loading…"
          : `${revisions.length} immutable revisions in history. Every publish or rollback writes a notes-bearing audit row. Click "Roll back to this" — notes are required.`}
        actions={<>
          <button className="btn" onClick={reload}>{Icon.rotate} Refresh</button>
          <a className="btn primary" href="/site/composer">New publish via Composer {Icon.arrowRight}</a>
        </>}
      />
      <div style={{ padding: "0 28px 24px" }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Revision</th>
                <th>Published by</th>
                <th>Published at</th>
                <th>Notes</th>
                <th>State</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {revisions.length === 0 && !loading && (
                <tr><td colSpan={6}><div className="empty-state"><h4>No revisions yet</h4><p>Publish from Site Composer to create the first one.</p></div></td></tr>
              )}
              {revisions.map((r) => (
                <tr key={r.revisionNumber}>
                  <td><b style={{ color: "var(--ust-deep)" }}>v{r.revisionNumber}</b></td>
                  <td>
                    {r.publishedBy?.name ?? "—"}
                    <div style={{ fontSize: 12, color: "#7F8B92" }}>{r.publishedBy?.email ?? ""}</div>
                  </td>
                  <td><span className="last">{new Date(r.publishedAt).toLocaleString()}</span></td>
                  <td style={{ maxWidth: 360, color: "#52646C" }}>
                    {r.notes ? r.notes : <span style={{ fontStyle: "italic" }}>—</span>}
                  </td>
                  <td>{r.isCurrent ? <span className="pill live">Current</span> : <span className="pill avail">Archived</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    {!r.isCurrent ? (
                      <button className="btn sm" disabled={busy} onClick={() => setTargetRevision(r.revisionNumber)}>
                        Roll back to this
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "#1B6A55", fontWeight: 800, letterSpacing: ".06em" }}>CURRENT</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
