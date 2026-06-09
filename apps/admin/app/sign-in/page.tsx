"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [stage, setStage] = useState<"creds" | "totp">("creds");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const body: any = { email, password };
      if (stage === "totp") body.totpCode = totp;
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.error === "totp_required") {
          setStage("totp");
          setInfo("Enter the 6-digit code from your authenticator app.");
          setBusy(false);
          return;
        }
        if (json.error === "totp_invalid") setError("Invalid 6-digit code. Try again.");
        else if (json.error === "wrong_password") setError("Email or password is incorrect.");
        else if (json.error === "no_password") setError("No password set for this account. Ask Super Admin for a set-password link.");
        else if (json.error === "locked") setError("Account temporarily locked. Try again later.");
        else if (json.error === "not_allowed") setError("Email domain is not on the allow-list.");
        else if (json.error === "invalid_email") setError("Enter a valid email address.");
        else setError("Sign-in failed. Try again.");
        setBusy(false);
        return;
      }
      const next = params.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 40 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid rgba(13,53,60,.10)", borderRadius: 18, boxShadow: "var(--shadow)", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div className="rail-mark" style={{ width: 36, height: 36, fontSize: 18 }}>
            <span>U</span><span className="rail-mark-dot" /><span>S</span><span>T</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ust-deep)", letterSpacing: "-.01em" }}>Suite+ Admin</div>
            <div style={{ fontSize: 12, color: "#5E6973" }}>UST AI Suite+ for SAP</div>
          </div>
        </div>
        <h1 style={{ fontSize: 26, letterSpacing: "-.03em", fontWeight: 800, color: "var(--ust-deep)", margin: "10px 0 6px" }}>Sign in</h1>
        <p style={{ fontSize: 13, color: "#52646C", margin: "0 0 20px" }}>
          {stage === "creds" ? "Enter your UST email and password." : "Two-factor verification required."}
        </p>

        {stage === "creds" && (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@ust.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                style={{ background: "#fff" }}
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                style={{ background: "#fff" }}
              />
            </div>
          </>
        )}

        {stage === "totp" && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Authenticator code</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              placeholder="123456"
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
              disabled={busy}
              autoFocus
              style={{ background: "#fff", letterSpacing: "0.3em", fontSize: 18 }}
            />
          </div>
        )}

        {info && (
          <div style={{ background: "#EEF8FA", border: "1px solid #C9E5EA", color: "#0A4C5A", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
            {info}
          </div>
        )}
        {error && (
          <div style={{ background: "#FEF4F5", border: "1px solid #F2C0C5", color: "#9A1F2B", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn primary" disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 16px" }}>
          {busy ? "Signing in…" : stage === "totp" ? "Verify" : "Sign in"}
        </button>
        <p style={{ fontSize: 11, color: "#7F8B92", margin: "16px 0 0", textAlign: "center" }}>
          UST AI Suite+ for SAP · Suite+ Admin
        </p>
      </form>
    </div>
  );
}
