"use client";

import { useEffect, useState, useCallback } from "react";

type ToastTone = "ok" | "err" | "info";
export type ToastValue = { tone: ToastTone; text: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastValue>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const ok = useCallback((text: string) => setToast({ tone: "ok", text }), []);
  const err = useCallback((text: string) => setToast({ tone: "err", text }), []);
  const info = useCallback((text: string) => setToast({ tone: "info", text }), []);

  return { toast, setToast, ok, err, info };
}

export function ToastView({ toast }: { toast: ToastValue }) {
  if (!toast) return null;
  const palette =
    toast.tone === "ok"
      ? { bg: "linear-gradient(180deg,#F0FBF7,#fff)", border: "#C2EAD9", color: "#0B3B42" }
      : toast.tone === "err"
      ? { bg: "#FEF4F5", border: "#F2C0C5", color: "#9A1F2B" }
      : { bg: "#F0FBFC", border: "#B6E0E5", color: "#0B3B42" };
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 60,
        maxWidth: 520,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "var(--shadow-soft)",
        fontSize: 13.5,
        color: palette.color,
        fontWeight: 600,
      }}
    >
      {toast.text}
    </div>
  );
}
