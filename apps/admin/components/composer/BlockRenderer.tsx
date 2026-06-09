// Composer V2 · preview renderer.
// One component per block type. Faithful enough for the iframe preview
// to feel like the real portal, but lives in admin so JP can iterate fast.
// All blocks share the OuterFrame which applies style_json + outlines selection.
import { marked } from "../../lib/composer/markdown";

export type RenderBlock = {
  id: string;
  type: string;
  label: string;
  subtitle: string | null;
  fields: Record<string, any>;
  style: Record<string, any>;
  htmlPayload: string | null;
  isEnabled: boolean;
};

export function BlockRenderer({ block, selected, lanes, capabilities }: { block: RenderBlock; selected: boolean; lanes: any[]; capabilities: any[] }) {
  if (!block.isEnabled) return null;
  const style = block.style ?? {};
  const outerStyle: React.CSSProperties = {
    background: style.bg || "transparent",
    color: style.textColor || "inherit",
    padding: style.padding || "0",
    textAlign: (style.align as any) || "left",
    position: "relative",
  };

  const inner = (() => {
    switch (block.type) {
      case "hero": return <HeroBlock f={block.fields} style={style} />;
      case "overview-band": return <OverviewBandBlock f={block.fields} />;
      case "lanes": return <LanesBlock f={block.fields} lanes={lanes} />;
      case "capabilities": return <CapabilitiesBlock f={block.fields} capabilities={capabilities} />;
      case "value": return <ValueBlock f={block.fields} />;
      case "tapestry": return <TapestryBlock f={block.fields} capabilities={capabilities} />;
      case "at-a-glance": return <AtAGlanceBlock f={block.fields} />;
      case "cta": return <CtaBlock f={block.fields} />;
      case "footer": return <FooterBlock f={block.fields} />;
      case "html": return <HtmlBlock payload={block.htmlPayload ?? ""} />;
      case "markdown": return <MarkdownBlock f={block.fields} />;
      case "image": return <ImageBlock f={block.fields} />;
      case "spacer": return <div style={{ height: parseInt(block.fields?.height ?? "64", 10) }} />;
      default: return <UnknownBlock block={block} />;
    }
  })();

  return (
    <div data-block-id={block.id} data-block-type={block.type} style={outerStyle} className={selected ? "blk selected" : "blk"}>
      {selected && (
        <div style={{ position: "absolute", inset: 0, outline: "2px solid #00BCD4", outlineOffset: -2, pointerEvents: "none", zIndex: 5 }}>
          <span style={{ position: "absolute", top: -22, left: 0, background: "#00BCD4", color: "#fff", padding: "2px 8px", fontSize: 11, borderRadius: "4px 4px 0 0", fontWeight: 600, fontFamily: "system-ui" }}>
            {block.label} · {block.type}
          </span>
        </div>
      )}
      {inner}
    </div>
  );
}

// ─── Block components ─────────────────────────────────────────────────

