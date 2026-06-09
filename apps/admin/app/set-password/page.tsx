"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd.length < 12) return setError("Password must be at least 12 characters.");
    if (pwd !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pwd }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error === "invalid_token" ? "This link is invalid."
              : json.error === "token_expired" ? "This link has expired. Ask an admin to issue a new one."
              : json.error === "token_consumed" ? "This link was already used."
              : (json.error || "Could not set password."));
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/"), 1200);
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  if (!token) {
    return <div style={{ padding: 40 }}><p>Missing token. Open the link from your invitation email.</p></div>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 40 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 460, background: "#fff", border: "1px solid rgba(13,53,60,.10)", borderRadius: 18, boxShadow: "var(--shadow)", padding: 32 }}>
        <h1 style={{ fontSize: 24, letterSpacing: "-.02em", fontWeight: 800, color: "var(--ust-deep)", margin: "0 0 6px" }}>Set your password</h1>
        <p style={{ fontSize: 13, color: "#52646C", margin: "0 0 18px" }}>
          Choose a strong password (12+ characters). You'll be signed in automatically when done.
        </p>

        {done ? (
          <div style={{ background: "#E8F7EB", border: "1px solid #BCE3C2", color: "#1B5E20", borderRadius: 10, padding: "12px 14px", fontSize: 14 }}>
            Password set. Redirecting…
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>New password</label>
              <input type="password" autoComplete="new-password" required minLength={12} value={pwd} onChange={(e) => setPwd(e.target.value)} disabled={busy} style={{ background: "#fff" }} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Confirm password</label>
              <input type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} style={{ background: "#fff" }} />
            </div>
            {error && (
              <div style={{ background: "#FEF4F5", border: "1px solid #F2C0C5", color: "#9A1F2B", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn primary" disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px 16px" }}>
              {busy ? "Setting password…" : "Set password & sign in"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <SetPasswordInner />
    </Suspense>
  );
}
