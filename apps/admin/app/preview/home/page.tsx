// Composer preview · live iframe target.
// Renders all enabled blocks for page=home using BlockRenderer with no chrome.
// The Composer iframe loads this and swaps device width via query param.
//
// IMPORTANT: this page is wrapped by the root <html><body> in app/layout.tsx.
// It MUST NOT render its own html/head/body — that causes nested <html>
// and a React hydration mismatch. The wrapper div with inset:0 covers and
// resets the admin's body gradient so the preview is a clean canvas.
import { getSqlite } from "../../../lib/db/client";
import { ensureDbReady } from "../../../lib/db/ensure-db";
import { BlockRenderer, type RenderBlock } from "../../../components/composer/BlockRenderer";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PreviewHome({ searchParams }: { searchParams: { selected?: string; device?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/preview/home");

  const db = getSqlite();
  ensureDbReady(db);

  const blocks = (db.prepare(`SELECT * FROM page_block WHERE page_key = 'home' ORDER BY position`).all() as any[]).map((b): RenderBlock => ({
    id: b.id,
    type: b.block_type,
    label: b.label,
    subtitle: b.subtitle,
    fields: safeJson(b.fields_json),
    style: safeJson(b.style_json),
    htmlPayload: b.html_payload,
    isEnabled: !!b.is_enabled,
  }));

  const lanes = (db.prepare(`SELECT * FROM lane ORDER BY sort_order`).all() as any[]).map((l) => ({
    id: l.slug, name: l.name, audience: l.audience, purpose: l.purpose,
  }));
  const capabilities = (db.prepare(`SELECT c.*, t.route_template FROM capability c LEFT JOIN tile t ON t.capability_id = c.id ORDER BY c.sort_order`).all() as any[]).map((c) => ({
    id: c.slug, name: c.name, shortName: c.short_name, type: c.type, status: c.status,
    description: c.description, enabled: !!c.enabled,
  }));

  const selected = searchParams.selected ?? null;

  // Wrapper styles: position:fixed inset:0 + background:white covers the
  // admin body's teal gradient. overflow:auto lets long pages scroll.
  // color: reset for inherited admin ink color.
  return (
    <div
      data-preview-canvas
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        color: "#0D353C",
        fontFamily: "-apple-system, system-ui, 'Inter', sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 1,
      }}
    >
      {blocks.map((b) => (
        <BlockRenderer
          key={b.id}
          block={b}
          selected={b.id === selected}
          lanes={lanes}
          capabilities={capabilities}
        />
      ))}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.parent && window.parent.postMessage({ type: 'preview-loaded' }, '*');
            document.querySelectorAll('[data-block-id]').forEach(function(el){
              el.style.cursor = 'pointer';
              el.addEventListener('click', function(e){
                e.preventDefault();
                window.parent && window.parent.postMessage({ type: 'block-click', id: el.dataset.blockId }, '*');
              });
            });
          `,
        }}
      />
    </div>
  );
}

function safeJson(s: string | null | undefined) { try { return JSON.parse(s ?? "{}"); } catch { return {}; } }
