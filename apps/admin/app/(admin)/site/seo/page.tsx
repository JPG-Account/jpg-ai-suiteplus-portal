"use client";

// Screen 06 · Redirects + SEO Hub · BACKEND-WIRED
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { ToastView, useToast } from "../../../../components/Toast";

type ApiRedirect = { id: string; fromPath: string; toPath: string; statusCode: 301 | 302; isEnabled: boolean };
type ApiSeo = { id: string; scope: string; titleTemplate: string; description: string; canonicalHost: string; ogPayload: Record<string, unknown>; updatedAt: string };

export default function SeoPage() {
  const [redirects, setRedirects] = useState<ApiRedirect[]>([]);
  const [seo, setSeo] = useState<ApiSeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [seoDraft, setSeoDraft] = useState<Partial<ApiSeo>>({});
  const [savingSeo, setSavingSeo] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newCode, setNewCode] = useState<301 | 302>(301);
  const { toast, ok, err } = useToast();

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function reload() {
    try {
      const [rd, so] = await Promise.all([
        fetch("/api/admin/redirects").then((r) => r.json()),
        fetch("/api/admin/seo").then((r) => r.json()),
      ]);
      setRedirects(rd.redirects ?? []);
      setSeo(so.seo?.find((s: ApiSeo) => s.scope === "global") ?? null);
    } catch (e: any) {
      err(`Load failed: ${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  async function addRedirect() {
    if (!newFrom.startsWith("/") || !newTo) {
      err(`From-path must start with "/" and target must be set.`);
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath: newFrom, toPath: newTo, statusCode: newCode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message ?? j?.error ?? `HTTP ${r.status}`);
      setNewFrom(""); setNewTo(""); setNewCode(301);
      await reload();
      ok(`Redirect added · ${j.redirect.from_path} → ${j.redirect.to_path}`);
    } catch (e: any) {
      err(`Add failed: ${e?.message ?? "unknown"}`);
    } finally {
      setCreating(false);
    }
  }

  async function toggleRedirect(rd: ApiRedirect) {
    try {
      const r = await fetch("/api/admin/redirects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rd.id, isEnabled: !rd.isEnabled }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await reload();
      ok(rd.isEnabled ? `Disabled ${rd.fromPath}` : `Enabled ${rd.fromPath}`);
    } catch (e: any) { err(`Toggle failed: ${e?.message ?? "unknown"}`); }
  }

  async function deleteRedirect(rd: ApiRedirect) {
    if (!confirm(`Delete redirect ${rd.fromPath} → ${rd.toPath}?`)) return;
    try {
      const r = await fetch(`/api/admin/redirects?id=${encodeURIComponent(rd.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await reload();
      ok(`Deleted ${rd.fromPath}`);
    } catch (e: any) { err(`Delete failed: ${e?.message ?? "unknown"}`); }
  }

  async function saveSeo() {
    if (!seo) return;
    setSavingSeo(true);
    try {
      const r = await fetch("/api/admin/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global", ...seoDraft }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.details?.fieldErrors ? JSON.stringify(j.details.fieldErrors) : `HTTP ${r.status}`);
      }
      setSeoDraft({});
      await reload();
      ok("SEO defaults saved · publish from Site Composer to push live");
    } catch (e: any) { err(`Save failed: ${e?.message ?? "unknown"}`); }
    finally { setSavingSeo(false); }
  }

  const seoDirty =
    seo && (
      (seoDraft.titleTemplate !== undefined && seoDraft.titleTemplate !== seo.titleTemplate) ||
      (seoDraft.description !== undefined && seoDraft.description !== seo.description) ||
      (seoDraft.canonicalHost !== undefined && seoDraft.canonicalHost !== seo.canonicalHost)
    );

  return (
    <>
      <TopBar crumbs={[{ label: "Site Composer" }, { label: "Redirects & SEO", bold: true }]} />
      <ActionBar
        title="Redirects & SEO"
        sub={loading ? "Loading…" : `${redirects.length} redirects · SEO defaults live for global scope.`}
        actions={<>
          <button className="btn">{Icon.download} Import CSV</button>
        </>}
      />
      <div className="content" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="card-h"><h3>Redirects · {redirects.length} total</h3><span className="meta">{redirects.filter((r) => r.isEnabled).length} active</span></div>

          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 110px auto", gap: 8, alignItems: "end", borderBottom: "1px solid rgba(13,53,60,.06)" }}>
            <div className="field"><label>From</label><input value={newFrom} onChange={(e) => setNewFrom(e.target.value)} placeholder="/old-path" /></div>
            <div className="field"><label>To</label><input value={newTo} onChange={(e) => setNewTo(e.target.value)} placeholder="/new-path" /></div>
            <div className="field"><label>Code</label>
              <select value={newCode} onChange={(e) => setNewCode(Number(e.target.value) as 301 | 302)}>
                <option value={301}>301</option>
                <option value={302}>302</option>
              </select>
            </div>
            <button className="btn primary sm" disabled={creating || !newFrom || !newTo} onClick={addRedirect}>
              {creating ? "Adding…" : "Add"}
            </button>
          </div>

          <table className="tbl">
            <thead><tr><th>Source</th><th>Target</th><th>Type</th><th>State</th><th></th></tr></thead>
            <tbody>
              {redirects.length === 0 && !loading && (
                <tr><td colSpan={5}><div className="empty-state"><h4>No redirects yet</h4><p>Add one above to get started.</p></div></td></tr>
              )}
              {redirects.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.fromPath}</code></td>
                  <td><code>{r.toPath}</code></td>
                  <td><span className={`pill ${r.statusCode === 301 ? "live" : "demo"}`}>{r.statusCode}</span></td>
                  <td>{r.isEnabled ? <span className="pill live">Active</span> : <span className="pill avail">Disabled</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn ghost sm" onClick={() => toggleRedirect(r)}>{r.isEnabled ? "Disable" : "Enable"}</button>
                    <button className="btn ghost sm" onClick={() => deleteRedirect(r)} style={{ color: "#9A1F2B" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-h"><h3>Site SEO defaults</h3><span className="meta">scope = global</span></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {seo ? (
                <>
                  <div className="field"><label>Title template</label>
                    <input value={seoDraft.titleTemplate ?? seo.titleTemplate} onChange={(e) => setSeoDraft({ ...seoDraft, titleTemplate: e.target.value })} />
                    <span className="help-line">{`Use {page} as the page-name placeholder.`}</span>
                  </div>
                  <div className="field"><label>Description</label>
                    <textarea value={seoDraft.description ?? seo.description} onChange={(e) => setSeoDraft({ ...seoDraft, description: e.target.value })} />
                  </div>
                  <div className="field"><label>Canonical host</label>
                    <input type="url" value={seoDraft.canonicalHost ?? seo.canonicalHost} onChange={(e) => setSeoDraft({ ...seoDraft, canonicalHost: e.target.value })} />
                    <span className="help-line">Must be a valid URL (https://…)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn" disabled={!seoDirty || savingSeo} onClick={() => setSeoDraft({})}>Discard</button>
                    <button className="btn primary" disabled={!seoDirty || savingSeo} onClick={saveSeo}>{savingSeo ? "Saving…" : "Save SEO defaults"}</button>
                  </div>
                </>
              ) : <div className="empty-state"><h4>No SEO defaults configured</h4><p>Run db:seed to initialize.</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>OpenGraph preview</h3><span className="meta">current defaults</span></div>
            <div className="card-b">
              <div style={{ background: "#F4FAFB", border: "1px solid rgba(13,53,60,.10)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: 96, background: "linear-gradient(135deg,#0B3B42 0%,#07191E 100%)", display: "grid", placeItems: "center", color: "#8DE0E7", fontWeight: 800, letterSpacing: "-.02em", fontSize: 18 }}>
                  UST AI Suite+ for SAP
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#7F8B92", textTransform: "uppercase", letterSpacing: ".10em", fontWeight: 700 }}>{seo?.canonicalHost.replace(/https?:\/\//, "")}</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ust-deep)", marginTop: 4 }}>{seo?.titleTemplate.replace("{page}", "Home")}</div>
                  <div style={{ fontSize: 12, color: "#52646C", marginTop: 2, lineHeight: 1.4 }}>{seo?.description}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastView toast={toast} />
    </>
  );
}
