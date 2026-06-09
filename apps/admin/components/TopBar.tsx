import type { ReactNode } from "react";
import { Icon } from "./Icons";
import { currentUser } from "../lib/data";

type Crumb = { label: string; href?: string; bold?: boolean };

type Props = {
  crumbs: Crumb[];
  pill?: { tone: "amber" | "green" | "red" | "violet"; label: string };
  env?: "Production" | "Preview";
};

export function TopBar({ crumbs, pill, env = "Production" }: Props) {
  // Public portal URL — surfaced as a "View live" launcher in the top bar so
  // admins can jump to the deployed portal from any admin page. Server-side
  // env read (TopBar is a server component) avoids needing NEXT_PUBLIC_*
  // which would have to be baked in at build time.
  const portalUrl = (process.env.PORTAL_BASE_URL ?? "").replace(/\/$/, "");

  return (
    <div className="topbar">
      <div className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {i > 0 && Icon.chevronRight}
            {c.bold ? <b>{c.label}</b> : <span>{c.label}</span>}
          </span>
        ))}
        {pill && <span className={`pill ${pill.tone}`}>{pill.label}</span>}
      </div>
      <div className="top-right">
        {portalUrl && (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn ghost sm"
            title={`Open public portal: ${portalUrl}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px" }}
          >
            View live {Icon.external}
          </a>
        )}
        <div className={`env-switcher ${env === "Preview" ? "env-stage" : ""}`}>
          <span className="env-dot" /> {env}
          <kbd>⌘E</kbd>
          {Icon.chevronDown}
        </div>
        <button className="icon-btn" aria-label="Approvals">
          {Icon.approvals}
          <span className="badge" />
        </button>
        <button className="icon-btn" aria-label="Notifications">
          {Icon.bell}
        </button>
        <div className="top-avatar" aria-label={currentUser.name}>{currentUser.initials}</div>
      </div>
    </div>
  );
}

export function ActionBar({
  title, sub, actions,
}: { title: string; sub?: string | ReactNode; actions?: ReactNode }) {
  return (
    <div className="actionbar">
      <div className="actionbar-l">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="actionbar-r">{actions}</div>}
    </div>
  );
}
