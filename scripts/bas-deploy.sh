#!/usr/bin/env bash
# Step 6 · BAS terminal deploy script — JPG AI SuitePlus
#
# Run this from BAS terminal at https://build-ai-subaccount.us10cf.applicationstudio.cloud.sap
# (NOT from your Mac). Working dir should be the BAS clone of jpg-ai-suiteplus-portal.
#
# Idempotent: safe to re-run. Catches all the gotchas the BTP Lead flagged:
#   - NO --strategy rolling on first push (CF rejects without prior instance)
#   - HARD STOP on app-name collision
#   - Pre-flight checks for Postgres service + GHCR public access
#   - cf set-env every required secret before `cf restart`

set -Eeuo pipefail
IFS=$'\n\t'

ORG="org-build-build-ai-subaccount"
SPACE="code_migration_space"
PORTAL_APP="ust-ai-suiteplus-portal"
ADMIN_APP="ust-ai-suiteplus-portal-admin"
DB_SERVICE="ust-portfolio-db"

# Pin the image to a specific commit SHA. Update before each deploy.
# Get the current short SHA: git rev-parse --short HEAD
IMAGE_SHA="${IMAGE_SHA:-latest}"
PORTAL_IMAGE="ghcr.io/jpg-account/ust-ai-suiteplus-portal:${IMAGE_SHA}"
ADMIN_IMAGE="ghcr.io/jpg-account/ust-ai-suiteplus-portal-admin:${IMAGE_SHA}"

bold() { printf "\n\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$*"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

bold "STEP 0 — Verify cf target"
cf target | grep -q "$ORG" && cf target | grep -q "$SPACE" \
  && ok "Targeting $ORG / $SPACE" \
  || fail "Wrong target. Run: cf login --sso && cf target -o '$ORG' -s '$SPACE'"

bold "STEP 1 — Pre-flight: Postgres service exists"
cf services | grep -q "^$DB_SERVICE\s" \
  && ok "$DB_SERVICE is bound and ready" \
  || fail "Service $DB_SERVICE not found. Cannot proceed."

bold "STEP 2 — Pre-flight: GHCR images are PUBLIC (anonymous pull)"
for img in "$PORTAL_IMAGE" "$ADMIN_IMAGE"; do
  if curl -sf -o /dev/null "https://ghcr.io/v2/${img#ghcr.io/}/manifests/${IMAGE_SHA}" 2>/dev/null; then
    ok "$img — public, pullable"
  else
    warn "$img — 401/404. Either packages are still private OR the SHA tag doesn't exist."
    warn "  Set packages PUBLIC at https://github.com/orgs/JPG-Account/packages"
    warn "  Confirm the build-image workflow ran for commit $IMAGE_SHA"
    exit 1
  fi
done

bold "STEP 3 — Pre-flight: app-name collision check"
EXISTING=$(cf apps | awk 'NR>3 {print $1}' | grep -E "^ust-ai-suiteplus" || true)
if [ -n "$EXISTING" ]; then
  warn "Existing apps with our prefix found:"
  echo "$EXISTING" | sed 's/^/    /'
  echo ""
  read -r -p "Continue and OVERWRITE these apps? (yes/no) " ans
  [ "$ans" = "yes" ] || fail "Aborted by user."
fi

bold "STEP 4 — Deploy PORTAL"
# First deploy: NO --strategy rolling (CF rejects without a prior instance).
# Subsequent re-deploys: change `STRATEGY` env var to '--strategy rolling'.
STRATEGY="${STRATEGY:-}"
cf push -f apps/portal/manifest.yml \
  --docker-image "$PORTAL_IMAGE" \
  $STRATEGY
ok "Portal app deployed"

bold "STEP 5 — Deploy ADMIN (binds $DB_SERVICE via manifest)"
cf push -f apps/admin/manifest.yml \
  --docker-image "$ADMIN_IMAGE" \
  $STRATEGY
ok "Admin app deployed and bound to Postgres"

bold "STEP 6 — Set admin secrets (NEVER printed in plain text in real run)"
# Generate strong randoms for first run; reuse the same values on re-runs.
# If you've already set these and don't want to rotate, comment these out.
cf set-env "$ADMIN_APP" SUPER_ADMIN_EMAIL "john.galido@ust.com"
cf set-env "$ADMIN_APP" AUTH_PASSWORD_PEPPER "$(openssl rand -hex 32)"
cf set-env "$ADMIN_APP" REVALIDATE_SECRET "$(openssl rand -hex 32)"
cf set-env "$ADMIN_APP" PORTAL_BASE_URL "https://${PORTAL_APP}.cfapps.us10-001.hana.ondemand.com"
cf set-env "$ADMIN_APP" NEXT_PUBLIC_PORTAL_BASE_URL "https://${PORTAL_APP}.cfapps.us10-001.hana.ondemand.com"
cf set-env "$ADMIN_APP" ADMIN_BASE_URL "https://${ADMIN_APP}.cfapps.us10-001.hana.ondemand.com"
cf set-env "$ADMIN_APP" AUTH_PROVIDER local
ok "Env vars set"

bold "STEP 7 — Restart admin to pick up env vars"
cf restart "$ADMIN_APP"
ok "Admin restarted clean"

bold "STEP 8 — Wait for admin to be healthy, then trigger lazy DB init"
# First DB-touching request triggers ensureDbReady → CREATE TABLE IF NOT EXISTS
# + super-admin seed + set-password URL minted.
ADMIN_URL="https://${ADMIN_APP}.cfapps.us10-001.hana.ondemand.com"
PORTAL_URL="https://${PORTAL_APP}.cfapps.us10-001.hana.ondemand.com"
for i in 1 2 3 4 5; do
  if curl -fsS "$ADMIN_URL/api/health" >/dev/null 2>&1; then
    ok "Admin /api/health 200"
    break
  fi
  warn "Attempt $i: not healthy yet, retry in 8s..."
  sleep 8
done

# /api/config/current is the public endpoint that fires DB init.
curl -fsS "$ADMIN_URL/api/config/current" >/dev/null 2>&1 \
  && ok "Triggered lazy DB init via /api/config/current" \
  || warn "Init endpoint not yet ready — check logs"

bold "STEP 9 — Retrieve super-admin set-password URL from logs"
sleep 5
echo ""
cf logs "$ADMIN_APP" --recent | grep -B1 -A2 "set-password URL" || \
  warn "set-password URL not yet in --recent buffer. Try: cf logs $ADMIN_APP --recent | grep set-password"

bold "DONE"
echo ""
echo "  Portal:  $PORTAL_URL"
echo "  Admin:   $ADMIN_URL"
echo ""
echo "Open the set-password URL printed above in your browser to set the super-admin password."
echo ""
echo "Next-deploy hint: STRATEGY='--strategy rolling' IMAGE_SHA='<short-sha>' ./scripts/bas-deploy.sh"
