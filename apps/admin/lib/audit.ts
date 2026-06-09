// Append-only audit helper (Postgres).
import { getPool } from "./db/client";
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

export async function writeAudit(input: AuditInput): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO audit_event
      (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      randomUUID(),
      input.actorUserId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.before != null ? JSON.stringify(input.before) : null,
      input.after != null ? JSON.stringify(input.after) : null,
      input.requestId ?? null,
      Date.now(),
    ],
  );
}
