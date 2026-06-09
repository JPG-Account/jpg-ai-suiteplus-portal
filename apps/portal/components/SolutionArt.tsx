// Per-card SVG art — 1:1 ports from source/v0-design.html
import type { ReactElement } from "react";

const ria = (
  <svg viewBox="0 0 220 120">
    <rect x="18" y="18" width="82" height="34" rx="10" fill="#E9F8F9" stroke="#0097AC" />
    <rect x="120" y="18" width="82" height="34" rx="10" fill="#F2FBFC" stroke="#86DDE5" />
    <rect x="68" y="72" width="82" height="28" rx="10" fill="#FFFFFF" stroke="#0097AC" />
    <path d="M100 35h20M161 52v20M100 86h-8" stroke="#0097AC" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const clientUniversity = (
  <svg viewBox="0 0 220 120">
    <rect x="28" y="20" width="60" height="76" rx="12" fill="#FFFFFF" stroke="#0097AC" />
    <path d="M44 42h28M44 56h28M44 70h18" stroke="#0097AC" strokeWidth="3" strokeLinecap="round" />
    <circle cx="146" cy="42" r="18" fill="#E9F8F9" stroke="#0097AC" />
    <rect x="114" y="70" width="64" height="20" rx="10" fill="#F2FBFC" stroke="#86DDE5" />
  </svg>
);

const rapidAssessment = (
  <svg viewBox="0 0 220 120">
    <rect x="22" y="20" width="176" height="76" rx="16" fill="#FFFFFF" stroke="#0097AC" />
    <path d="M42 44h100M42 60h136M42 76h90" stroke="#0097AC" strokeWidth="3" strokeLinecap="round" />
    <circle cx="172" cy="44" r="8" fill="#50C6D2" />
  </svg>
);

const roiCalculator = (
  <svg viewBox="0 0 220 120">
    <rect x="26" y="22" width="58" height="72" rx="12" fill="#FFFFFF" stroke="#0097AC" />
    <rect x="98" y="34" width="24" height="60" rx="8" fill="#DDF5F7" stroke="#0097AC" />
    <rect x="130" y="24" width="24" height="70" rx="8" fill="#BEEEF2" stroke="#0097AC" />
    <rect x="162" y="44" width="24" height="50" rx="8" fill="#7AD5DE" stroke="#0097AC" />
  </svg>
);

const tradePromotion = (
  <svg viewBox="0 0 220 120">
    <path d="M34 86l34-40 26 22 36-40 56 58" fill="none" stroke="#0097AC" strokeWidth="4" />
    <circle cx="34" cy="86" r="5" fill="#0097AC" />
    <circle cx="68" cy="46" r="5" fill="#0097AC" />
    <circle cx="94" cy="68" r="5" fill="#0097AC" />
    <circle cx="130" cy="28" r="5" fill="#0097AC" />
    <circle cx="186" cy="86" r="5" fill="#0097AC" />
  </svg>
);

const cxLifeSciences = (
  <svg viewBox="0 0 220 120">
    <rect x="34" y="18" width="58" height="84" rx="16" fill="#F2FBFC" stroke="#0097AC" />
    <rect x="128" y="18" width="58" height="84" rx="16" fill="#FFFFFF" stroke="#86DDE5" />
    <path d="M63 32v56M49 60h28M145 40h24M145 54h24M145 68h18" stroke="#0097AC" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const cxInsurance = (
  <svg viewBox="0 0 220 120">
    <path d="M110 26l46 18v20c0 24-17 37-46 46-29-9-46-22-46-46V44l46-18Z" fill="#F2FBFC" stroke="#0097AC" strokeWidth="3" />
    <path d="M110 50v28M96 64h28" stroke="#0097AC" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const flexiom = (
  <svg viewBox="0 0 220 120">
    <rect x="26" y="28" width="54" height="38" rx="10" fill="#FFFFFF" stroke="#0097AC" />
    <rect x="96" y="18" width="98" height="20" rx="10" fill="#EAF8F9" stroke="#86DDE5" />
    <rect x="96" y="50" width="86" height="18" rx="9" fill="#FFFFFF" stroke="#0097AC" />
    <rect x="96" y="78" width="72" height="16" rx="8" fill="#EAF8F9" stroke="#86DDE5" />
    <path d="M42 66v16M62 66v16" stroke="#0097AC" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const map: Record<string, ReactElement> = {
  ria,
  "client-university": clientUniversity,
  "rapid-assessment": rapidAssessment,
  "roi-calculator": roiCalculator,
  "trade-promotion-optimizer": tradePromotion,
  "cx-life-sciences": cxLifeSciences,
  "cx-insurance": cxInsurance,
  flexiom,
};

export function SolutionArt({ id }: { id: string }) {
  return map[id] ?? null;
}
