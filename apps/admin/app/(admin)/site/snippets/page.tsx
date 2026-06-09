"use client";

// Screen 04 · Snippets Library · BACKEND-WIRED · drawer edit + PATCH
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { ToastView, useToast } from "../../../../components/Toast";

type Snippet = {
  id: string;
  key: string;
  type: string;
  name: string;
  description: string | null;
  bodyMd: string;
  variant: "light" | "dark";
  updatedAt: string;
};

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Snippet>>({});
  const [saving, setSaving] = useState(false);
  const { toast, ok, err } = useToast();

  useEffect(() => {
    fetch("/api/admin/snippets")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setSnippets(j.snippets ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? "fetch failed");
        setLoading(false);
      });
  }, []);

  const selected = snippets.find((s) => s.id === selectedId) ?? null;
  const dirty = selected && (
    (draft.name !== undefined && draft.name !== selected.name) ||
    (draft.description !== undefined && draft.description !== selected.description) ||
    (draft.bodyMd !== undefined && draft.bodyMd !== selected.bodyMd) ||
    (draft.variant !== undefined && draft.variant !== selected.variant)
  );

  function openDrawer(id: string) {
    setSelectedId(id);
    setDraft({});
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/snippets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...draft }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list = await fetch("/api/admin/snippets").then((x) => x.json());
      setSnippets(list.snippets);
      setDraft({});
      ok(`Snippet "${selected.name}" saved · publish from Site Composer to push live`);
    } catch (e: any) {
      err(`Save failed: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: "Site Composer" }, { label: "Snippets", bold: true }]}
        pill={{ tone: "violet", label: `${snippets.length} snippets` }}
      />
      <ActionBar
        title="Snippets"
        sub={loading ? "Loading…" : error ? `Error: ${error}` : "Reusable content blocks. Change once — every page using the snippet picks it up after the next publish."}
        actions={<>
          <button className="btn">Import</button>
          <button className="btn primary">New snippet {Icon.plus}</button>
        </>}
      />
      <div className="drawer-stage">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {snippets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openDrawer(s.id)}
              className="snip-card"
              style={{ textAlign: "left", border: selectedId === s.id ? "2px solid var(--ust-dark)" : undefined, cursor: "pointer" }}
            >
              <div className={`snip-prev ${s.variant === "dark" ? "dark" : ""}`}>
                <span className="typ-mini">{s.type}</span>
                <span className="label-mini">{s.name}</span>
              </div>
              <div className="snip-info">
                <b>{s.name}</b>
                <div className="desc">{s.description ?? "—"}</div>
              </div>
              <div className="snip-meta">
                <span className="used">{Icon.clock} {s.key}</span>
                <span>Updated {new Date(s.updatedAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <aside className="drawer" role="dialog" aria-label={`Edit snippet ${selected.name}`}>
            <div className="drawer-h">
              <div className="title">
                <b>Edit · {selected.name}</b>
                <span>Key <code style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, background: "#F4FAFB", padding: "1px 5px", borderRadius: 4 }}>{selected.key}</code> · type {selected.type}</span>
              </div>
              <button className="close" onClick={() => setSelectedId(null)} aria-label="Close drawer">{Icon.close}</button>
            </div>
            <div className="drawer-b">
              <div className="field">
                <label>Name</label>
                <input
                  value={draft.name ?? selected.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  value={draft.description ?? selected.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Body (Markdown)</label>
                <textarea
                  style={{ minHeight: 120, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  value={draft.bodyMd ?? selected.bodyMd}
                  onChange={(e) => setDraft({ ...draft, bodyMd: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Variant</label>
                <select
                  value={draft.variant ?? selected.variant}
                  onChange={(e) => setDraft({ ...draft, variant: e.target.value as "light" | "dark" })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark (showcase canvas)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6 }}>
                <button className="btn" onClick={() => setDraft({})} disabled={!dirty || saving}>Discard</button>
                <button className="btn primary" disabled={!dirty || saving} onClick={save}>
                  {saving ? "Saving…" : "Save snippet"}
                </button>
              </div>

              <div style={{ background: "#F4FAFB", border: "1px solid rgba(13,53,60,.08)", borderRadius: 10, padding: 12, fontSize: 12, color: "#52646C" }}>
                <b style={{ color: "var(--ust-deep)" }}>Note:</b> Saving updates the snippet in the database. The public portal renders the new copy after you publish from <b>Site Composer</b>.
              </div>
            </div>
          </aside>
        )}
      </div>
      <ToastView toast={toast} />
    </>
  );
}
