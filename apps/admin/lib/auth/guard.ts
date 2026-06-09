// withSuperAdmin — wraps API route handlers so only Super Admin can call them.
// Unauth → 401 JSON.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import type { SessionUser } from "./provider";

type Ctx = { params?: Record<string, string | string[]> };
type Handler = (req: NextRequest, ctx: Ctx & { user: SessionUser }) => Promise<Response> | Response;

export function withSuperAdmin(handler: Handler) {
  return async function gated(req: NextRequest, ctx: Ctx) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return handler(req, { ...ctx, user });
  };
}
