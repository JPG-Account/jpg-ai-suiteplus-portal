"use client";

// V0.9-Crawl-A · Domain Allow-list
// Controls which email domains can be invited / sign in. Last domain
// cannot be removed (would lock everyone out).
import { useEffect, useState, useCallback } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { csrfHeader } from "../../../../components/CsrfBootstrap";

type Domain = { pattern: string; isGlob: boolean; addedBy: string | null; createdAt: string };

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [pattern, setPattern] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/auth/domains")
      .then((r) => r.json())
      .then((j) => setDomains(j.domains ?? []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/auth/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeader() },
      body: JSON.stringify({ pattern: pattern.trim().toLowerCase() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.message ?? json.error ?? "Could not add domain"); return; }
    setPattern("");
    refresh();
  }

  async function remove(p: string) {
    if (!confirm(`Remove ${p} from the allow-list? Future sign-ins from this domain will be rejected.`)) return;
    const res = await fetch(`/api/admin/auth/domains?pattern=${encodeURIComponent(p)}`, {
      method: "DELETE",
      headers: { ...csrfHeader() },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { alert(json.message ?? "Could not remove"); return; }
    refresh();
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: "People & Access" }, { label: "Domains", bold: true }]}
        pill={{ tone: "violet", label: `${domains.length} pattern${domains.length === 1 ? "" : "s"}` }}
      />
      <ActionBar
        title="Email domain allow-list"
        sub="Only emails from these domains can be invited or sign in. Patterns must start with @."
        actions={null}
      />
      <div style={{ padding: "0 28px 24px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Pattern</th><th>Added</th><th style={{ width: 100 }}>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={3}>Loading…</td></tr>}
              {!loading && domains.length === 0 && <tr><td colSpan={3}><div className="empty-state"><h4>No domains</h4><p>Add at least one before users can sign in.</p></div></td></tr>}
              {domains.map((d) => (
                <tr key={d.pattern}>
                  <td><code style={{ fontFamily: "ui-monospace, monospace", color: "var(--ust-deep)" }}>{d.pattern}</code></td>
                  <td><span className="last">{new Date(d.createdAt).toLocaleDateString()}</span></td>
                  <td><button className="btn" style={{ padding: "5px 10px", fontSize: 12, color: "#9A1F2B" }} onClick={() => remove(d.pattern)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#fff", border: "1px solid rgba(13,53,60,.08)", borderRadius: 14, padding: 18 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "var(--ust-deep)" }}>Add domain</h3>
          <p style={{ fontSize: 12, color: "#52646C", margin: "0 0 12px" }}>
            Example: <code>@ust.com</code>. Pattern matches any email whose address ends with it.
          </p>
          <form onSubmit={add}>
            <div className="field" style={{ marginBottom: 10 }}>
              <input type="text" required minLength={2} placeholder="@example.com" value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={busy} />
            </div>
            {error && (
              <div style={{ background: "#FEF4F5", border: "1px solid #F2C0C5", color: "#9A1F2B", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 10 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn primary" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Adding…" : "Add to allow-list"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
