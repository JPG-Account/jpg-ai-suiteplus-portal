"use client";

// Rollback confirmation with a REQUIRED notes textarea.
// Web Builder's V0.7.1 ask: "make notes required (min 5 chars) and surface a
// mandatory textarea before V0.8 lands more destructive actions."
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

type Props = {
  open: boolean;
  targetRevision: number | null;
  currentRevision: number | null;
  busy: boolean;
  onConfirm: (notes: string) => Promise<void> | void;
  onCancel: () => void;
};

export function RollbackModal({ open, targetRevision, currentRevision, busy, onConfirm, onCancel }: Props) {
  const [notes, setNotes] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setNotes("");
    // focus textarea
    const id = window.setTimeout(() => textareaRef.current?.focus(), 30);
    // Esc to cancel
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open || targetRevision == null) return null;
  const trimmed = notes.trim();
  const valid = trimmed.length >= 5 && trimmed.length <= 500;

  return (
    <div
      className="modal-host"
      role="dialog"
      aria-modal="true"
      aria-label={`Roll back to revision ${targetRevision}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-h">
          <div>
            <b>Roll back to v{targetRevision}</b>
            <span className="sub">
              from current v{currentRevision ?? "—"} · portal updates within seconds
            </span>
          </div>
          <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={onCancel} disabled={busy} aria-label="Close">
            {Icon.close}
          </button>
        </div>
        <div className="modal-b">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FFF8EC", border: "1px solid #ECD8A6", borderRadius: 10, fontSize: 13, color: "#5E3700" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
            </svg>
            <span><b style={{ fontWeight: 800 }}>Destructive action.</b> Required notes for the audit trail — explain why so the next reviewer doesn&apos;t have to ask.</span>
          </div>

          <div className="field">
            <label>
              Notes <span style={{ color: "#9A1F2B" }}>*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. SAPPHIRE hero rolled out early — reverting to v14 baseline until copy is finalised."
              style={{ minHeight: 96 }}
              maxLength={500}
              disabled={busy}
            />
            <span className="help-line" style={{ color: valid ? "#1B6A55" : trimmed.length === 0 ? "#7F8B92" : "#9A1F2B" }}>
              {trimmed.length === 0
                ? "5–500 characters · captured in the audit log"
                : valid
                ? `${trimmed.length} chars · OK`
                : trimmed.length < 5
                ? `${trimmed.length} chars · ${5 - trimmed.length} more required`
                : `${trimmed.length} chars · over 500 limit`}
            </span>
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ fontSize: "12.5px", color: "#52646C" }}>
            Audit lineage: <b style={{ color: "var(--ust-deep)" }}>v{currentRevision ?? "—"} → v{targetRevision}</b>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={!valid || busy}
              onClick={() => onConfirm(trimmed)}
            >
              {busy ? "Rolling back…" : `Confirm rollback to v${targetRevision}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
