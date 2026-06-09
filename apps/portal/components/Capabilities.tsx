"use client";

import { useEffect, useMemo, useState } from "react";
import { statusBadgeLabel, type LaneName, type Solution } from "../lib/registry";
import { SolutionArt } from "./SolutionArt";
import { SectionIcon } from "./Icons";

type CapabilitiesProps = { solutions: Solution[] };

const FILTERS: { label: string; value: "all" | LaneName }[] = [
  { label: "All", value: "all" },
  { label: "Executives", value: "AI for Executives" },
  { label: "Architects", value: "AI for Architects" },
  { label: "Business", value: "AI for Business" },
  { label: "Consultants", value: "AI for Consultants" },
  { label: "Developers", value: "AI for Developers" },
  { label: "Ops", value: "AI for Ops" },
  { label: "Industry", value: "AI for Industry / Domain" },
];

export function Capabilities({ solutions }: CapabilitiesProps) {
  const [filter, setFilter] = useState<"all" | LaneName>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as LaneName | "all";
      setFilter(detail);
    }
    window.addEventListener("ust:quick-filter", handler as EventListener);
    return () => window.removeEventListener("ust:quick-filter", handler as EventListener);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return solutions
      .filter((s) => s.enabled)
      .filter((s) => {
        if (filter === "all") return true;
        return s.primaryLane === filter || s.secondaryLanes.includes(filter);
      })
      .filter((s) => {
        if (!q) return true;
        const haystack = [
          s.name,
          s.shortName ?? "",
          s.type,
          s.description,
          ...s.features,
          s.searchKeywords,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [filter, query]);

  return (
    <section className="section" id="capabilities">
      <div className="shell">
        <div className="head">
          <div className="label">{SectionIcon.capability}<span>Capability showcase</span></div>
          <h2>Explore the current portfolio</h2>
          <p>Each capability is presented as a simple business story: what it does, where it helps, and how to lead with it.</p>
        </div>

        <div className="searchbar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.2-4.2M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" stroke="#54717A" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by capability, lane, function, or use case"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-btn ${filter === f.value ? "active" : ""}`}
              onClick={() => setFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="solution-grid">
          {visible.map((s) => (
            <article className="solution-card" key={s.id}>
              <div className="solution-top">
                <div>
                  <div className="sol-type">{s.type}</div>
                  <h3>{s.name}</h3>
                </div>
                <span className={`badge ${s.status}`}>{statusBadgeLabel[s.status]}</span>
              </div>
              <p>{s.description}</p>
              <div className="feature-list">
                {s.features.map((f) => (
                  <div key={f}>
                    <span className="dot" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="sol-art">
                <SolutionArt id={s.id} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
