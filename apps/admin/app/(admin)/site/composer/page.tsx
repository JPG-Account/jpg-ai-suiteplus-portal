"use client";

// V0.9-Crawl-B · Composer V2 (Webflow-feel)
// • Real iframe live preview → /preview/home
// • Per-block content editors driven by lib/composer/block-types registry
// • Raw HTML block + markdown block
// • Style tab (bg, padding, textColor, align, customCss)
// • Multi-device toolbar (375 / 768 / 1280) + zoom
// • Reorder (up/down) · add/delete blocks
// • Live save (debounced) · Publish to push revision
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { csrfHeader } from "../../../../components/CsrfBootstrap";
import { BLOCK_TYPE_REGISTRY, BLOCK_TYPES_BY_CATEGORY, type FieldDef } from "../../../../lib/composer/block-types";

type ApiBlock = {
  id: string; pageKey: string; type: string;
  label: string; subtitle: string | null;
  position: number;
  fields: Record<string, any>;
  style: Record<string, any>;
  htmlPayload: string | null;
  isEnabled: boolean;
};

type Device = "Desktop" | "Tablet" | "Mobile";
type Tab = "Content" | "Style" | "HTML" | "Visibility";

type State = {
  loading: boolean; loadError: string | null;
  blocks: ApiBlock[];
  selectedId: string | null;
  device: Device; zoom: number; activeTab: Tab;
  dirty: Set<string>; saving: boolean; savedAt: number; lastSavedAt: number | null;
  publishing: boolean; publishedRev: number | null;
  showAddMenu: boolean; addAfterId: string | null;
};

type Action =
  | { type: "loaded"; blocks: ApiBlock[] }
  | { type: "loadFailed"; message: string }
  | { type: "select"; id: string | null }
  | { type: "device"; value: Device }
  | { type: "zoom"; value: number }
  | { type: "tab"; value: Tab }
  | { type: "patchBlock"; id: string; patch: Partial<ApiBlock> }
  | { type: "reorder"; ids: string[] }
  | { type: "insertBlock"; block: ApiBlock; after: string | null }
  | { type: "removeBlock"; id: string }
  | { type: "savingOn" } | { type: "savingOff" }
  | { type: "publishingOn" } | { type: "publishingOff" } | { type: "published"; rev: number }
  | { type: "openAdd"; afterId: string | null } | { type: "closeAdd" }
  | { type: "clearDirty"; ids?: string[] };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "loaded":
      return { ...s, loading: false, loadError: null, blocks: a.blocks, selectedId: a.blocks[0]?.id ?? null, dirty: new Set() };
    case "loadFailed": return { ...s, loading: false, loadError: a.message };
    case "select": return { ...s, selectedId: a.id };
    case "device": return { ...s, device: a.value };
    case "zoom": return { ...s, zoom: a.value };
    case "tab": return { ...s, activeTab: a.value };
    case "patchBlock": {
      const blocks = s.blocks.map((b) => b.id === a.id ? { ...b, ...a.patch, fields: a.patch.fields ?? b.fields, style: a.patch.style ?? b.style } : b);
      const dirty = new Set(s.dirty); dirty.add(a.id);
      return { ...s, blocks, dirty, savedAt: Date.now() };
    }
    case "reorder": {
      const map = new Map(s.blocks.map((b) => [b.id, b]));
      const blocks = a.ids.map((id, i) => ({ ...(map.get(id) as ApiBlock), position: i }));
      return { ...s, blocks };
    }
    case "insertBlock": {
      const blocks = [...s.blocks];
      const idx = a.after ? blocks.findIndex((b) => b.id === a.after) : blocks.length - 1;
      blocks.splice(idx + 1, 0, a.block);
      const renumbered = blocks.map((b, i) => ({ ...b, position: i }));
      return { ...s, blocks: renumbered, selectedId: a.block.id };
    }
    case "removeBlock": {
      const blocks = s.blocks.filter((b) => b.id !== a.id).map((b, i) => ({ ...b, position: i }));
      return { ...s, blocks, selectedId: blocks[0]?.id ?? null };
    }
    case "savingOn": return { ...s, saving: true };
    case "savingOff": return { ...s, saving: false, lastSavedAt: Date.now() };
    case "publishingOn": return { ...s, publishing: true };
    case "publishingOff": return { ...s, publishing: false };
    case "published": return { ...s, publishing: false, publishedRev: a.rev };
    case "openAdd": return { ...s, showAddMenu: true, addAfterId: a.afterId };
    case "closeAdd": return { ...s, showAddMenu: false };
    case "clearDirty": {
      if (!a.ids) return { ...s, dirty: new Set() };
      const next = new Set(s.dirty); a.ids.forEach((id) => next.delete(id));
      return { ...s, dirty: next };
    }
  }
}

