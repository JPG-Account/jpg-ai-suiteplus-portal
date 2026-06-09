"use client";

// Screen 09 · Users & Roles · V0.9-Crawl-A wired
// Invite by email → server creates user (status='invited') + reset-token.
// Returns a one-shot set-password URL that admin copies/shares.
// V0.9-Walk will plug SCIM ingestion + IAS-group → role mapping in front.
import { useEffect, useState, useCallback } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";
import { csrfHeader } from "../../../../components/CsrfBootstrap";

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor" | "viewer";
  status?: "invited" | "active" | "disabled";
  grantedAt: string | null;
  lastActive: string | null;
  createdAt: string;
};

function roleClass(role: string) {
  if (role === "super_admin") return "r-super";
  if (role === "editor") return "r-content";
  return "r-viewer";
}
function roleLabel(role: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "editor") return "Editor";
  return "Viewer";
}
function statusLabel(s?: string) {
  if (s === "invited") return "Invited";
  if (s === "disabled") return "Disabled";
  return "Active";
}
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"super_admin" | "editor" | "viewer">("viewer");
  const [inviteConfirmSuper, setInviteConfirmSuper] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string; expiresAt: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; url: string; expiresAt: string } | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setUsers(j.users ?? []);
      })
      .catch((e) => setError(e?.message ?? "fetch failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteRole === "super_admin" && !inviteConfirmSuper) {
      setInviteError("Tick the Super Admin confirmation box — this role can manage all users and publish revisions.");
      return;
    }
    setInviteBusy(true);
    setInviteError(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeader() },
        body: JSON.stringify({ email: inviteEmail, displayName: inviteName, role: inviteRole, confirmSuperAdmin: inviteRole === "super_admin" ? true : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(json.message ?? json.error ?? "Invite failed");
        setInviteBusy(false);
        return;
      }
      setInviteResult({ url: json.setPasswordUrl, email: json.email, expiresAt: json.expiresAt });
      refresh();
    } catch {
      setInviteError("Network error.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function resetUser(id: string, email: string) {
    if (!confirm(`Issue a new set-password link for ${email}? Existing link will still work until it expires.`)) return;
    const res = await fetch(`/api/admin/users/${id}/reset`, { method: "POST", headers: { ...csrfHeader() } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { alert(json.message ?? "Reset failed"); return; }
    setResetResult({ email, url: json.setPasswordUrl, expiresAt: json.expiresAt });
  }

  async function disableUser(id: string, email: string) {
    if (!confirm(`Disable ${email}? They will be signed out immediately and blocked from signing in.`)) return;
    const res = await fetch(`/api/admin/users/${id}/disable`, { method: "POST", headers: { ...csrfHeader() } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { alert(json.message ?? "Disable failed"); return; }
    refresh();
  }

  async function enableUser(id: string, email: string) {
    if (!confirm(`Re-enable ${email}? They will be able to sign in again with their existing password.`)) return;
    const res = await fetch(`/api/admin/users/${id}/enable`, { method: "POST", headers: { ...csrfHeader() } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { alert(json.message ?? "Enable failed"); return; }
    refresh();
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      prompt("Copy this link:", text);
    }
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: "People & Access" }, { label: "Users", bold: true }]}
        pill={{ tone: "green", label: `${users.length} user${users.length === 1 ? "" : "s"}` }}
      />
      <ActionBar
        title="Users"
        sub={loading
          ? "Loading…"
          : error
          ? `Error: ${error}`
          : "Generate a one-shot set-password link (valid 72h) for each new user. Share the link through a trusted channel — the server does not email it."}
        actions={<>
          <button className="btn" onClick={refresh}>Refresh</button>
          <button className="btn primary" onClick={() => { setShowInvite(true); setInviteResult(null); setInviteError(null); setInviteConfirmSuper(false); }}>
            New user {Icon.arrowRight}
          </button>
        </>}
      />
      <div style={{ padding: "0 28px 24px" }}>
        <div className="table-wrap">
          <div className="table-tools">
            <div className="filters">
              <span className="chip active">All <b>{users.length}</b></span>
              <span className="chip">Super Admin <b>{users.filter((u) => u.role === "super_admin").length}</b></span>
              <span className="chip">Editor <b>{users.filter((u) => u.role === "editor").length}</b></span>
              <span className="chip">Viewer <b>{users.filter((u) => u.role === "viewer").length}</b></span>
              <span className="chip">Invited <b>{users.filter((u) => u.status === "invited").length}</b></span>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
                <th>Created</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading && (
                <tr><td colSpan={6}><div className="empty-state"><h4>No users</h4><p>Click <b>Invite user</b> to add the first one.</p></div></td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="avatar-sm a1">{(u.displayName?.[0] ?? "?").toUpperCase()}</span>
                    <span className="name"><b>{u.displayName}</b><span>{u.email}</span></span>
                  </td>
                  <td><span className={`role-chip ${roleClass(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>
                    <span className={`role-chip ${u.status === "invited" ? "r-content" : u.status === "disabled" ? "r-super" : "r-viewer"}`} style={u.status === "disabled" ? { background: "#FEE", color: "#9A1F2B" } : u.status === "invited" ? { background: "#FFF1DD", color: "#8E520E" } : undefined}>
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td><span className="last">{timeAgo(u.lastActive)}</span></td>
                  <td><span className="last">{timeAgo(u.createdAt)}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => resetUser(u.id, u.email)}>Reset password</button>
                      {u.status === "disabled" ? (
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 12, color: "#1B5E20" }} onClick={() => enableUser(u.id, u.email)}>Enable</button>
                      ) : (
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 12, color: "#9A1F2B" }} onClick={() => disableUser(u.id, u.email)}>Disable</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(13,53,60,.45)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: 480, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "var(--shadow)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--ust-deep)" }}>New user</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#52646C" }}>
              Email domain must be on the allow-list. A one-shot set-password link is generated for you to share through a trusted channel.
            </p>
            {inviteResult ? (
              <>
                <div style={{ background: "#E8F7EB", border: "1px solid #BCE3C2", color: "#1B5E20", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
                  Invite link generated for <b>{inviteResult.email}</b>. Share through your trusted channel — the server does not send email.
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <input readOnly value={inviteResult.url} onFocus={(e) => e.currentTarget.select()} style={{ background: "#F4F8F9" }} />
                </div>
                <p style={{ fontSize: 12, color: "#7F8B92", margin: "0 0 16px" }}>Expires {new Date(inviteResult.expiresAt).toLocaleString()}</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button className="btn primary" onClick={() => copyToClipboard(inviteResult.url)}>{copied ? "Copied ✓" : "Copy link"}</button>
                  <button className="btn" onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteName(""); setInviteRole("viewer"); setInviteConfirmSuper(false); }}>Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={submitInvite}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Email</label>
                  <input type="email" required placeholder="name@ust.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={inviteBusy} />
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Display name</label>
                  <input type="text" required minLength={1} maxLength={120} value={inviteName} onChange={(e) => setInviteName(e.target.value)} disabled={inviteBusy} />
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Role</label>
                  <select value={inviteRole} onChange={(e) => { setInviteRole(e.target.value as any); setInviteConfirmSuper(false); }} disabled={inviteBusy}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                {inviteRole === "super_admin" && (
                  <label style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FEF7E6", border: "1px solid #F5D58A", borderRadius: 8, padding: "10px 12px", fontSize: 12, marginBottom: 10 }}>
                    <input type="checkbox" checked={inviteConfirmSuper} onChange={(e) => setInviteConfirmSuper(e.target.checked)} disabled={inviteBusy} />
                    <span><b>I confirm.</b> Super Admins can manage every user, change auth settings, and publish/rollback revisions. Use sparingly.</span>
                  </label>
                )}
                {inviteError && (
                  <div style={{ background: "#FEF4F5", border: "1px solid #F2C0C5", color: "#9A1F2B", borderRadius: 10, padding: "8px 10px", fontSize: 13, marginBottom: 10 }}>
                    {inviteError}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn" onClick={() => setShowInvite(false)} disabled={inviteBusy}>Cancel</button>
                  <button type="submit" className="btn primary" disabled={inviteBusy}>{inviteBusy ? "Generating…" : "Generate invite link"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {resetResult && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(13,53,60,.45)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: 480, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "var(--shadow)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--ust-deep)" }}>Reset link generated</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#52646C" }}>
              For <b>{resetResult.email}</b>. Any prior link they had still works until it expires.
            </p>
            <div className="field" style={{ marginBottom: 10 }}>
              <input readOnly value={resetResult.url} onFocus={(e) => e.currentTarget.select()} style={{ background: "#F4F8F9" }} />
            </div>
            <p style={{ fontSize: 12, color: "#7F8B92", margin: "0 0 14px" }}>Expires {new Date(resetResult.expiresAt).toLocaleString()}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn primary" onClick={() => copyToClipboard(resetResult.url)}>{copied ? "Copied ✓" : "Copy link"}</button>
              <button className="btn" onClick={() => setResetResult(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
