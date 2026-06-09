// Single SVG icon set — currentColor stroke for theming.
import type { ReactElement } from "react";

const sw = 1.8;
const stroke = "currentColor";

export const Icon = {
  // Nav icons
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M3 12h4v8H3zM10 4h4v16h-4zM17 8h4v12h-4z" strokeLinejoin="round"/></svg>,
  composer: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 8h18M7 21h10"/></svg>,
  capabilities: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  snippets: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>,
  schedule: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
  seo: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M4 12h16M14 6l6 6-6 6M10 18l-6-6 6-6"/></svg>,
  approvals: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M5 4h11l3 3v13H5z" strokeLinejoin="round"/></svg>,
  health: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2" strokeLinecap="round"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  scim: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="11" r="2.4"/><path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5M14 19c.3-2.4 1.8-3.6 3.5-3.6S20.7 16.6 21 19" strokeLinecap="round"/></svg>,
  audit: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round"/></svg>,
  governance: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" strokeLinejoin="round"/></svg>,
  developer: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  observability: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><circle cx="12" cy="12" r="8"/><path d="M3 12h18M12 3c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.6-4-9s1.5-6.5 4-9z"/></svg>,
  integrations: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 12h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round"/></svg>,

  // Utility icons
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><path d="M6 9l6 6 6-6"/></svg>,
  chevronUp: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><path d="M6 15l6-6 6 6"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><path d="M5 5l14 14M19 5L5 19" strokeLinecap="round"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9z"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round"/></svg>,
  external: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M14 3h7v7M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M5 12h14M5 6h14M5 18h10" strokeLinecap="round"/></svg>,
  rotate: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16M21 3v5h-5M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2" strokeLinecap="round"/></svg>,
  upDown: <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
} satisfies Record<string, ReactElement>;
