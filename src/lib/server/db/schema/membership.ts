import { pgTable, timestamp, text, unique } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspace } from "./workspace";
import { user } from "./auth";

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"member">().default("member").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    uniqueWorkspaceUser: unique().on(table.workspaceId, table.userId),
  }),
);

// Relations will be defined in index.ts to avoid circular dependencies

// Export types
export type WorkspaceMember = typeof workspaceMember.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMember.$inferInsert;