function HeroBlock({ f, style }: { f: any; style: any }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.eyebrow && <div style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.75, marginBottom: 12, fontWeight: 600 }}>{f.eyebrow}</div>}
      {f.headline && <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: "0 0 18px", letterSpacing: "-0.02em", fontWeight: 800 }}>{f.headline}</h1>}
      {f.subhead && <p style={{ fontSize: 18, lineHeight: 1.55, margin: "0 0 28px", maxWidth: 720, opacity: 0.92 }}>{f.subhead}</p>}
      {(f.primaryCtaLabel || f.secondaryCtaLabel) && (
        <div style={{ display: "flex", gap: 12, justifyContent: style.align === "center" ? "center" : "flex-start" }}>
          {f.primaryCtaLabel && <a href={f.primaryCtaUrl || "#"} style={{ background: "#00BCD4", color: "#0D353C", padding: "13px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>{f.primaryCtaLabel}</a>}
          {f.secondaryCtaLabel && <a href={f.secondaryCtaUrl || "#"} style={{ border: "1px solid rgba(255,255,255,0.3)", color: "inherit", padding: "13px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>{f.secondaryCtaLabel}</a>}
        </div>
      )}
    </div>
  );
}

function OverviewBandBlock({ f }: { f: any }) {
  const items = Array.isArray(f.items) ? f.items : [];
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`, gap: 16 }}>
      {items.map((it: any, i: number) => (
        <div key={i} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#0A4C5A", letterSpacing: "-0.02em" }}>{it.stat}</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{it.label}</div>
          {it.sub && <div style={{ fontSize: 12, color: "#52646C", marginTop: 2 }}>{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function LanesBlock({ f, lanes }: { f: any; lanes: any[] }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.heading && <h2 style={{ fontSize: 36, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{f.heading}</h2>}
      {f.subheading && <p style={{ fontSize: 16, color: "#52646C", margin: "0 0 32px" }}>{f.subheading}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {lanes.map((ln: any) => (
          <div key={ln.id} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(13,53,60,0.08)", textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#00BCD4", marginBottom: 6 }}>For {ln.audience?.split(",")[0] ?? "everyone"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{ln.name}</div>
            <div style={{ fontSize: 13, color: "#52646C", lineHeight: 1.5 }}>{ln.purpose}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CapabilitiesBlock({ f, capabilities }: { f: any; capabilities: any[] }) {
  const cols = parseInt(f.columns ?? "4", 10);
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.heading && <h2 style={{ fontSize: 36, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{f.heading}</h2>}
      {f.subheading && <p style={{ fontSize: 16, color: "#52646C", margin: "0 0 32px" }}>{f.subheading}</p>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
        {capabilities.filter((c: any) => c.enabled !== false).map((c: any) => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid rgba(13,53,60,0.08)", textAlign: "left", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0D353C" }}>{c.shortName || c.name}</div>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                background: c.status === "live" ? "#D4F4D4" : c.status === "demo" ? "#E3F0FE" : "#FFF1DD",
                color: c.status === "live" ? "#1B5E20" : c.status === "demo" ? "#175AA8" : "#8E520E",
                padding: "2px 8px", borderRadius: 6,
              }}>{c.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "#7F8B92", marginBottom: 8 }}>{c.type}</div>
            <div style={{ fontSize: 13, color: "#52646C", lineHeight: 1.5 }}>{c.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueBlock({ f }: { f: any }) {
  const stories = Array.isArray(f.stories) ? f.stories : [];
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.heading && <h2 style={{ fontSize: 36, margin: "0 0 32px", letterSpacing: "-0.02em" }}>{f.heading}</h2>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stories.length, 3)}, 1fr)`, gap: 16 }}>
        {stories.map((s: any, i: number) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid rgba(13,53,60,0.08)" }}>
            <h3 style={{ fontSize: 22, margin: "0 0 12px", letterSpacing: "-0.01em" }}>{s.title}</h3>
            <p style={{ fontSize: 14, color: "#52646C", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TapestryBlock({ f, capabilities }: { f: any; capabilities: any[] }) {
  const tiles = capabilities.slice(0, 5);
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.heading && <h2 style={{ fontSize: 36, margin: "0 0 12px", letterSpacing: "-0.02em" }}>{f.heading}</h2>}
      {f.subheading && <p style={{ fontSize: 16, opacity: 0.8, margin: "0 0 32px" }}>{f.subheading}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "200px 200px", gap: 12 }}>
        {tiles.map((c: any, i: number) => (
          <div key={c.id} style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.15)",
            gridColumn: i === 0 ? "1 / 2" : undefined,
            gridRow: i === 0 ? "1 / 3" : undefined,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            <div style={{ fontSize: i === 0 ? 28 : 18, fontWeight: 700 }}>{c.shortName || c.name}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{c.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AtAGlanceBlock({ f }: { f: any }) {
  const panels = Array.isArray(f.panels) ? f.panels : [];
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {f.heading && <h2 style={{ fontSize: 36, margin: "0 0 32px", letterSpacing: "-0.02em" }}>{f.heading}</h2>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(panels.length, 3)}, 1fr)`, gap: 16 }}>
        {panels.map((p: any, i: number) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid rgba(13,53,60,0.08)" }}>
            <div style={{ fontSize: 13, color: "#7F8B92", marginBottom: 8, fontWeight: 600 }}>{p.title}</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#0A4C5A", letterSpacing: "-0.02em" }}>{p.metric}</div>
            <div style={{ fontSize: 12, color: "#52646C" }}>{p.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBlock({ f }: { f: any }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {f.headline && <h2 style={{ fontSize: 44, margin: "0 0 16px", letterSpacing: "-0.02em", fontWeight: 800 }}>{f.headline}</h2>}
      {f.subhead && <p style={{ fontSize: 18, opacity: 0.92, margin: "0 0 28px", lineHeight: 1.5 }}>{f.subhead}</p>}
      {(f.primaryCtaLabel || f.secondaryCtaLabel) && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {f.primaryCtaLabel && <a href={f.primaryCtaUrl || "#"} style={{ background: "#00BCD4", color: "#0D353C", padding: "14px 28px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>{f.primaryCtaLabel}</a>}
          {f.secondaryCtaLabel && <a href={f.secondaryCtaUrl || "#"} style={{ border: "1px solid rgba(255,255,255,0.4)", color: "inherit", padding: "14px 28px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>{f.secondaryCtaLabel}</a>}
        </div>
      )}
    </div>
  );
}

function FooterBlock({ f }: { f: any }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{f.copyright}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{f.tagline}</div>
    </div>
  );
}

function HtmlBlock({ payload }: { payload: string }) {
  // Sandboxed-feel: rendered inside an iframe that already isolates from admin shell.
  return <div dangerouslySetInnerHTML={{ __html: payload }} />;
}

function MarkdownBlock({ f }: { f: any }) {
  const html = marked(String(f?.body ?? ""));
  return <div style={{ maxWidth: 760, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ImageBlock({ f }: { f: any }) {
  if (!f.src) {
    return <div style={{ maxWidth: 900, margin: "0 auto", background: "#F0F4F6", border: "2px dashed #C9D1D4", padding: 48, textAlign: "center", borderRadius: 14, color: "#7F8B92", fontSize: 13 }}>Image URL not set</div>;
  }
  return (
    <figure style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.src} alt={f.alt || ""} style={{ width: "100%", height: "auto", borderRadius: 14, display: "block" }} />
      {f.caption && <figcaption style={{ fontSize: 13, color: "#7F8B92", marginTop: 8, textAlign: "center" }}>{f.caption}</figcaption>}
    </figure>
  );
}

function UnknownBlock({ block }: { block: RenderBlock }) {
  return (
    <div style={{ background: "#FFF8EC", border: "1px dashed #ECD8A6", padding: 24, color: "#5E3700", borderRadius: 14, maxWidth: 900, margin: "0 auto" }}>
      <b>Unknown block type:</b> <code>{block.type}</code>. Switch to a known type or paste HTML.
    </div>
  );
}
