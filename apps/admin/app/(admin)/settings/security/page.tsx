"use client";

// V0.9-Crawl-A · Account security
// • Change password
// • Enroll/remove TOTP
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { csrfHeader } from "../../../../components/CsrfBootstrap";

export default function SecurityPage() {
  // ── Change password
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submitPwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) { setPwdMsg({ kind: "err", text: "New passwords do not match." }); return; }
    setPwdBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeader() },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    const json = await res.json().catch(() => ({}));
    setPwdBusy(false);
    if (!res.ok) { setPwdMsg({ kind: "err", text: json.error === "wrong_current" ? "Current password is incorrect." : (json.reason ?? "Could not change password.") }); return; }
    setPwdMsg({ kind: "ok", text: "Password changed." });
    setCurPwd(""); setNewPwd(""); setConfirmPwd("");
  }

  // ── TOTP
  const [totpStatus, setTotpStatus] = useState<{ enabled: boolean; provisioned: boolean } | null>(null);
  const [totpSecret, setTotpSecret] = useState<{ secret: string; uri: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpMsg, setTotpMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadTotp() {
    const res = await fetch("/api/auth/totp");
    if (res.ok) setTotpStatus(await res.json());
  }
  useEffect(() => { loadTotp(); }, []);

  async function startEnroll() {
    setTotpBusy(true);
    setTotpMsg(null);
    const res = await fetch("/api/auth/totp", { method: "POST", headers: { ...csrfHeader() } });
    const json = await res.json().catch(() => ({}));
    setTotpBusy(false);
    if (!res.ok) { setTotpMsg({ kind: "err", text: json.message ?? json.error ?? "Could not start enrollment." }); return; }
    setTotpSecret({ secret: json.secret, uri: json.uri });
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    setTotpBusy(true);
    setTotpMsg(null);
    const res = await fetch("/api/auth/totp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeader() },
      body: JSON.stringify({ code: totpCode }),
    });
    const json = await res.json().catch(() => ({}));
    setTotpBusy(false);
    if (!res.ok) { setTotpMsg({ kind: "err", text: json.error === "totp_invalid" ? "Code is invalid. Try the next one." : "Verification failed." }); return; }
    setTotpMsg({ kind: "ok", text: "Two-factor authentication is now enabled." });
    setTotpSecret(null);
    setTotpCode("");
    loadTotp();
  }

  async function removeTotp() {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    setTotpBusy(true);
    const res = await fetch("/api/auth/totp", { method: "DELETE", headers: { ...csrfHeader() } });
    setTotpBusy(false);
    if (res.ok) { setTotpMsg({ kind: "ok", text: "Two-factor removed." }); loadTotp(); }
  }

  return (
    <>
      <TopBar crumbs={[{ label: "Settings" }, { label: "Security", bold: true }]} pill={{ tone: "violet", label: "Account security" }} />
      <ActionBar title="Security" sub="Manage your password and second factor." actions={null} />

      <div style={{ padding: "0 28px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* ── Password ────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid rgba(13,53,60,.08)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--ust-deep)" }}>Change password</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#52646C" }}>Minimum 12 characters. Avoid common passwords.</p>
          <form onSubmit={submitPwd}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Current password</label>
              <input type="password" autoComplete="current-password" required value={curPwd} onChange={(e) => setCurPwd(e.target.value)} disabled={pwdBusy} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>New password</label>
              <input type="password" autoComplete="new-password" required minLength={12} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} disabled={pwdBusy} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Confirm new password</label>
              <input type="password" autoComplete="new-password" required minLength={12} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} disabled={pwdBusy} />
            </div>
            {pwdMsg && (
              <div style={{ background: pwdMsg.kind === "ok" ? "#E8F7EB" : "#FEF4F5", border: `1px solid ${pwdMsg.kind === "ok" ? "#BCE3C2" : "#F2C0C5"}`, color: pwdMsg.kind === "ok" ? "#1B5E20" : "#9A1F2B", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 10 }}>
                {pwdMsg.text}
              </div>
            )}
            <button type="submit" className="btn primary" disabled={pwdBusy}>{pwdBusy ? "Saving…" : "Change password"}</button>
          </form>
        </div>

        {/* ── TOTP ────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid rgba(13,53,60,.08)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--ust-deep)" }}>Two-factor (TOTP)</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#52646C" }}>
            Required for Super Admin in production. Use any RFC 6238 app (1Password, Authy, Google Authenticator).
          </p>

          {!totpStatus && <p style={{ color: "#7F8B92" }}>Loading…</p>}

          {totpStatus && totpStatus.enabled && (
            <>
              <div style={{ background: "#E8F7EB", border: "1px solid #BCE3C2", color: "#1B5E20", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
                Two-factor is <b>enabled</b> on this account.
              </div>
              <button className="btn" onClick={removeTotp} disabled={totpBusy} style={{ color: "#9A1F2B" }}>
                {totpBusy ? "Removing…" : "Disable two-factor"}
              </button>
            </>
          )}

          {totpStatus && !totpStatus.enabled && !totpSecret && (
            <button className="btn primary" onClick={startEnroll} disabled={totpBusy}>
              {totpBusy ? "Starting…" : "Enroll authenticator app"}
            </button>
          )}

          {totpSecret && (
            <form onSubmit={verifyEnroll}>
              <p style={{ fontSize: 13, color: "#52646C", margin: "0 0 8px" }}>
                Scan or paste this secret into your authenticator app, then enter a 6-digit code below.
              </p>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Setup URI</label>
                <input readOnly value={totpSecret.uri} onFocus={(e) => e.currentTarget.select()} style={{ background: "#F4F8F9", fontSize: 12 }} />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Or manual entry secret</label>
                <input readOnly value={totpSecret.secret} onFocus={(e) => e.currentTarget.select()} style={{ background: "#F4F8F9", fontFamily: "ui-monospace, monospace" }} />
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>6-digit code from app</label>
                <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))} disabled={totpBusy} style={{ letterSpacing: "0.3em", fontSize: 18 }} />
              </div>
              {totpMsg && (
                <div style={{ background: totpMsg.kind === "ok" ? "#E8F7EB" : "#FEF4F5", border: `1px solid ${totpMsg.kind === "ok" ? "#BCE3C2" : "#F2C0C5"}`, color: totpMsg.kind === "ok" ? "#1B5E20" : "#9A1F2B", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 10 }}>
                  {totpMsg.text}
                </div>
              )}
              <button type="submit" className="btn primary" disabled={totpBusy}>{totpBusy ? "Verifying…" : "Verify & enable"}</button>
            </form>
          )}

          {totpStatus && !totpStatus.enabled && totpMsg?.kind === "ok" && !totpSecret && (
            <div style={{ background: "#E8F7EB", border: "1px solid #BCE3C2", color: "#1B5E20", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginTop: 10 }}>
              {totpMsg.text}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
