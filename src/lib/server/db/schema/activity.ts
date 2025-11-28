import { pgTable, timestamp, text, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspace } from "./workspace";
import { user } from "./auth";

// Define PostgreSQL enum for event types
export const workspaceActivityEventType = pgEnum("workspace_activity_event_type", [
  "workspace.created",
  "workspace.renamed",
  "workspace.deleted",
  "file.uploaded",
  "file.renamed",
  "file.deleted",
  "file.downloaded",
  "member.added",
  "member.removed",
  "invite.sent",
  "invite.accepted",
  "invite.cancelled",
]);

export const workspaceActivity = pgTable(
  "workspace_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    eventType: workspaceActivityEventType("event_type").notNull(),
    entityType: text("entity_type").$type<"workspace" | "file" | "member" | "invite">(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdCreatedAtIdx: index("workspace_activity_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    workspaceIdEventTypeIdx: index("workspace_activity_workspace_id_event_type_idx").on(
      table.workspaceId,
      table.eventType,
    ),
    entityTypeEntityIdIdx: index("workspace_activity_entity_type_entity_id_idx").on(
      table.entityType,
      table.entityId,
    ),
  }),
);

// Export types
export type WorkspaceActivity = typeof workspaceActivity.$inferSelect;
export type NewWorkspaceActivity = typeof workspaceActivity.$inferInsert;
export type WorkspaceActivityEventType =
  | "workspace.created"
  | "workspace.renamed"
  | "workspace.deleted"
  | "file.uploaded"
  | "file.renamed"
  | "file.deleted"
  | "file.downloaded"
  | "member.added"
  | "member.removed"
  | "invite.sent"
  | "invite.accepted"
  | "invite.cancelled";

