// Append-only audit helper.
import { getSqlite } from "./db/client";
import { randomUUID } from "node:crypto";

type AuditInput = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
};

export function writeAudit(input: AuditInput) {
  const db = getSqlite();
  db.prepare(`
    INSERT INTO audit_event (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.actorUserId,
    input.action,
    input.entityType,
    input.entityId ?? null,
    input.before != null ? JSON.stringify(input.before) : null,
    input.after != null ? JSON.stringify(input.after) : null,
    input.requestId ?? null,
    Date.now(),
  );
}
