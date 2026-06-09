# syntax=docker/dockerfile:1.7
# UST AI Suite+ for SAP · Admin · multi-stage build for SAP BTP Cloud Foundry.
# Mirrors the portal's pattern (proven 2026-05-27).

FROM node:22-alpine AS deps
WORKDIR /repo
RUN apk add --no-cache libc6-compat python3 make g++ \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/admin/package.json apps/admin/

RUN pnpm install --filter @ust/admin... --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /repo
RUN apk add --no-cache libc6-compat python3 make g++ \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/admin/node_modules ./apps/admin/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin ./apps/admin

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @ust/admin build

FROM node:22-alpine AS runtime
WORKDIR /app

# better-sqlite3 needs libc + python at build, but only libstdc++ at runtime.
RUN apk add --no-cache libc6-compat libstdc++ ca-certificates wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && mkdir -p /app/apps/admin/data \
 && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /repo/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "apps/admin/server.js"]
