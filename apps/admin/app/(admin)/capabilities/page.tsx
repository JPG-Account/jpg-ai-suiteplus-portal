"use client";

// Capabilities · enabled/disabled toggle ONLY.
// Other fields (name, description, features, lanes, status) remain editorial
// copy seeded in code. This page exists so super admins can hide a capability
// from the public portal without a code change.

import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";
import { ToastView, useToast } from "../../../components/Toast";
import { csrfHeader } from "../../../components/CsrfBootstrap";

type ApiCapability = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  type: string;
  status: "live" | "demo" | "available";
  description: string;
  enabled: boolean;
  sortOrder: number;
};

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<ApiCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const { toast, ok, err } = useToast();

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/capabilities");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setCaps(j.capabilities ?? []);
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(c: ApiCapability) {
    setBusyId(c.id);
    try {
      const next = !c.enabled;
      const r = await fetch("/api/admin/capabilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ id: c.id, enabled: next }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      const updated = caps.map((x) => x.id === c.id ? { ...x, enabled: next } : x);
      setCaps(updated);
      const newDirty = new Set(dirtyIds);
      newDirty.add(c.id);
      setDirtyIds(newDirty);
      ok(`${c.name} ${next ? "enabled" : "disabled"} · publish to push live`);
    } catch (e: any) {
      err(`Toggle failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusyId(null);
    }
  }

  async function publish() {
    if (dirtyIds.size === 0) return;
    setPublishing(true);
    try {
      const r = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ notes: `Capabilities toggle · ${dirtyIds.size} change(s)` }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setDirtyIds(new Set());
      ok(`Published revision v${j.revision} · portal updates within seconds`);
    } catch (e: any) {
      err(`Publish failed: ${e?.message ?? "unknown"}`);
    } finally {
      setPublishing(false);
    }
  }

  const enabledCount = caps.filter((c) => c.enabled).length;

  return (
    <>
      <TopBar
        crumbs={[{ label: "Capabilities", bold: true }]}
        pill={dirtyIds.size > 0
          ? { tone: "amber", label: `${dirtyIds.size} unpublished change${dirtyIds.size > 1 ? "s" : ""}` }
          : { tone: "green", label: `${enabledCount} / ${caps.length} enabled` }}
      />
      <ActionBar
        title="Capabilities"
        sub={loading
          ? "Loading…"
          : error
            ? `Error: ${error}`
            : "Enable a capability to show it on the public portal. Disable to hide. Content (name, description, features) is managed via code — only the enabled flag is editable here."}
        actions={<>
          <button className="btn" onClick={reload}>{Icon.rotate} Refresh</button>
          <button
            className="btn primary"
            disabled={dirtyIds.size === 0 || publishing}
            onClick={publish}
          >
            {publishing ? "Publishing…" : `Publish${dirtyIds.size > 0 ? ` (${dirtyIds.size}) ` : " "}to Prod`} {Icon.arrowRight}
          </button>
        </>}
      />

      <div className="content" style={{ padding: "0 28px 24px" }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Capability</th>
                <th>Type</th>
                <th>Status</th>
                <th>State</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {caps.length === 0 && !loading && (
                <tr><td colSpan={6}><div className="empty-state"><h4>No capabilities found</h4><p>Run db:seed to populate.</p></div></td></tr>
              )}
              {caps.map((c) => {
                const isDirty = dirtyIds.has(c.id);
                const isBusy = busyId === c.id;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="tile-ico" style={{ display: "inline-block", width: 24, height: 24 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="4" width="18" height="14" rx="2" />
                        </svg>
                      </span>
                    </td>
                    <td>
                      <div>
                        <b style={{ color: "var(--ust-deep)" }}>{c.name}</b>
                        {isDirty && <span style={{ marginLeft: 8, fontSize: 10, color: "#9A1F2B", fontWeight: 800 }}>● UNPUBLISHED</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#7F8B92" }}>{c.slug}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: "#52646C" }}>{c.type}</span>
                    </td>
                    <td>
                      <span className={`pill ${c.status === "live" ? "live" : c.status === "demo" ? "avail" : "demo"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.enabled
                        ? <span className="pill live">Enabled</span>
                        : <span className="pill avail">Disabled</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`btn sm ${c.enabled ? "" : "primary"}`}
                        disabled={isBusy}
                        onClick={() => toggle(c)}
                      >
                        {isBusy ? "…" : c.enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", background: "#F4FAFB", border: "1px solid rgba(13,53,60,.08)", borderRadius: 10, fontSize: 12.5, color: "#52646C" }}>
          <b style={{ color: "var(--ust-deep)" }}>Note:</b> Toggling here doesn&apos;t push to the public portal automatically. Click <b>Publish to Prod</b> above to write a new config revision and update <code>ust-ai-suiteplus-portal</code> within seconds.
        </div>
      </div>

      <ToastView toast={toast} />
    </>
  );
}
