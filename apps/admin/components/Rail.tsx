"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { currentUser } from "../lib/data";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof Icon;
  count?: number;
  countTone?: "default" | "danger" | "warn";
  children?: { href: string; label: string }[];
};

type NavSection = { title?: string; items: NavItem[] };

const sections: NavSection[] = [
  { items: [{ href: "/", label: "Overview", icon: "dashboard" }] },
  {
    title: "Configure",
    items: [
      {
        href: "/site/composer", label: "Site Composer", icon: "composer",
        children: [
          { href: "/site/composer", label: "Landing page" },
          { href: "/site/tiles", label: "Capability tiles" },
          { href: "/site/snippets", label: "Snippets" },
          { href: "/site/seo", label: "Redirects & SEO" },
        ],
      },
      { href: "/site/tiles", label: "Capabilities", icon: "capabilities", count: 8 },
      { href: "/schedule", label: "Schedule", icon: "schedule", count: 4 },
    ],
  },
  {
    title: "Operate",
    items: [
      { href: "/approvals", label: "Approvals Inbox", icon: "approvals", count: 3 },
      { href: "/health", label: "Site Health", icon: "health", count: 2, countTone: "danger" },
      { href: "/preview-as", label: "Preview-as-Role", icon: "eye" },
      { href: "/access/scim/errors", label: "SCIM Sync", icon: "scim", count: 1, countTone: "warn" },
    ],
  },
  {
    title: "Govern",
    items: [
      {
        href: "/access/users", label: "People & Access", icon: "users",
        children: [
          { href: "/access/users", label: "Users" },
          { href: "/access/domains", label: "Domain allow-list" },
        ],
      },
      { href: "/governance/revisions", label: "Revisions", icon: "developer" },
      { href: "/governance/audit", label: "Audit log", icon: "audit" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/settings/security", label: "Security", icon: "eye" },
    ],
  },
];

export function Rail() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="rail">
      <div className="rail-brand">
        <div className="rail-mark">
          <span>U</span><span className="rail-mark-dot" aria-hidden="true" />
          <span>S</span><span>T</span>
        </div>
        <div className="rail-brand-copy">
          <b>Suite+ Admin</b>
          <span>UST AI Suite+ for SAP</span>
        </div>
      </div>
      <div className="rail-search">
        <input placeholder="Search anything…" aria-label="Search admin" />
        <kbd>⌘K</kbd>
      </div>
      <nav className="rail-nav" aria-label="Admin navigation">
        {sections.map((sec, i) => (
          <div className="rail-section" key={i}>
            {sec.title && <div className="rail-section-title">{sec.title}</div>}
            {sec.items.map((item) => {
              const active = isActive(item.href);
              const showChildren = active && item.children && item.children.length > 0;
              return (
                <div key={item.href}>
                  <Link
                    className={`rail-item ${active ? "active" : ""}`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    {Icon[item.icon]}
                    <span>{item.label}</span>
                    {item.count != null && (
                      <span
                        className="count"
                        style={
                          item.countTone === "danger"
                            ? { background: "#FFE0E0", color: "#9A1F2B" }
                            : item.countTone === "warn"
                            ? { background: "#FFF1DD", color: "#8E520E" }
                            : undefined
                        }
                      >
                        {item.count}
                      </span>
                    )}
                  </Link>
                  {showChildren && item.children && (
                    <div className="rail-sub">
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={pathname === c.href ? "active" : ""}
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="rail-foot">
        <div className="avatar">{currentUser.initials}</div>
        <div className="id">
          <b>{currentUser.name}</b>
          <span>{currentUser.subtitle}</span>
        </div>
        <span className="role-chip">{currentUser.roleLabel}</span>
      </div>
    </aside>
  );
}
