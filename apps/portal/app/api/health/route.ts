import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "ust-ai-suite-plus-sap-portal",
      version: process.env.APP_VERSION ?? "dev",
      uptimeSec: Math.round(process.uptime()),
    },
    { status: 200 },
  );
}
