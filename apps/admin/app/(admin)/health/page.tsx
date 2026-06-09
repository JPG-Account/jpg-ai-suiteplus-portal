"use client";

// Screen 07 · Site Health · V0.8 heuristic stub
// V0.9 replaces this with real HTTP probes against each tile's Destination.
// For now: derive health from configuration (route kind, presence of URL, etc.)
import { useEffect, useState } from "react";
import { TopBar, ActionBar } from "../../../components/TopBar";
import { Icon } from "../../../components/Icons";

type ApiTile = {
  id: string;
  capabilityId: string;
  capabilitySlug: string;
  capabilityName: string;
  routeKind: "internal" | "external" | "soon";
  routeTemplate: string;
  externalUrl: string | null;
  visibility: "public" | "role_gated";
};

function heuristicHealth(t: ApiTile): { state: "healthy" | "warn" | "danger"; detail: string } {
  if (t.routeKind === "soon") return { state: "warn", detail: "Coming-soon stub · no destination" };
  if (t.routeKind === "external") {
    if (!t.externalUrl) return { state: "danger", detail: "External route with no URL" };
    return { state: "healthy", detail: "External URL configured" };
  }
  if (!t.routeTemplate || t.routeTemplate.length === 0) {
    return { state: "danger", detail: "Internal route with no template" };
  }
  return { state: "healthy", detail: "Internal route resolved via registry" };
}

export default function HealthPage() {
  const [tiles, setTiles] = useState<ApiTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tiles")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setTiles(j.tiles ?? []);
      })
      .catch((e) => setError(e?.message ?? "fetch failed"))
      .finally(() => setLoading(false));
  }, []);

  const healthy = tiles.filter((t) => heuristicHealth(t).state === "healthy").length;
  const warn = tiles.filter((t) => heuristicHealth(t).state === "warn").length;
  const danger = tiles.filter((t) => heuristicHealth(t).state === "danger").length;

  return (
    <>
      <TopBar
        crumbs={[{ label: "Operate" }, { label: "Site Health", bold: true }]}
        pill={danger > 0 ? { tone: "red", label: `${danger} broken` } : warn > 0 ? { tone: "amber", label: `${warn} warn` } : { tone: "green", label: `${tiles.length} healthy` }}
      />
      <ActionBar
        title="Site Health"
        sub={loading
          ? "Loading…"
          : error
          ? `Error: ${error}`
          : "V0.8 · heuristic from tile configuration. V0.9 replaces with real HTTP probes against each tile's BTP Destination + last-known-good rollback per tile."}
        actions={<>
          <button className="btn">{Icon.rotate} Re-probe (stub)</button>
          <a className="btn primary" href="/preview-as">Preview portal as · Viewer {Icon.eye}</a>
        </>}
      />
      <div className="content">
        <div className="kpi-row">
          <div className="kpi"><span className="lbl">Tiles total</span><b>{tiles.length}</b><div className="trend up">Live from DB</div></div>
          <div className="kpi"><span className="lbl">Healthy</span><b>{healthy}</b><div className="trend up">Heuristic OK</div></div>
          <div className="kpi"><span className="lbl">Warnings</span><b style={warn > 0 ? { color: "#8E520E" } : undefined}>{warn}</b><div className={`trend ${warn > 0 ? "flat" : "up"}`} style={warn > 0 ? { color: "#8E520E" } : undefined}>{warn === 0 ? "None" : `${warn} stub${warn > 1 ? "s" : ""}`}</div></div>
          <div className="kpi"><span className="lbl">Broken config</span><b style={danger > 0 ? { color: "#9A1F2B" } : undefined}>{danger}</b><div className={`trend ${danger > 0 ? "danger" : "up"}`}>{danger === 0 ? "None" : "Fix in Tile Editor"}</div></div>
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h"><h3>Tiles · current heuristic</h3><span className="meta">V0.8 stub · probes coming V0.9</span></div>
          <table className="tbl" style={{ margin: 0 }}>
            <thead><tr><th>Tile</th><th>Route kind</th><th>Heuristic</th><th>Detail</th><th></th></tr></thead>
            <tbody>
              {tiles.map((t) => {
                const h = heuristicHealth(t);
                const rowCls = h.state === "danger" ? "row-danger" : h.state === "warn" ? "row-warn" : "";
                return (
                  <tr key={t.id} className={rowCls}>
                    <td>
                      <span className="tile-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/></svg></span>
                      <span className="name"><b>{t.capabilityName}</b><span>{t.capabilitySlug}</span></span>
                    </td>
                    <td><code>{t.routeKind}</code></td>
                    <td>
                      <span className={`pill ${h.state === "healthy" ? "live" : h.state === "warn" ? "avail" : "danger"}`}>{h.state}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "#52646C" }}>{h.detail}</td>
                    <td style={{ textAlign: "right" }}>
                      <a className="btn ghost sm" href="/site/tiles">Edit tile</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
