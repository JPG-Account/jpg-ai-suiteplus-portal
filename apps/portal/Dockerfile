# syntax=docker/dockerfile:1.7
# UST AI Suite+ for SAP — Portal · multi-stage build for SAP BTP Cloud Foundry.
# Pattern: build the standalone Next.js server in CI, ship a minimal runtime image.

# ───────── Stage 1: deps ─────────
FROM node:22-alpine AS deps
WORKDIR /repo
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifests only — maximises Docker layer cache.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/portal/package.json apps/portal/

RUN pnpm install --filter @ust/portal... --frozen-lockfile

# ───────── Stage 2: builder ─────────
FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/portal/node_modules ./apps/portal/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/portal ./apps/portal

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @ust/portal build

# ───────── Stage 3: runtime ─────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# SAP BTP Cloud Foundry injects PORT; default to 8080 for local Docker runs.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server bundles only the deps the portal actually uses.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/public ./apps/portal/public

USER nextjs
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "apps/portal/server.js"]
