"use client";

import type { HeroBlockFields } from "../lib/registry";

type HeroProps = { hero?: HeroBlockFields };

export function Hero({ hero }: HeroProps = {}) {
  const eyebrow = hero?.eyebrow ?? "UST SAP capability showcase";
  const headline = hero?.headline ?? "UST AI Suite+ for SAP";
  const subhead = hero?.subhead ?? "A modern portfolio of AI-enabled accelerators, SAP-focused solution assets, and practical business tools that help clients assess faster, decide with confidence, improve operations, and move transformation work forward.";

  function quickFilter(lane: string) {
    const grid = document.getElementById("capabilities");
    if (grid) grid.scrollIntoView({ behavior: "smooth" });
    window.dispatchEvent(new CustomEvent("ust:quick-filter", { detail: lane }));
  }

  return (
    <section className="hero" id="top">
      <div className="hero-wrap">
        <div className="hero-panel">
          <div style={{ textAlign: "center" }}>
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h1>{headline}</h1>
          <p className="sub">{subhead}</p>
          <div className="hero-prompt" aria-label="explore prompt">
            <div className="prompt-text">Explore capabilities by need, audience, function, or business outcome.</div>
            <div className="prompt-icon">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="hero-chips">
            <button onClick={() => quickFilter("AI for Executives")}>Show me executive-ready plays</button>
            <button onClick={() => quickFilter("AI for Ops")}>Show me support and AMS capabilities</button>
            <button onClick={() => quickFilter("AI for Business")}>Show me business improvement solutions</button>
            <button onClick={() => quickFilter("AI for Industry / Domain")}>Show me industry-focused offerings</button>
          </div>

          {/* Dark showcase canvas — black + teal + white per UST brand */}
          <div className="hero-art" aria-hidden="true">
            <div className="float-stat one"><b>8</b><span>current capabilities in the portfolio</span></div>
            <div className="float-stat two"><b>9</b><span>audience lanes for discovery and selling</span></div>
            <div className="float-stat three"><b>AI + SAP</b><span>balanced mix of AI-enabled and non-AI solution assets</span></div>
            <div className="float-stat four"><b>Faster</b><span>clearer conversations, assessments, and solution fit</span></div>

            <svg className="ai-stars-art" viewBox="0 0 1200 460" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs>
                <radialGradient id="bgGlowDark" cx="50%" cy="60%" r="55%">
                  <stop offset="0%" stopColor="#53D1DD" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#0097AC" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0B3B42" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="starFillBright" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="60%" stopColor="#E6FAFD" />
                  <stop offset="100%" stopColor="#8DE0E7" />
                </linearGradient>
                <linearGradient id="starFillTeal" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8DE0E7" />
                  <stop offset="100%" stopColor="#0097AC" />
                </linearGradient>
                <linearGradient id="orbitStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8DE0E7" stopOpacity="0" />
                  <stop offset="50%" stopColor="#8DE0E7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8DE0E7" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="orbitStrokeBlack" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                  <stop offset="50%" stopColor="#0E1F25" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </linearGradient>
                <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="hardShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000000" floodOpacity="0.55" />
                </filter>
              </defs>

              {/* Cyan core glow */}
              <ellipse cx="600" cy="270" rx="460" ry="160" fill="url(#bgGlowDark)" />

              {/* Faint diagonal scan lines (UST black at low opacity) */}
              <g opacity="0.18" stroke="#000000" strokeWidth="0.8">
                <path d="M0 380 L1200 220" />
                <path d="M0 340 L1200 180" />
                <path d="M0 420 L1200 260" />
                <path d="M0 300 L1200 140" />
              </g>

              {/* Concentric orbits — bright teal + dark accent stack */}
              <g fill="none">
                <ellipse cx="600" cy="280" rx="440" ry="76" stroke="url(#orbitStrokeBlack)" strokeWidth="2" />
                <ellipse cx="600" cy="280" rx="440" ry="76" stroke="url(#orbitStroke)" strokeWidth="1.2" />
                <ellipse cx="600" cy="280" rx="320" ry="54" stroke="url(#orbitStroke)" strokeWidth="1.2" />
                <ellipse cx="600" cy="280" rx="210" ry="36" stroke="url(#orbitStroke)" strokeWidth="1.2" />
              </g>

              {/* Orbit nodes — solid black + white-cored teal */}
              <g>
                <circle cx="160" cy="280" r="6" fill="#0E1F25" stroke="#8DE0E7" strokeWidth="1.5" />
                <circle cx="1040" cy="280" r="6" fill="#0E1F25" stroke="#8DE0E7" strokeWidth="1.5" />
                <circle cx="280" cy="280" r="4" fill="#8DE0E7" />
                <circle cx="920" cy="280" r="4" fill="#8DE0E7" />
                <circle cx="390" cy="280" r="3" fill="#FFFFFF" />
                <circle cx="810" cy="280" r="3" fill="#FFFFFF" />
              </g>

              {/* Central star — bright white with teal core gradient */}
              <g filter="url(#hardShadow)">
                <g transform="translate(600 260) scale(2.4)">
                  <path d="M0 -82 C13 -26 26 -13 82 0 C26 13 13 26 0 82 C-13 26 -26 13 -82 0 C-26 -13 -13 -26 0 -82 Z" fill="url(#starFillBright)" />
                </g>
                {/* Sharp UST-black inner accent — small diamond at the star core */}
                <g transform="translate(600 260) scale(0.5)">
                  <path d="M0 -32 L20 0 L0 32 L-20 0 Z" fill="#0E1F25" opacity="0.92" />
                </g>
              </g>

              {/* Secondary stars — duotone */}
              <g filter="url(#starGlow)">
                <g className="twinkle" transform="translate(770 130) scale(1.1)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="url(#starFillTeal)" />
                </g>
                <g className="twinkle d1" transform="translate(430 120) scale(0.7)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="#FFFFFF" />
                </g>
                <g className="twinkle d2" transform="translate(900 250) scale(0.6)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="#8DE0E7" />
                </g>
                <g className="twinkle d3" transform="translate(290 250) scale(0.55)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="#FFFFFF" />
                </g>
                <g className="twinkle d2" transform="translate(1070 180) scale(0.5)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="#8DE0E7" />
                </g>
                <g className="twinkle d1" transform="translate(140 180) scale(0.5)">
                  <path d="M0 -44 C7 -14 14 -7 44 0 C14 7 7 14 0 44 C-7 14 -14 7 -44 0 C-14 -7 -7 -14 0 -44 Z" fill="#FFFFFF" />
                </g>
              </g>

              {/* Sparkle dots — high contrast */}
              <g>
                <circle cx="220" cy="80" r="2.5" fill="#FFFFFF" className="twinkle" />
                <circle cx="980" cy="80" r="2.5" fill="#FFFFFF" className="twinkle d2" />
                <circle cx="180" cy="380" r="2" fill="#8DE0E7" className="twinkle d1" />
                <circle cx="1020" cy="380" r="2" fill="#8DE0E7" className="twinkle d3" />
                <circle cx="500" cy="70" r="1.8" fill="#FFFFFF" className="twinkle d2" />
                <circle cx="700" cy="50" r="1.8" fill="#FFFFFF" className="twinkle d3" />
                <circle cx="360" cy="380" r="1.6" fill="#8DE0E7" className="twinkle" />
                <circle cx="840" cy="380" r="1.6" fill="#8DE0E7" className="twinkle d2" />
              </g>

              {/* Brand mark watermark — tiny UST in bottom-right corner of canvas */}
              <g transform="translate(1110 410)" opacity="0.55">
                <text x="0" y="0" fill="#FFFFFF" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="14" letterSpacing="2">U·ST</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
