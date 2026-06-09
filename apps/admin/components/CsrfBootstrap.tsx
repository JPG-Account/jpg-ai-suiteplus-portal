"use client";

import { useEffect } from "react";

// Ensures a CSRF cookie exists by pinging a GET endpoint.
// The server's getOrCreateCsrfToken() sets the cookie. Once set, client JS
// reads it and echoes via x-csrf-token header on mutations.
export default function CsrfBootstrap() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const hasCsrf = document.cookie.split("; ").some((c) => c.startsWith("suite_plus_csrf="));
    if (hasCsrf) return;
    fetch("/api/csrf", { credentials: "include" }).catch(() => {});
  }, []);
  return null;
}

// Helper for client mutations.
export function csrfHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const m = document.cookie.match(/(?:^|; )suite_plus_csrf=([^;]+)/);
  return m ? { "x-csrf-token": decodeURIComponent(m[1]) } : {};
}