const DEVICE_WIDTHS: Record<Device, number> = { Desktop: 1280, Tablet: 820, Mobile: 390 };
const PORTAL_BASE = process.env.NEXT_PUBLIC_PORTAL_BASE_URL ?? "http://localhost:3010";

const initial: State = {
  loading: true, loadError: null, blocks: [], selectedId: null,
  device: "Desktop", zoom: 0.75, activeTab: "Content",
  dirty: new Set(), saving: false, savedAt: Date.now(), lastSavedAt: null,
  publishing: false, publishedRev: null, showAddMenu: false, addAfterId: null,
};

export default function ComposerPageV2() {
  const [s, dispatch] = useReducer(reducer, initial);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [previewBust, setPreviewBust] = useState(0);

  // V3 panel state — both panels collapsed by default for maximum canvas.
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Drag-to-reorder state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: "above" | "below" } | null>(null);

  // ─── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/blocks?pageKey=home")
      .then(async (r) => {
        if (r.status === 401) {
          // Stale cookie / expired session — bounce to sign-in.
          window.location.href = "/sign-in?next=" + encodeURIComponent(window.location.pathname);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => { if (j) dispatch({ type: "loaded", blocks: j.blocks ?? [] }); })
      .catch((e) => dispatch({ type: "loadFailed", message: e?.message ?? "load failed" }));
  }, []);

  // ─── Auto-save dirty blocks (debounced 700ms) ─────────────────────
  useEffect(() => {
    if (s.dirty.size === 0) return;
    const handle = window.setTimeout(async () => {
      const ids = Array.from(s.dirty);
      dispatch({ type: "savingOn" });
      try {
        for (const id of ids) {
          const b = s.blocks.find((x) => x.id === id);
          if (!b) continue;
          const r = await fetch("/api/admin/blocks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...csrfHeader() },
            body: JSON.stringify({
              id, fields: b.fields, label: b.label, subtitle: b.subtitle,
              blockType: b.type, style: b.style, htmlPayload: b.htmlPayload, isEnabled: b.isEnabled,
            }),
          });
          if (!r.ok) throw new Error(`PATCH ${id} → ${r.status}`);
        }
        dispatch({ type: "clearDirty", ids });
        dispatch({ type: "savingOff" });
        setPreviewBust((n) => n + 1);
      } catch (e: any) {
        dispatch({ type: "savingOff" });
        setToast({ tone: "err", text: `Save failed: ${e?.message ?? "unknown"}` });
      }
    }, 700);
    return () => window.clearTimeout(handle);
  }, [s.dirty, s.blocks]);

  // ─── postMessage from iframe (block click) ────────────────────────
  // Portal sends { type: 'block-click', key: '<block-type>' } because portal
  // sections are keyed by type. Auto-opens the right panel on selection.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "block-click") {
        let id: string | null = null;
        if (typeof e.data.id === "string") {
          id = e.data.id;
        } else if (typeof e.data.key === "string") {
          const match = s.blocks.find((b) => b.type === e.data.key);
          if (match) id = match.id;
        }
        if (id) {
          dispatch({ type: "select", id });
          setRightOpen(true);
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [s.blocks]);

  // Esc closes the panel that's open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (rightOpen) setRightOpen(false);
        else if (leftOpen) setLeftOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leftOpen, rightOpen]);

  // ─── Toast auto-dismiss ───────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selected = s.blocks.find((b) => b.id === s.selectedId) ?? null;
  const selectedDef = selected ? BLOCK_TYPE_REGISTRY[selected.type] : null;
  const selectedBlockType = selected?.type ?? "";

  const onPublish = useCallback(async () => {
    dispatch({ type: "publishingOn" });
    try {
      // Wait for any pending saves to flush
      if (s.dirty.size > 0) await new Promise((r) => setTimeout(r, 800));
      const r = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ notes: "Composer V2 publish" }),
      });
      if (!r.ok) throw new Error(`Publish → ${r.status}`);
      const j = await r.json();
      dispatch({ type: "published", rev: j.revision });
      setToast({ tone: "ok", text: `Published revision v${j.revision} · portal updates within seconds` });
    } catch (e: any) {
      dispatch({ type: "publishingOff" });
      setToast({ tone: "err", text: `Publish failed: ${e?.message ?? "unknown"}` });
    }
  }, [s.dirty]);

  async function addBlock(blockType: string) {
    try {
      const r = await fetch("/api/admin/blocks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ pageKey: "home", blockType, insertAfter: s.addAfterId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      // Re-fetch to get clean position ordering
      const lr = await fetch("/api/admin/blocks?pageKey=home");
      const lj = await lr.json();
      dispatch({ type: "loaded", blocks: lj.blocks ?? [] });
      dispatch({ type: "closeAdd" });
      dispatch({ type: "select", id: j.block?.id ?? null });
      setPreviewBust((n) => n + 1);
      setToast({ tone: "ok", text: `Added ${BLOCK_TYPE_REGISTRY[blockType]?.displayName ?? blockType}.` });
    } catch (e: any) {
      setToast({ tone: "err", text: `Could not add block: ${e?.message ?? "unknown"}` });
    }
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block? It will disappear from the page on next publish.")) return;
    try {
      const r = await fetch(`/api/admin/blocks/${id}`, { method: "DELETE", headers: { ...csrfHeader() } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      dispatch({ type: "removeBlock", id });
      setPreviewBust((n) => n + 1);
    } catch (e: any) {
      setToast({ tone: "err", text: `Delete failed: ${e?.message ?? "unknown"}` });
    }
  }

  async function moveBlock(id: string, dir: -1 | 1) {
    const ordered = [...s.blocks].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((b) => b.id === id);
    const next = idx + dir;
    if (next < 0 || next >= ordered.length) return;
    const newOrder = [...ordered];
    [newOrder[idx], newOrder[next]] = [newOrder[next], newOrder[idx]];
    const ids = newOrder.map((b) => b.id);
    dispatch({ type: "reorder", ids });
    persistOrder(ids);
  }

  async function persistOrder(ids: string[]) {
    try {
      const r = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ pageKey: "home", order: ids }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPreviewBust((n) => n + 1);
    } catch (e: any) {
      setToast({ tone: "err", text: `Reorder failed: ${e?.message ?? "unknown"}` });
    }
  }

  // ─── Field helpers ─────────────────────────────────────────────────
  function setField(key: string, value: any) {
    if (!selected) return;
    dispatch({ type: "patchBlock", id: selected.id, patch: { fields: { ...selected.fields, [key]: value } } });
  }
  function setListField(key: string, idx: number, itemKey: string, value: any) {
    if (!selected) return;
    const list = Array.isArray(selected.fields[key]) ? [...selected.fields[key]] : [];
    list[idx] = { ...(list[idx] ?? {}), [itemKey]: value };
    setField(key, list);
  }
  function listAdd(key: string, max?: number) {
    if (!selected) return;
    const list = Array.isArray(selected.fields[key]) ? [...selected.fields[key]] : [];
    if (max && list.length >= max) return;
    list.push({});
    setField(key, list);
  }
  function listRemove(key: string, idx: number) {
    if (!selected) return;
    const list = Array.isArray(selected.fields[key]) ? [...selected.fields[key]] : [];
    list.splice(idx, 1);
    setField(key, list);
  }
  function setStyle(key: string, value: any) {
    if (!selected) return;
    dispatch({ type: "patchBlock", id: selected.id, patch: { style: { ...selected.style, [key]: value } } });
  }
  function setHtml(payload: string) {
    if (!selected) return;
    dispatch({ type: "patchBlock", id: selected.id, patch: { htmlPayload: payload } });
  }

  // ─── Render ────────────────────────────────────────────────────────
  if (s.loading) return (<><TopBar crumbs={[{ label: "Site Composer" }, { label: "Landing page", bold: true }]} env="Preview" /><ActionBar title="Landing page" sub="Loading…" /></>);
  if (s.loadError) return (<><TopBar crumbs={[{ label: "Site Composer" }, { label: "Landing page", bold: true }]} env="Preview" /><ActionBar title="Landing page" sub={`Error: ${s.loadError}`} /></>);

  const dirtyCount = s.dirty.size;
  const orderedBlocks = [...s.blocks].sort((a, b) => a.position - b.position);

  return (
    <>
      <TopBar
        crumbs={[{ label: "Site Composer" }, { label: "Landing page", bold: true }]}
        pill={{ tone: dirtyCount > 0 ? "amber" : "green", label: dirtyCount > 0 ? `${dirtyCount} unsaved` : s.publishedRev ? `Clean · v${s.publishedRev}` : "Clean" }}
        env="Preview"
      />
      <div className="warning-bar">
        <div className="warning-bar-l">
          {Icon.clock}
          <b>Live edit</b> · changes auto-save · click <b>Publish</b> to push a revision to the public portal
        </div>
        <span className="saved-pill">
          {s.saving ? "Saving…" : s.lastSavedAt ? `Saved ${Math.max(1, Math.floor((Date.now() - s.lastSavedAt) / 1000))}s ago` : "—"}
        </span>
      </div>
      <ActionBar
        title="Landing page"
        sub="Drag blocks to reorder. Click on the canvas to edit a block. Esc closes panels."
        actions={<>
          <button className="btn" onClick={() => dispatch({ type: "openAdd", afterId: null })}>+ Add block</button>
          <button className="btn primary" disabled={s.publishing} onClick={onPublish}>
            {s.publishing ? "Publishing…" : "Publish to Prod"} {Icon.arrowRight}
          </button>
        </>}
      />

      <div className="composer-v3">
        {/* ─── CANVAS · iframe preview takes the full width ──── */}
        <div className="canvas">
          <div className="canvas-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pp-readonly">Live preview</span>
              <span style={{ fontSize: 12, color: "#52646C" }}>{s.saving ? "saving…" : "auto-saves on edit"}</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="pp-device">
                {(["Desktop", "Tablet", "Mobile"] as const).map((d) => (
                  <button key={d} className={s.device === d ? "active" : ""} onClick={() => dispatch({ type: "device", value: d })}>{d}</button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#52646C" }}>
                Zoom
                <input type="range" min={0.4} max={1} step={0.05} value={s.zoom} onChange={(e) => dispatch({ type: "zoom", value: parseFloat(e.target.value) })} style={{ width: 80 }} />
                <b style={{ color: "var(--ust-deep)", minWidth: 32 }}>{Math.round(s.zoom * 100)}%</b>
              </div>
            </div>
          </div>
          <div className="canvas-stage" style={{ display: "grid", placeItems: "start center" }}>
            <div style={{ width: DEVICE_WIDTHS[s.device], maxWidth: "100%", transform: `scale(${s.zoom})`, transformOrigin: "top center", margin: "8px 0" }}>
              <iframe
                ref={iframeRef}
                src={`${PORTAL_BASE}/?preview=draft&selected=${encodeURIComponent(selectedBlockType)}&_=${previewBust}`}
                style={{ width: "100%", height: 900, border: "1px solid rgba(13,53,60,0.12)", borderRadius: 10, background: "#fff", display: "block" }}
                title="Live preview"
              />
            </div>
          </div>
        </div>

        {/* ─── EDGE TAB · open Blocks panel ────────────────────── */}
        {!leftOpen && (
          <button className="edge-tab left" onClick={() => setLeftOpen(true)} title="Open block list (B)">
            <span className="v-label">Blocks</span>
            <span className="count">{orderedBlocks.length}</span>
          </button>
        )}

        {/* ─── LEFT FLOATING PANEL · block list ────────────────── */}
        {leftOpen && (
          <div className="panel left" role="region" aria-label="Block list">
            <div className="panel-h">
              <b>Blocks <span className="count" style={{ marginLeft: 6, background: "#F0F6F8", color: "#52646C", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{orderedBlocks.length}</span></b>
              <button className="x" onClick={() => setLeftOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="panel-body">
              {orderedBlocks.map((b, i) => {
                const def = BLOCK_TYPE_REGISTRY[b.type];
                const isDragging = dragId === b.id;
                const dropPos = dropTarget?.id === b.id ? dropTarget.pos : null;
                return (
                  <div
                    key={b.id}
                    className={[
                      "drag-row",
                      s.selectedId === b.id ? "selected" : "",
                      isDragging ? "dragging" : "",
                      dropPos === "above" ? "drop-above" : "",
                      dropPos === "below" ? "drop-below" : "",
                    ].filter(Boolean).join(" ")}
                    draggable
                    onDragStart={(e) => {
                      setDragId(b.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", b.id);
                    }}
                    onDragOver={(e) => {
                      if (!dragId || dragId === b.id) return;
                      e.preventDefault();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      const pos: "above" | "below" = e.clientY < midY ? "above" : "below";
                      if (dropTarget?.id !== b.id || dropTarget?.pos !== pos) {
                        setDropTarget({ id: b.id, pos });
                      }
                    }}
                    onDragLeave={() => {
                      if (dropTarget?.id === b.id) setDropTarget(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!dragId || dragId === b.id) {
                        setDragId(null);
                        setDropTarget(null);
                        return;
                      }
                      const ids = orderedBlocks.map((x) => x.id);
                      const fromIdx = ids.indexOf(dragId);
                      let toIdx = ids.indexOf(b.id);
                      if (fromIdx < 0 || toIdx < 0) return;
                      const insertAfter = (dropTarget?.pos ?? "below") === "below";
                      ids.splice(fromIdx, 1);
                      const newToIdx = ids.indexOf(b.id);
                      const insertAt = insertAfter ? newToIdx + 1 : newToIdx;
                      ids.splice(insertAt, 0, dragId);
                      dispatch({ type: "reorder", ids });
                      persistOrder(ids);
                      setDragId(null);
                      setDropTarget(null);
                    }}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                  >
                    <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                    <button
                      type="button"
                      className="row-main"
                      onClick={() => { dispatch({ type: "select", id: b.id }); setRightOpen(true); }}
                    >
                      <span className="row-ord">{i + 1}</span>
                      <div className="row-lbl">
                        <b>{b.label}</b>
                        <span>{def?.displayName ?? b.type}{!b.isEnabled && " · hidden"}</span>
                      </div>
                      {s.dirty.has(b.id) && <span className="dirty-dot" title="Unsaved" />}
                    </button>
                  </div>
                );
              })}
              <button className="btn" onClick={() => dispatch({ type: "openAdd", afterId: orderedBlocks[orderedBlocks.length - 1]?.id ?? null })} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>+ Add block</button>
            </div>
          </div>
        )}

        {/* ─── EDGE TAB · open Inspector ───────────────────────── */}
        {!rightOpen && selected && (
          <button className="edge-tab right" onClick={() => setRightOpen(true)} title="Open inspector">
            <span className="v-label">Inspector</span>
            <span className="count">{selectedDef?.displayName ?? selected?.type}</span>
          </button>
        )}

        {/* ─── RIGHT FLOATING PANEL · inspector ────────────────── */}
        {rightOpen && selected && (
          <div className="panel right" role="region" aria-label="Block inspector">
            <div className="panel-h" style={{ alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", textTransform: "none", letterSpacing: 0, fontSize: 14 }}>{selected?.label ?? "—"}</b>
                <span style={{ fontSize: 11, color: "#7F8B92", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{selectedDef?.displayName ?? selected?.type ?? ""}</span>
              </div>
              <button onClick={() => deleteBlock(selected.id)} title="Delete block" style={{ ...tinyBtn, color: "#9A1F2B", padding: "4px 8px", height: 26, marginRight: 4 }}>Delete</button>
              <button className="x" onClick={() => setRightOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="props-tabs" role="tablist">
              {(["Content", "Style", "HTML", "Visibility"] as const).map((tab) => (
                <button key={tab} role="tab" aria-selected={s.activeTab === tab} className={s.activeTab === tab ? "active" : ""} onClick={() => dispatch({ type: "tab", value: tab })}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="props-b" style={{ flex: 1, overflow: "auto", padding: 14 }}>
              {s.activeTab === "Content" && (
                <ContentEditor
                  block={selected}
                  onLabel={(v) => dispatch({ type: "patchBlock", id: selected.id, patch: { label: v } })}
                  onField={setField}
                  onListSet={setListField}
                  onListAdd={listAdd}
                  onListRemove={listRemove}
                />
              )}
              {s.activeTab === "Style" && <StyleEditor style={selected.style} onChange={setStyle} />}
              {s.activeTab === "HTML" && <HtmlEditor block={selected} onHtml={setHtml} />}
              {s.activeTab === "Visibility" && (
                <VisibilityEditor block={selected} onToggle={(v) => dispatch({ type: "patchBlock", id: selected.id, patch: { isEnabled: v } })} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Add block modal ───────────────────────────────────── */}
      {s.showAddMenu && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(13,53,60,.45)", display: "grid", placeItems: "center", zIndex: 50 }} onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: "closeAdd" }); }}>
          <div style={{ width: 640, maxHeight: "80vh", background: "#fff", borderRadius: 16, padding: 24, boxShadow: "var(--shadow)", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "var(--ust-deep)" }}>Add a block</h3>
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={() => dispatch({ type: "closeAdd" })}>{Icon.close}</button>
            </div>
            {Object.entries(BLOCK_TYPES_BY_CATEGORY).map(([cat, defs]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".10em", color: "#7F8B92", fontWeight: 700, marginBottom: 8 }}>{cat}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {defs.map((d) => (
                    <button key={d.type} className="btn" style={{ justifyContent: "flex-start", padding: "12px 14px", textAlign: "left", height: "auto", flexDirection: "column", alignItems: "flex-start", gap: 4 }} onClick={() => addBlock(d.type)}>
                      <b style={{ fontSize: 14, color: "var(--ust-deep)" }}>{d.displayName}</b>
                      <span style={{ fontSize: 12, color: "#52646C", fontWeight: 400, lineHeight: 1.4 }}>{d.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 60, maxWidth: 480,
          background: toast.tone === "ok" ? "linear-gradient(180deg,#F0FBF7,#fff)" : "#FEF4F5",
          border: `1px solid ${toast.tone === "ok" ? "#C2EAD9" : "#F2C0C5"}`,
          borderRadius: 12, padding: "12px 16px",
          boxShadow: "var(--shadow-soft)",
          fontSize: 13.5, color: toast.tone === "ok" ? "#0B3B42" : "#9A1F2B", fontWeight: 600,
        }}>{toast.text}</div>
      )}
    </>
  );
}

const tinyBtn: React.CSSProperties = {
  background: "rgba(13,53,60,0.06)", border: 0, borderRadius: 4, padding: "2px 6px",
  fontSize: 10, color: "#52646C", cursor: "pointer", height: 18, lineHeight: 1,
};

// ─── Inner editors ────────────────────────────────────────────────────

function ContentEditor({ block, onLabel, onField, onListSet, onListAdd, onListRemove }: {
  block: ApiBlock;
  onLabel: (v: string) => void;
  onField: (key: string, value: any) => void;
  onListSet: (key: string, idx: number, itemKey: string, value: any) => void;
  onListAdd: (key: string, max?: number) => void;
  onListRemove: (key: string, idx: number) => void;
}) {
  const def = BLOCK_TYPE_REGISTRY[block.type];
  if (!def) return <div className="empty-state"><h4>Unknown block type</h4><p>This block has type <code>{block.type}</code>. Switch to a known type or edit via Raw HTML.</p></div>;

  return (
    <>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Block label (internal)</label>
        <input value={block.label} onChange={(e) => onLabel(e.target.value)} />
        <span className="help-line">Shows in the block list — not on the public site.</span>
      </div>
      {def.contentFields.length === 0 && (
        <div className="empty-state" style={{ marginTop: 12 }}>
          <h4>No structured fields</h4>
          <p>This block renders directly from the <b>HTML</b> tab. Switch tabs to edit it.</p>
        </div>
      )}
      {def.contentFields.map((fd) => (
        <FieldInput
          key={fd.key}
          fd={fd}
          value={block.fields[fd.key]}
          onChange={(v) => onField(fd.key, v)}
          onListSet={(idx, itemKey, v) => onListSet(fd.key, idx, itemKey, v)}
          onListAdd={() => onListAdd(fd.key, (fd as any).max)}
          onListRemove={(idx) => onListRemove(fd.key, idx)}
        />
      ))}
    </>
  );
}

function FieldInput({ fd, value, onChange, onListSet, onListAdd, onListRemove }: {
  fd: FieldDef; value: any; onChange: (v: any) => void;
  onListSet?: (idx: number, itemKey: string, v: any) => void;
  onListAdd?: () => void; onListRemove?: (idx: number) => void;
}) {
  if (fd.kind === "text" || fd.kind === "url") {
    return (
      <div className="field" style={{ marginBottom: 12 }}>
        <label>{fd.label}</label>
        <input type={fd.kind === "url" ? "url" : "text"} value={String(value ?? "")} maxLength={(fd as any).maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fd.kind === "url" ? "https://…" : ""} />
        {fd.help && <span className="help-line">{fd.help}</span>}
      </div>
    );
  }
  if (fd.kind === "textarea") {
    return (
      <div className="field" style={{ marginBottom: 12 }}>
        <label>{fd.label}</label>
        <textarea rows={fd.rows ?? 3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
        {fd.help && <span className="help-line">{fd.help}</span>}
      </div>
    );
  }
  if (fd.kind === "select") {
    return (
      <div className="field" style={{ marginBottom: 12 }}>
        <label>{fd.label}</label>
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {fd.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  if (fd.kind === "list") {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="field" style={{ marginBottom: 14 }}>
        <label>{fd.label} ({list.length}{(fd as any).max ? `/${(fd as any).max}` : ""})</label>
        {list.map((item, i) => (
          <div key={i} style={{ background: "#F4FAFB", border: "1px solid rgba(13,53,60,.08)", borderRadius: 10, padding: 10, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7F8B92", textTransform: "uppercase", letterSpacing: ".08em" }}>Item {i + 1}</span>
              <button type="button" onClick={() => onListRemove?.(i)} style={{ background: "transparent", border: 0, color: "#9A1F2B", fontSize: 12, cursor: "pointer", padding: "2px 6px" }}>Remove</button>
            </div>
            {fd.itemFields.map((sub) => (
              <FieldInput key={sub.key} fd={sub} value={(item as any)[sub.key]}
                onChange={(v) => onListSet?.(i, sub.key, v)} />
            ))}
          </div>
        ))}
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => onListAdd?.()}>+ Add item</button>
      </div>
    );
  }
  return null;
}

function StyleEditor({ style, onChange }: { style: any; onChange: (k: string, v: any) => void }) {
  return (
    <>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Background</label>
        <input type="text" value={style.bg ?? ""} onChange={(e) => onChange("bg", e.target.value)} placeholder="#ffffff or linear-gradient(...)" />
        <span className="help-line">Color (#hex), CSS gradient, or <code>transparent</code>.</span>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Text color</label>
        <input type="text" value={style.textColor ?? ""} onChange={(e) => onChange("textColor", e.target.value)} placeholder="#0D353C or inherit" />
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Padding</label>
        <input type="text" value={style.padding ?? ""} onChange={(e) => onChange("padding", e.target.value)} placeholder="64px 24px" />
        <span className="help-line">CSS padding shorthand. E.g. <code>64px 24px</code> = 64 top/bottom, 24 left/right.</span>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Text align</label>
        <select value={style.align ?? "left"} onChange={(e) => onChange("align", e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Custom CSS (advanced)</label>
        <textarea rows={4} value={style.customCss ?? ""} onChange={(e) => onChange("customCss", e.target.value)} placeholder="border-top: 1px solid #00BCD4;" />
        <span className="help-line">Inline CSS appended to this block's outer container.</span>
      </div>
    </>
  );
}

function HtmlEditor({ block, onHtml }: { block: ApiBlock; onHtml: (v: string) => void }) {
  const def = BLOCK_TYPE_REGISTRY[block.type];
  const supported = def?.renderMode === "html" || def?.renderMode === "mixed";
  return (
    <>
      {!supported && (
        <div style={{ background: "#FFF8EC", border: "1px solid #ECD8A6", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13, color: "#5E3700" }}>
          This block type renders from structured fields. To use raw HTML, switch the block to the <b>Raw HTML</b> type when adding a new block.
        </div>
      )}
      <div className="field" style={{ marginBottom: 12 }}>
        <label>HTML payload</label>
        <textarea
          rows={18}
          value={block.htmlPayload ?? ""}
          onChange={(e) => onHtml(e.target.value)}
          style={{ fontFamily: "ui-monospace, SF Mono, Consolas, monospace", fontSize: 12.5, lineHeight: 1.55, background: "#0D353C", color: "#E8F4F5", border: "1px solid #0A4C5A", borderRadius: 8 }}
          spellCheck={false}
        />
        <span className="help-line">Renders verbatim. Paste any HTML — inline styles, headings, lists. Scripts are not executed.</span>
      </div>
    </>
  );
}

function VisibilityEditor({ block, onToggle }: { block: ApiBlock; onToggle: (v: boolean) => void }) {
  return (
    <>
      <div className="field" style={{ marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={block.isEnabled} onChange={(e) => onToggle(e.target.checked)} />
          <span>Enabled on portal</span>
        </label>
        <span className="help-line">Disabled blocks remain in the database (and in the Composer) but do not render on the public site.</span>
      </div>
      <div style={{ background: "#F4FAFB", border: "1px solid rgba(13,53,60,.08)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--ust-deep)", lineHeight: 1.5 }}>
        <b style={{ display: "block", marginBottom: 6 }}>Coming in Phase 2 (V0.9-Walk)</b>
        Per-role visibility (e.g. show this block only to Capability Owners) lands with the role taxonomy expansion.
      </div>
    </>
  );
}
