import { pgTable, timestamp, text } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspace } from "./workspace";
import { user } from "./auth";

export const workspaceInvite = pgTable("workspace_invite", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").$type<"member">().default("member").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  status: text("status")
    .$type<"pending" | "accepted" | "expired" | "cancelled">()
    .default("pending")
    .notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Relations will be defined in index.ts to avoid circular dependencies

// Export types
export type WorkspaceInvite = typeof workspaceInvite.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvite.$inferInsert;
