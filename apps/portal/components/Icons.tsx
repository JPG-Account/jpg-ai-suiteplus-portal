import type { ReactElement } from "react";

const sw = 1.8;
const stroke = "currentColor";

// Section eyebrow icons (14×14, currentColor stroke)
export const SectionIcon = {
  showcase: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6h7v7H4zM13 6h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  ),
  audience: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="9" r="3" stroke={stroke} strokeWidth={sw}/>
      <circle cx="17" cy="11" r="2.4" stroke={stroke} strokeWidth={sw}/>
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5M14 19c.3-2.4 1.8-3.6 3.5-3.6S20.7 16.6 21 19" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  capability: (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth={sw}/>
      <rect x="13" y="4" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth={sw}/>
      <rect x="4" y="13" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth={sw}/>
      <rect x="13" y="13" width="7" height="7" rx="1.6" stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  where: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v10H4zM4 16l4 4M20 16l-4 4" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  ),
  fabric: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 12c4-5 14-5 18 0M3 12c4 5 14 5 18 0" stroke={stroke} strokeWidth={sw}/>
      <circle cx="12" cy="12" r="2.4" stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  signals: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 20V8M10 20V4M16 20v-8M22 20v-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  governance: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ops: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw}/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 4h10l4 4v12H5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M15 4v4h4M8 12h8M8 16h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  shared: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M9 4h11v11H9zM4 9h11v11H4z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  ),
  playbook: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 4h11l3 3v13H5z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      <path d="M8 9h8M8 13h8M8 17h5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
    </svg>
  ),
  backlog: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/>
      <circle cx="20" cy="18" r="2.2" stroke={stroke} strokeWidth={sw}/>
    </svg>
  ),
  guardrail: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 6h14v6c0 4-3 7-7 8-4-1-7-4-7-8z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
    </svg>
  ),
  handle: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 12h12l-3-3M4 12l3 3M16 5h4v14h-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  principle: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth={sw}/>
      <path d="M8 12l3 3 5-6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// Lane icons (24×24)
export const LaneIcon: Record<string, ReactElement> = {
  executives: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 19l3-8 3 6 3-12 3 9 3-5 3 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  architects: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 21V9l9-6 9 6v12" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M9 21v-6h6v6M3 13h18" stroke={stroke} strokeWidth="2"/>
    </svg>
  ),
  business: (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke={stroke} strokeWidth="2"/>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  consultants: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 4h10l4 4v12H5z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M15 4v4h4M9 12h6M9 16h4" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  developers: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ops: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="2"/>
      <path d="M19 12a7 7 0 0 0-.6-2.8l2-1.5-2-3.4-2.3 1A7 7 0 0 0 14 4.2L13.6 2h-3.2L10 4.2A7 7 0 0 0 7.9 5.3l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 1 .2 1.9.6 2.8l-2 1.5 2 3.4 2.3-1A7 7 0 0 0 10 19.8L10.4 22h3.2l.4-2.2c.8-.3 1.5-.6 2.1-1.1l2.3 1 2-3.4-2-1.5c.4-.9.6-1.8.6-2.8z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
  governance: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2"/>
      <path d="M12 7v10M9 9h4.5a2 2 0 1 1 0 4H10a2 2 0 1 0 0 4h5" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  industry: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 21V11l5 3V8l5 3V5l8 5v11z" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  ),
};

// Asset card icons
export const AssetIcon = {
  experience: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M3 5h18v12H3zM3 19h18M9 17v2M15 17v2" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke={stroke} strokeWidth="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={stroke} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  platform: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z" stroke={stroke} strokeWidth="2"/><path d="M3 12h18M12 3c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.6-4-9s1.5-6.5 4-9z" stroke={stroke} strokeWidth="2"/></svg>
  ),
};
