import { pgTable, timestamp, text } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { user } from "./auth";
import { workspace } from "./workspace";

export const userPreferences = pgTable("user_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lastWorkspaceId: text("last_workspace_id").references(() => workspace.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Relations will be defined in index.ts to avoid circular dependencies

// Export types
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
