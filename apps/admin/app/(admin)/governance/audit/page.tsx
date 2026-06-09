"use client";

// Screen 12 · Audit Log · BACKEND-WIRED
import { useEffect, useMemo, useState } from "react";
import { TopBar, ActionBar } from "../../../../components/TopBar";
import { Icon } from "../../../../components/Icons";

type AuditEvent = {
  id: string;
  ts: string;
  actor: { email: string; name: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
};

function severity(action: string): "info" | "warn" | "crit" {
  if (action.startsWith("auth.sign_in_failed") || action.includes("denied")) return "crit";
  if (action === "publish" || action === "rollback" || action.includes("rotated") || action.includes("granted")) return "warn";
  return "info";
}

function avatarFor(name: string | undefined): { initials: string; cls: string } {
  if (!name) return { initials: "??", cls: "a7" };
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  const cls = ["a1", "a3", "a5", "a4", "a2", "a6", "a7"][initials.charCodeAt(0) % 7];
  return { initials: initials.toUpperCase(), cls };
}

function timeLabel(iso: string): { time: string; date: string } {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = d.toISOString().slice(0, 10);
  return { time, date };
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "publish" | "auth" | "tile" | "block" | "redirect" | "crit">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit?limit=200")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setEvents(j.events ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? "fetch failed");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter === "all") return true;
      if (filter === "crit") return severity(e.action) === "crit";
      if (filter === "publish") return e.action === "publish" || e.action === "rollback";
      if (filter === "auth") return e.action.startsWith("auth.");
      if (filter === "tile") return e.action.startsWith("tile.");
      if (filter === "block") return e.action.startsWith("block.");
      if (filter === "redirect") return e.action.startsWith("redirect.");
      return true;
    });
  }, [events, filter]);

  return (
    <>
      <TopBar crumbs={[{ label: "Governance" }, { label: "Audit log", bold: true }]} />
      <ActionBar
        title="Audit log"
        sub={loading ? "Loading…" : error ? `Error: ${error}` : `Every state change Suite+ made. ${events.length} events fetched.`}
        actions={<><button className="btn">{Icon.download} Export NDJSON</button></>}
      />
      <div style={{ padding: "0 28px 24px" }}>
        <div className="table-wrap">
          <div className="table-tools">
            <div className="filters">
              {[
                { key: "all" as const, label: "All", count: events.length },
                { key: "publish" as const, label: "Publish/Rollback", count: events.filter((e) => e.action === "publish" || e.action === "rollback").length },
                { key: "auth" as const, label: "Authz", count: events.filter((e) => e.action.startsWith("auth.")).length },
                { key: "tile" as const, label: "Tiles", count: events.filter((e) => e.action.startsWith("tile.")).length },
                { key: "block" as const, label: "Blocks", count: events.filter((e) => e.action.startsWith("block.")).length },
                { key: "redirect" as const, label: "Redirects", count: events.filter((e) => e.action.startsWith("redirect.")).length },
                { key: "crit" as const, label: "Critical only", count: events.filter((e) => severity(e.action) === "crit").length },
              ].map((f) => (
                <button key={f.key} className={`chip ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)} type="button">
                  {f.label} <b>{f.count}</b>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#52646C" }}>
              <span><b style={{ color: "var(--ust-deep)", fontWeight: 700 }}>{filtered.length}</b> shown</span>
            </div>
          </div>

          {filtered.length === 0 && !loading && (
            <div className="empty-state">
              <h4>No events match these filters</h4>
              <p>Clear the filter chips above, or generate activity in another tab.</p>
            </div>
          )}

          {filtered.map((e) => {
            const sev = severity(e.action);
            const { time, date } = timeLabel(e.ts);
            const { initials, cls } = avatarFor(e.actor?.name ?? "System");
            const expanded = expandedId === e.id;
            return (
              <div key={e.id}>
                <div
                  className={`audit-event ${expanded ? "expanded" : ""}`}
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                >
                  <span className="ts">{time}<span>{date}</span></span>
                  <span className={`who ${cls}`}>{initials}</span>
                  <span className="desc">
                    <b>{e.actor?.name ?? "System"}</b> <span className="verb">{e.action}</span> {e.entityType}{e.entityId ? ` · ${e.entityId}` : ""}
                    {e.after != null && typeof e.after === "object" && (
                      <small>
                        {Object.entries(e.after as Record<string, unknown>)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                          .join(" · ")}
                      </small>
                    )}
                  </span>
                  <span className="tags">
                    <span className={`tag sev-${sev}`}>{sev}</span>
                    <span className="tag">{e.action}</span>
                  </span>
                </div>
                {expanded && (
                  <div className="audit-expand">
                    <div className="json">
                      {JSON.stringify({
                        event_id: e.id,
                        ts: e.ts,
                        actor: e.actor,
                        action: e.action,
                        entity_type: e.entityType,
                        entity_id: e.entityId,
                        before: e.before,
                        after: e.after,
                      }, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
