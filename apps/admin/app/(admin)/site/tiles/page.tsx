"use client";

// Screen 03 · Capability Tile Editor · BACKEND-WIRED
// Fetches real tiles · drawer edits route kind + template · PATCH on Save.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { ToastView, useToast } from "../../../../components/Toast";
import { csrfHeader } from "../../../../components/CsrfBootstrap";

type ApiTile = {
  id: string;
  capabilityId: string;
  capabilitySlug: string;
  capabilityName: string;
  routeKind: "internal" | "external" | "soon";
  routeTemplate: string;
  externalUrl: string | null;
  visibility: "public" | "role_gated";
  sortOrder: number;
};

export default function TilesPage() {
  const [tiles, setTiles] = useState<ApiTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<ApiTile["routeKind"]>("internal");
  const [draftTemplate, setDraftTemplate] = useState("");
  const [draftExternal, setDraftExternal] = useState("");
  const [draftVisibility, setDraftVisibility] = useState<ApiTile["visibility"]>("public");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [kindFilter, setKindFilter] = useState<"all" | ApiTile["routeKind"]>("all");
  const [filterText, setFilterText] = useState("");
  const { toast, ok, err } = useToast();
  const router = useRouter();

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tiles");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setTiles(j.tiles ?? []);
      if (!selectedId && j.tiles?.[0]) selectFromList(j.tiles[0]);
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  function selectFromList(t: ApiTile) {
    setSelectedId(t.id);
    setDraftKind(t.routeKind);
    setDraftTemplate(t.routeTemplate);
    setDraftExternal(t.externalUrl ?? "");
    setDraftVisibility(t.visibility);
  }

  const selected = tiles.find((t) => t.id === selectedId) ?? null;
  const drawerDirty =
    !!selected &&
    (selected.routeKind !== draftKind ||
      selected.routeTemplate !== draftTemplate ||
      (selected.externalUrl ?? "") !== draftExternal ||
      selected.visibility !== draftVisibility);

  function isValidHttpUrl(s: string): boolean {
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }
  const externalUrlMissing = draftKind === "external" && draftExternal.trim() === "";
  const externalUrlInvalid =
    draftKind === "external" && draftExternal.trim() !== "" && !isValidHttpUrl(draftExternal.trim());
  const saveBlocked = externalUrlMissing || externalUrlInvalid;

  async function save() {
    if (!selected || !drawerDirty || saveBlocked) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        id: selected.id,
        routeKind: draftKind,
        visibility: draftVisibility,
      };
      if (draftKind === "external") {
        body.externalUrl = draftExternal.trim();
        // If a URL was pasted into the route template by mistake, restore
        // the registry default instead of publishing the URL as a template.
        body.routeTemplate = isValidHttpUrl(draftTemplate)
          ? `/capabilities/${selected.capabilitySlug}`
          : draftTemplate;
      } else {
        body.externalUrl = null;
        body.routeTemplate = draftTemplate;
      }

      const r = await fetch("/api/admin/tiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const fieldErrors = j?.details?.fieldErrors as Record<string, string[]> | undefined;
        const firstError = fieldErrors && Object.values(fieldErrors).flat()[0];
        throw new Error(firstError ?? `HTTP ${r.status}`);
      }
      const next = new Set(dirtyIds);
      next.add(selected.id);
      setDirtyIds(next);
      await reload();
      ok(`Tile "${selected.capabilityName}" saved · publish to push live`);
    } catch (e: any) {
      err(`Save failed: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (dirtyIds.size === 0) return;
    setPublishing(true);
    try {
      const r = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ notes: `Tile editor publish · ${dirtyIds.size} tile change(s)` }),
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

  return (
    <>
      <TopBar
        crumbs={[{ label: "Site Composer" }, { label: "Capability tiles", bold: true }]}
        pill={dirtyIds.size > 0 ? { tone: "amber", label: `${dirtyIds.size} unpublished tile change${dirtyIds.size > 1 ? "s" : ""}` } : undefined}
      />
      <ActionBar
        title="Capability tiles"
        sub={loading ? "Loading…" : error ? `Error: ${error}` : "Each tile is bound to a registered capability + a deep-link template. Destinations resolve at click time. No raw URLs."}
        actions={<>
          <button className="btn" onClick={() => router.push("/capabilities?new=1")}>{Icon.plus} Register capability</button>
          <button className="btn primary" disabled={dirtyIds.size === 0 || publishing} onClick={publish}>
            {publishing ? "Publishing…" : `Publish${dirtyIds.size > 0 ? ` (${dirtyIds.size}) ` : " "}to Prod`} {Icon.arrowRight}
          </button>
        </>}
      />

      <div className="drawer-stage">
        <div className="table-wrap">
          <div className="table-tools">
            <div className="filters">
              <button type="button" className={`chip ${kindFilter === "all" ? "active" : ""}`} onClick={() => setKindFilter("all")} style={{ border: 0, cursor: "pointer" }}>All <b>{tiles.length}</b></button>
              <button type="button" className={`chip ${kindFilter === "internal" ? "active" : ""}`} onClick={() => setKindFilter("internal")} style={{ border: 0, cursor: "pointer" }}>Internal route</button>
              <button type="button" className={`chip ${kindFilter === "external" ? "active" : ""}`} onClick={() => setKindFilter("external")} style={{ border: 0, cursor: "pointer" }}>External URL</button>
              <button type="button" className={`chip ${kindFilter === "soon" ? "active" : ""}`} onClick={() => setKindFilter("soon")} style={{ border: 0, cursor: "pointer" }}>Coming soon</button>
            </div>
            <div className="search-mini"><input placeholder="Filter by name or route" value={filterText} onChange={(e) => setFilterText(e.target.value)} /></div>
          </div>
          <table className="tbl">
            <thead><tr><th>Tile</th><th>Route kind</th><th>Template</th><th>Visibility</th></tr></thead>
            <tbody>
              {tiles
                .filter((t) => kindFilter === "all" || t.routeKind === kindFilter)
                .filter((t) => {
                  const q = filterText.trim().toLowerCase();
                  if (!q) return true;
                  return [t.capabilityName, t.capabilitySlug, t.routeTemplate, t.externalUrl ?? ""]
                    .join(" ")
                    .toLowerCase()
                    .includes(q);
                })
                .map((t) => {
                const isDirty = dirtyIds.has(t.id);
                return (
                  <tr key={t.id} className={selectedId === t.id ? "selected" : ""} onClick={() => selectFromList(t)} style={{ cursor: "pointer" }}>
                    <td>
                      <span className="tile-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/></svg></span>
                      <span className="name"><b>{t.capabilityName}</b><span>{t.capabilitySlug}</span></span>
                    </td>
                    <td>
                      <span className={`pill ${t.routeKind === "internal" ? "live" : t.routeKind === "external" ? "demo" : "avail"}`}>{t.routeKind}</span>
                      {isDirty && <span className="pill avail" style={{ marginLeft: 6 }}>Edited</span>}
                    </td>
                    <td><code>{t.routeTemplate}</code></td>
                    <td>{t.visibility === "public" ? <span className="vis">✓ Public</span> : <span className="vis" style={{ color: "#52646C" }}>Role-gated</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <aside className="drawer" role="dialog" aria-label={`Edit tile ${selected.capabilityName}`}>
            <div className="drawer-h">
              <div className="title">
                <b>Edit tile · {selected.capabilityName}</b>
                <span>capability ID <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, background: "#F4FAFB", padding: "1px 5px", borderRadius: 4 }}>{selected.capabilitySlug}</code></span>
              </div>
              <button className="close" onClick={() => setSelectedId(null)} aria-label="Close drawer">{Icon.close}</button>
            </div>
            <div className="drawer-b">
              <div className="drawer-section">
                <div className="sec-title">Route · how the tile opens</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button type="button" className={`radio-card ${draftKind === "internal" ? "checked" : ""}`} onClick={() => setDraftKind("internal")} style={{ border: 0, textAlign: "left", width: "100%" }}>
                    <span className="rdot" />
                    <div className="rt">
                      <b>Internal capability route</b>
                      <span>Resolves through the Capability Registry. Destination URL changes don&apos;t require admin edits.</span>
                      <code>{draftTemplate}</code>
                    </div>
                  </button>
                  <button type="button" className={`radio-card ${draftKind === "external" ? "checked" : ""}`} onClick={() => {
                    setDraftKind("external");
                    // Rescue a URL that was pasted into the route template
                    // while the tile was still internal.
                    if (!draftExternal.trim() && isValidHttpUrl(draftTemplate)) setDraftExternal(draftTemplate);
                  }} style={{ border: 0, textAlign: "left", width: "100%" }}>
                    <span className="rdot" />
                    <div className="rt">
                      <b>External URL</b>
                      <span>Direct link · validated · audited per click.</span>
                    </div>
                  </button>
                  <button type="button" className={`radio-card ${draftKind === "soon" ? "checked" : ""}`} onClick={() => setDraftKind("soon")} style={{ border: 0, textAlign: "left", width: "100%" }}>
                    <span className="rdot" />
                    <div className="rt">
                      <b>Coming-soon stub</b>
                      <span>Renders a polite stub. Captures interest signups.</span>
                    </div>
                  </button>
                </div>
              </div>

              {draftKind === "internal" && (
                <div className="field">
                  <label>Route template</label>
                  <input value={draftTemplate} onChange={(e) => setDraftTemplate(e.target.value)} placeholder="e.g. /capabilities/ria/{tenantId}" />
                  <span className="help-line">{`Use {tenantId} or similar placeholders for runtime interpolation.`}</span>
                </div>
              )}

              {draftKind === "external" && (
                <div className="field">
                  <label>External URL</label>
                  <input type="url" value={draftExternal} onChange={(e) => setDraftExternal(e.target.value)} placeholder="https://…" />
                  {externalUrlMissing ? (
                    <span className="help-line" style={{ color: "#B3261E" }}>Enter the destination URL before saving.</span>
                  ) : externalUrlInvalid ? (
                    <span className="help-line" style={{ color: "#B3261E" }}>Not a valid URL — it must start with https:// (or http://).</span>
                  ) : (
                    <span className="help-line">Must be a valid URL · validated server-side.</span>
                  )}
                </div>
              )}

              <div className="drawer-section">
                <div className="sec-title">Visibility</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className={`chip ${draftVisibility === "public" ? "active" : ""}`} onClick={() => setDraftVisibility("public")}>Public</button>
                  <button type="button" className={`chip ${draftVisibility === "role_gated" ? "active" : ""}`} onClick={() => setDraftVisibility("role_gated")}>Role-gated</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6 }}>
                <button className="btn" onClick={() => selectFromList(selected)} disabled={!drawerDirty || saving}>Discard</button>
                <button className="btn primary" disabled={!drawerDirty || saving || saveBlocked} onClick={save}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
      <ToastView toast={toast} />
    </>
  );
}
