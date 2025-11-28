import { pgTable, timestamp, text, unique } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { user } from "./auth";

export const workspace = pgTable(
  "workspace",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    uniqueWorkspaceName: unique().on(table.name, table.ownerId),
  }),
);

// Relations will be defined in index.ts to avoid circular dependencies

// Export types
export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
