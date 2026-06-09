"use client";

// Capabilities admin — full CRUD.
//   List → per-row Enable/Disable + Edit + Delete.
//   Row click → edit drawer (name, slug, type, status, lanes, description, features).
//   New capability button → create drawer.
//   All edits go through the unpublished-changes pill → Publish to Prod flow.

import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";
import { ToastView, useToast } from "../../../components/Toast";
import { csrfHeader } from "../../../components/CsrfBootstrap";

type Status = "live" | "demo" | "available";

type ApiCapability = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  type: string;
  status: Status;
  primaryLaneId: string;
  secondaryLaneIds: string[];
  description: string;
  features: string[];
  searchKeywords: string;
  enabled: boolean;
  sortOrder: number;
};

type ApiLane = { id: string; slug: string; name: string };

type DraftMode = { kind: "edit"; id: string } | { kind: "create" };

const EMPTY_DRAFT = {
  name: "",
  slug: "",
  shortName: "",
  type: "",
  status: "demo" as Status,
  primaryLaneId: "",
  secondaryLaneIds: [] as string[],
  description: "",
  features: [] as string[],
  searchKeywords: "",
  enabled: true,
};

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<ApiCapability[]>([]);
  const [lanes, setLanes] = useState<ApiLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [mode, setMode] = useState<DraftMode | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ApiCapability | null>(null);
  const { toast, ok, err } = useToast();

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function reload() {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/admin/capabilities"),
        fetch("/api/admin/lanes"),
      ]);
      if (!cRes.ok) throw new Error(`capabilities HTTP ${cRes.status}`);
      if (!lRes.ok) throw new Error(`lanes HTTP ${lRes.status}`);
      const cj = await cRes.json();
      const lj = await lRes.json();
      setCaps(cj.capabilities ?? []);
      setLanes(lj.lanes ?? []);
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setMode({ kind: "create" });
    setDraft({ ...EMPTY_DRAFT });
  }

  function openEdit(c: ApiCapability) {
    setMode({ kind: "edit", id: c.id });
    setDraft({
      name: c.name,
      slug: c.slug,
      shortName: c.shortName ?? "",
      type: c.type,
      status: c.status,
      primaryLaneId: c.primaryLaneId,
      secondaryLaneIds: c.secondaryLaneIds,
      description: c.description,
      features: c.features,
      searchKeywords: c.searchKeywords,
      enabled: c.enabled,
    });
  }

  function closeDrawer() {
    if (saving) return;
    setMode(null);
    setDraft(EMPTY_DRAFT);
  }

  // Quick toggle (the per-row button)
  async function toggle(c: ApiCapability) {
    setBusyId(c.id);
    try {
      const next = !c.enabled;
      const r = await fetch("/api/admin/capabilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ id: c.id, enabled: next }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setCaps((cs) => cs.map((x) => x.id === c.id ? { ...x, enabled: next } : x));
      const nd = new Set(dirtyIds); nd.add(c.id); setDirtyIds(nd);
      ok(`${c.name} ${next ? "enabled" : "disabled"} · publish to push live`);
    } catch (e: any) {
      err(`Toggle failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBusyId(null);
    }
  }

  // Save (create OR edit)
  async function saveDraft() {
    if (!mode) return;
    if (!draft.name.trim()) { err("Name is required"); return; }
    if (!draft.slug.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) {
      err("Slug must be lowercase letters/numbers/hyphens (e.g. 'my-capability')");
      return;
    }
    if (!draft.type.trim()) { err("Type is required"); return; }
    if (!draft.primaryLaneId) { err("Primary lane is required"); return; }
    if (!draft.description.trim()) { err("Description is required"); return; }

    setSaving(true);
    try {
      const body = {
        ...draft,
        shortName: draft.shortName.trim() || null,
        features: draft.features.filter((f) => f.trim().length > 0),
      };
      const url = "/api/admin/capabilities";
      let r: Response;
      if (mode.kind === "create") {
        r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeader() },
          body: JSON.stringify(body),
        });
      } else {
        r = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeader() },
          body: JSON.stringify({ id: mode.id, ...body }),
        });
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j?.error === "slug_taken") throw new Error(`Slug "${draft.slug}" is already in use`);
        if (j?.error === "invalid_lane_ids") throw new Error(`Unknown lane ids: ${(j.missing ?? []).join(", ")}`);
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      const nd = new Set(dirtyIds);
      nd.add(mode.kind === "create" ? j.capability.id : mode.id);
      setDirtyIds(nd);
      await reload();
      closeDrawer();
      ok(`Capability ${mode.kind === "create" ? "created" : "saved"} · publish to push live`);
    } catch (e: any) {
      err(`Save failed: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  // Delete (confirmed)
  async function deleteCap(c: ApiCapability) {
    setBusyId(c.id);
    try {
      const r = await fetch(`/api/admin/capabilities?id=${encodeURIComponent(c.id)}`, {
        method: "DELETE",
        headers: { ...csrfHeader() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const nd = new Set(dirtyIds); nd.add(c.id); setDirtyIds(nd);
      await reload();
      ok(`${c.name} deleted · publish to push live`);
      setConfirmDelete(null);
    } catch (e: any) {
      err(`Delete failed: ${e?.message ?? "unknown"}`);
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
        body: JSON.stringify({ notes: `Capabilities CRUD · ${dirtyIds.size} change(s)` }),
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
            : "Create, edit, enable/disable, or delete capabilities. Changes stage as drafts until you publish to prod."}
        actions={<>
          <button className="btn" onClick={reload}>{Icon.rotate} Refresh</button>
          <button className="btn" onClick={openCreate}>{Icon.plus} New capability</button>
          <button
            className="btn primary"
            disabled={dirtyIds.size === 0 || publishing}
            onClick={publish}
          >
            {publishing ? "Publishing…" : `Publish${dirtyIds.size > 0 ? ` (${dirtyIds.size}) ` : " "}to Prod`} {Icon.arrowRight}
          </button>
        </>}
      />

      <div className="drawer-stage">
        <div className="table-wrap" style={{ margin: "0 28px" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Type</th>
                <th>Status</th>
                <th>Lane</th>
                <th>State</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {caps.length === 0 && !loading && (
                <tr><td colSpan={6}><div className="empty-state"><h4>No capabilities</h4><p>Click <b>New capability</b> to add one.</p></div></td></tr>
              )}
              {caps.map((c) => {
                const isDirty = dirtyIds.has(c.id);
                const isBusy = busyId === c.id;
                const laneName = lanes.find((l) => l.id === c.primaryLaneId)?.name ?? c.primaryLaneId;
                return (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div>
                        <b style={{ color: "var(--ust-deep)" }}>{c.name}</b>
                        {isDirty && <span style={{ marginLeft: 8, fontSize: 10, color: "#9A1F2B", fontWeight: 800 }}>● UNPUBLISHED</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#7F8B92" }}>{c.slug}</div>
                    </td>
                    <td><span style={{ fontSize: 12.5, color: "#52646C" }}>{c.type}</span></td>
                    <td>
                      <span className={`pill ${c.status === "live" ? "live" : "avail"}`}>{c.status}</span>
                    </td>
                    <td><span style={{ fontSize: 12.5, color: "#52646C" }}>{laneName}</span></td>
                    <td>
                      {c.enabled
                        ? <span className="pill live">Enabled</span>
                        : <span className="pill avail">Disabled</span>}
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`btn sm ${c.enabled ? "" : "primary"}`}
                        disabled={isBusy}
                        onClick={() => toggle(c)}
                        style={{ marginRight: 6 }}
                      >
                        {isBusy ? "…" : c.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="btn ghost sm"
                        disabled={isBusy}
                        onClick={() => setConfirmDelete(c)}
                        style={{ color: "#9A1F2B" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Edit / Create drawer ─── */}
        {mode && (
          <aside className="drawer" role="dialog" aria-label={mode.kind === "create" ? "New capability" : "Edit capability"}>
            <div className="drawer-h">
              <div className="title">
                <b>{mode.kind === "create" ? "New capability" : `Edit · ${draft.name || "(unnamed)"}`}</b>
                <span>{mode.kind === "edit" ? `id ${mode.id}` : "create + auto-tile"}</span>
              </div>
              <button className="close" onClick={closeDrawer} aria-label="Close">{Icon.close}</button>
            </div>
            <div className="drawer-b">
              <div className="field">
                <label>Name <span style={{ color: "#9A1F2B" }}>*</span></label>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setDraft({
                      ...draft,
                      name,
                      // Auto-derive slug ONLY on create when slug hasn't been hand-edited
                      slug: mode.kind === "create" && (draft.slug === "" || draft.slug === slugify(draft.name))
                        ? slugify(name)
                        : draft.slug,
                    });
                  }}
                  placeholder="e.g. Rapid Impact Analyzer"
                />
              </div>
              <div className="field">
                <label>Slug <span style={{ color: "#9A1F2B" }}>*</span></label>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="my-capability"
                  disabled={mode.kind === "edit"}
                  style={mode.kind === "edit" ? { background: "#F4FAFB", color: "#7F8B92" } : undefined}
                />
                <span className="help-line">
                  Lowercase letters/numbers/hyphens. {mode.kind === "edit" ? "Slug is immutable after creation." : "Auto-derived from name."}
                </span>
              </div>
              <div className="field">
                <label>Short name</label>
                <input
                  value={draft.shortName}
                  onChange={(e) => setDraft({ ...draft, shortName: e.target.value })}
                  placeholder="(optional)"
                />
              </div>
              <div className="field">
                <label>Type <span style={{ color: "#9A1F2B" }}>*</span></label>
                <input
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                  placeholder="e.g. AI-assisted analyzer"
                />
              </div>
              <div className="field">
                <label>Status <span style={{ color: "#9A1F2B" }}>*</span></label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
                >
                  <option value="live">Live</option>
                  <option value="demo">Demo</option>
                  <option value="available">Available</option>
                </select>
              </div>
              <div className="field">
                <label>Primary lane <span style={{ color: "#9A1F2B" }}>*</span></label>
                <select
                  value={draft.primaryLaneId}
                  onChange={(e) => setDraft({ ...draft, primaryLaneId: e.target.value })}
                >
                  <option value="">— Select a lane —</option>
                  {lanes.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Secondary lanes</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {lanes
                    .filter((l) => l.id !== draft.primaryLaneId)
                    .map((l) => {
                      const checked = draft.secondaryLaneIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          className={`chip ${checked ? "active" : ""}`}
                          onClick={() => {
                            const next = checked
                              ? draft.secondaryLaneIds.filter((id) => id !== l.id)
                              : [...draft.secondaryLaneIds, l.id];
                            setDraft({ ...draft, secondaryLaneIds: next });
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {l.name}
                        </button>
                      );
                    })}
                </div>
              </div>
              <div className="field">
                <label>Description <span style={{ color: "#9A1F2B" }}>*</span></label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What it does, in one or two sentences."
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="field">
                <label>Features (one per line)</label>
                <textarea
                  value={draft.features.join("\n")}
                  onChange={(e) => setDraft({ ...draft, features: e.target.value.split("\n") })}
                  placeholder="One bullet per line. Up to 10."
                  style={{ minHeight: 100 }}
                />
                <span className="help-line">{draft.features.filter(f => f.trim()).length} / 10 features</span>
              </div>
              <div className="field">
                <label>Search keywords</label>
                <input
                  value={draft.searchKeywords}
                  onChange={(e) => setDraft({ ...draft, searchKeywords: e.target.value })}
                  placeholder="space-separated terms for portal search"
                />
              </div>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                  /> Enabled (shown on public portal)
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6 }}>
                <button className="btn" onClick={closeDrawer} disabled={saving}>Discard</button>
                <button className="btn primary" disabled={saving} onClick={saveDraft}>
                  {saving ? "Saving…" : mode.kind === "create" ? "Create capability" : "Save changes"}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ─── Delete confirm ─── */}
      {confirmDelete && (
        <div className="modal-host" role="dialog" aria-label="Confirm delete"
          onClick={(e) => { if (e.target === e.currentTarget && !busyId) setConfirmDelete(null); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-h">
              <div><b>Delete capability</b><span className="sub">irreversible · also deletes the linked tile</span></div>
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={() => setConfirmDelete(null)} disabled={!!busyId}>{Icon.close}</button>
            </div>
            <div className="modal-b">
              <p style={{ fontSize: 14, color: "var(--ust-deep)" }}>
                Delete <b>{confirmDelete.name}</b> ({confirmDelete.slug})? The matching tile will also be removed. You can&apos;t undo this.
              </p>
            </div>
            <div className="modal-foot">
              <div style={{ fontSize: 12.5, color: "#52646C" }}>Audit lineage preserved</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setConfirmDelete(null)} disabled={!!busyId}>Cancel</button>
                <button className="btn danger" disabled={!!busyId} onClick={() => deleteCap(confirmDelete)}>
                  {busyId === confirmDelete.id ? "Deleting…" : "Confirm delete"}
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
