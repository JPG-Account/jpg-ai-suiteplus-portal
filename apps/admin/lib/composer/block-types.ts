// Composer V2 · block type registry.
// Single source of truth for: defaults, content-tab schema, preview hints,
// and which blocks support a raw-HTML override.

export type FieldDef =
  | { key: string; kind: "text"; label: string; help?: string; maxLength?: number }
  | { key: string; kind: "textarea"; label: string; help?: string; rows?: number }
  | { key: string; kind: "url"; label: string; help?: string }
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[]; help?: string }
  | { key: string; kind: "color"; label: string; help?: string }
  | { key: string; kind: "list"; label: string; itemFields: FieldDef[]; help?: string; max?: number };

export type BlockTypeDef = {
  type: string;
  category: "Hero" | "Content" | "Layout" | "Custom";
  displayName: string;
  defaultLabel: string;
  defaultSubtitle?: string;
  description: string;
  contentFields: FieldDef[];
  defaultFields?: Record<string, any>;
  defaultStyle?: Record<string, any>;
  defaultHtmlPayload?: string | null;
  // 'html' blocks render html_payload verbatim; 'auto' renders fields via known mirror; 'mixed' allows both
  renderMode: "auto" | "html" | "mixed";
};

export const BLOCK_TYPE_REGISTRY: Record<string, BlockTypeDef> = {
  "hero": {
    type: "hero",
    category: "Hero",
    displayName: "Hero",
    defaultLabel: "Hero",
    defaultSubtitle: "Eyebrow · headline · subhead",
    description: "Page-opening headline section.",
    contentFields: [
      { key: "eyebrow", kind: "text", label: "Eyebrow", maxLength: 80, help: "Small label above headline" },
      { key: "headline", kind: "text", label: "Headline", maxLength: 200 },
      { key: "subhead", kind: "textarea", label: "Sub-headline", rows: 3 },
      { key: "primaryCtaLabel", kind: "text", label: "Primary CTA label" },
      { key: "primaryCtaUrl", kind: "url", label: "Primary CTA URL" },
      { key: "secondaryCtaLabel", kind: "text", label: "Secondary CTA label" },
      { key: "secondaryCtaUrl", kind: "url", label: "Secondary CTA URL" },
    ],
    defaultFields: { eyebrow: "Eyebrow", headline: "Headline goes here", subhead: "One or two sentences." },
    defaultStyle: { bg: "linear-gradient(180deg,#0A4C5A 0%,#0D353C 100%)", textColor: "#ffffff", padding: "80px 24px", align: "left" },
    renderMode: "mixed",
  },
  "overview-band": {
    type: "overview-band",
    category: "Content",
    displayName: "Overview band",
    defaultLabel: "Overview band",
    defaultSubtitle: "4 KPI cards",
    description: "Row of 2-6 stat/kpi cards.",
    contentFields: [
      {
        key: "items", kind: "list", label: "Cards", max: 6,
        itemFields: [
          { key: "stat", kind: "text", label: "Stat" },
          { key: "label", kind: "text", label: "Label" },
          { key: "sub", kind: "text", label: "Sub-caption" },
        ],
      },
    ],
    defaultFields: {
      items: [
        { stat: "9", label: "Audience lanes", sub: "from execs to ops" },
        { stat: "8+", label: "Capabilities", sub: "Live, Demo, Available" },
        { stat: "1", label: "Source of truth", sub: "Suite+ Admin" },
        { stat: "0", label: "Code required", sub: "to publish updates" },
      ],
    },
    defaultStyle: { bg: "#F4FAFB", textColor: "#0A4C5A", padding: "48px 24px", align: "center" },
    renderMode: "mixed",
  },
  "lanes": {
    type: "lanes",
    category: "Content",
    displayName: "Lane grid",
    defaultLabel: "Lane grid",
    defaultSubtitle: "audience lanes",
    description: "Audience-by-audience grid bound to Lanes registry.",
    contentFields: [
      { key: "heading", kind: "text", label: "Section heading" },
      { key: "subheading", kind: "textarea", label: "Section sub-heading", rows: 2 },
    ],
    defaultFields: { heading: "Built for every lane", subheading: "Each audience gets a tailored view." },
    defaultStyle: { bg: "#ffffff", textColor: "#0D353C", padding: "64px 24px", align: "center" },
    renderMode: "auto",
  },
  "capabilities": {
    type: "capabilities",
    category: "Content",
    displayName: "Capability grid",
    defaultLabel: "Capability grid",
    defaultSubtitle: "auto-bound to enabled tiles",
    description: "Capability cards bound to the Capabilities registry.",
    contentFields: [
      { key: "heading", kind: "text", label: "Section heading" },
      { key: "subheading", kind: "textarea", label: "Section sub-heading", rows: 2 },
      { key: "columns", kind: "select", label: "Columns", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] },
    ],
    defaultFields: { heading: "Capabilities", subheading: "Practical accelerators.", columns: "4" },
    defaultStyle: { bg: "#ffffff", textColor: "#0D353C", padding: "64px 24px", align: "center" },
    renderMode: "auto",
  },
  "value": {
    type: "value",
    category: "Content",
    displayName: "Where it helps",
    defaultLabel: "Where it helps",
    defaultSubtitle: "story cards",
    description: "3-up story cards explaining value scenarios.",
    contentFields: [
      { key: "heading", kind: "text", label: "Section heading" },
      {
        key: "stories", kind: "list", label: "Stories", max: 6,
        itemFields: [
          { key: "title", kind: "text", label: "Title" },
          { key: "body", kind: "textarea", label: "Body", rows: 3 },
        ],
      },
    ],
    defaultFields: {
      heading: "Where it helps",
      stories: [
        { title: "Decide faster", body: "From discovery to commit in days, not months." },
        { title: "Ship safer", body: "Impact analysis before transports move." },
        { title: "Scale knowledge", body: "Learning that meets people where they work." },
      ],
    },
    defaultStyle: { bg: "#F4FAFB", textColor: "#0D353C", padding: "64px 24px", align: "left" },
    renderMode: "mixed",
  },
  "tapestry": {
    type: "tapestry",
    category: "Layout",
    displayName: "Capability fabric",
    defaultLabel: "Capability fabric",
    defaultSubtitle: "tapestry",
    description: "5-tile asymmetric visual layout.",
    contentFields: [
      { key: "heading", kind: "text", label: "Section heading" },
      { key: "subheading", kind: "textarea", label: "Section sub-heading", rows: 2 },
    ],
    defaultFields: { heading: "Capability fabric", subheading: "How pieces work together." },
    defaultStyle: { bg: "#0D353C", textColor: "#ffffff", padding: "80px 24px", align: "center" },
    renderMode: "auto",
  },
  "at-a-glance": {
    type: "at-a-glance",
    category: "Content",
    displayName: "At-a-glance summary",
    defaultLabel: "At-a-glance summary",
    defaultSubtitle: "3-panel chart zone",
    description: "Three-panel KPI / chart row.",
    contentFields: [
      { key: "heading", kind: "text", label: "Section heading" },
      {
        key: "panels", kind: "list", label: "Panels", max: 3,
        itemFields: [
          { key: "title", kind: "text", label: "Title" },
          { key: "metric", kind: "text", label: "Metric" },
          { key: "caption", kind: "text", label: "Caption" },
        ],
      },
    ],
    defaultFields: {
      heading: "At a glance",
      panels: [
        { title: "Live capabilities", metric: "1", caption: "RIA" },
        { title: "Demo accelerators", metric: "3", caption: "Rapid Assess · ROI · Client Univ" },
        { title: "Industry stories", metric: "4", caption: "CPG · Life Sciences · Insurance · Public" },
      ],
    },
    defaultStyle: { bg: "#ffffff", textColor: "#0D353C", padding: "64px 24px", align: "center" },
    renderMode: "mixed",
  },
  "cta": {
    type: "cta",
    category: "Content",
    displayName: "Lead-with-story CTA",
    defaultLabel: "Lead-with-story CTA",
    defaultSubtitle: "primary + secondary",
    description: "Closing call-to-action panel.",
    contentFields: [
      { key: "headline", kind: "text", label: "Headline" },
      { key: "subhead", kind: "textarea", label: "Sub-headline", rows: 3 },
      { key: "primaryCtaLabel", kind: "text", label: "Primary CTA label" },
      { key: "primaryCtaUrl", kind: "url", label: "Primary CTA URL" },
      { key: "secondaryCtaLabel", kind: "text", label: "Secondary CTA label" },
      { key: "secondaryCtaUrl", kind: "url", label: "Secondary CTA URL" },
    ],
    defaultFields: { headline: "Lead with the right story.", subhead: "Pick the lane and start the conversation.", primaryCtaLabel: "Talk to the team", primaryCtaUrl: "#" },
    defaultStyle: { bg: "linear-gradient(135deg,#0A4C5A,#0D353C)", textColor: "#ffffff", padding: "80px 24px", align: "center" },
    renderMode: "mixed",
  },
  "footer": {
    type: "footer",
    category: "Layout",
    displayName: "Footer",
    defaultLabel: "Footer",
    defaultSubtitle: "global",
    description: "Site footer.",
    contentFields: [
      { key: "copyright", kind: "text", label: "Copyright line" },
      { key: "tagline", kind: "text", label: "Tagline" },
    ],
    defaultFields: { copyright: "© UST · AI Suite+ for SAP", tagline: "Internal portfolio showcase" },
    defaultStyle: { bg: "#0D353C", textColor: "#ffffff", padding: "32px 24px", align: "left" },
    renderMode: "mixed",
  },

  // ─── New block types · V0.9-Crawl-B Composer V2 ──────────────────────
  "html": {
    type: "html",
    category: "Custom",
    displayName: "Raw HTML",
    defaultLabel: "Custom HTML",
    defaultSubtitle: "raw markup",
    description: "Paste any HTML. Renders verbatim in preview and on the portal.",
    contentFields: [],
    defaultFields: {},
    defaultStyle: { bg: "transparent", padding: "0px", textColor: "inherit" },
    defaultHtmlPayload: `<section style="padding:64px 24px;text-align:center">\n  <h2 style="font:700 32px/1.2 system-ui;color:#0D353C">New HTML block</h2>\n  <p style="font:400 16px/1.5 system-ui;color:#52646C">Edit this HTML on the right.</p>\n</section>`,
    renderMode: "html",
  },
  "markdown": {
    type: "markdown",
    category: "Custom",
    displayName: "Markdown",
    defaultLabel: "Markdown copy",
    defaultSubtitle: "long-form text",
    description: "Markdown-rendered body. Headings, lists, links, code.",
    contentFields: [
      { key: "body", kind: "textarea", label: "Markdown", rows: 12, help: "GitHub-flavored markdown." },
    ],
    defaultFields: { body: "## Section heading\n\nThis is a markdown block. Use **bold**, *italic*, [links](#), and lists." },
    defaultStyle: { bg: "#ffffff", textColor: "#0D353C", padding: "64px 24px", align: "left" },
    renderMode: "auto",
  },
  "image": {
    type: "image",
    category: "Content",
    displayName: "Image / banner",
    defaultLabel: "Image",
    defaultSubtitle: "single image",
    description: "Full-width image with optional caption.",
    contentFields: [
      { key: "src", kind: "url", label: "Image URL" },
      { key: "alt", kind: "text", label: "Alt text" },
      { key: "caption", kind: "text", label: "Caption (optional)" },
    ],
    defaultFields: { src: "", alt: "", caption: "" },
    defaultStyle: { bg: "transparent", padding: "32px 24px", align: "center" },
    renderMode: "auto",
  },
  "spacer": {
    type: "spacer",
    category: "Layout",
    displayName: "Spacer",
    defaultLabel: "Spacer",
    defaultSubtitle: "vertical gap",
    description: "Empty vertical space.",
    contentFields: [
      {
        key: "height", kind: "select", label: "Height",
        options: [{ value: "16", label: "16px" }, { value: "32", label: "32px" }, { value: "64", label: "64px" }, { value: "96", label: "96px" }, { value: "128", label: "128px" }],
      },
    ],
    defaultFields: { height: "64" },
    defaultStyle: { bg: "transparent" },
    renderMode: "auto",
  },
};

export const BLOCK_TYPES_BY_CATEGORY: Record<string, BlockTypeDef[]> = (() => {
  const out: Record<string, BlockTypeDef[]> = {};
  for (const def of Object.values(BLOCK_TYPE_REGISTRY)) {
    if (!out[def.category]) out[def.category] = [];
    out[def.category].push(def);
  }
  return out;
})();
