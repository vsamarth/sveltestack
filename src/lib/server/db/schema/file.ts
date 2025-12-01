import { pgTable, timestamp, text, bigint } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { workspace } from "./workspace";

export const file = pgTable("file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  filename: text("filename").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  size: text("size"),
  contentType: text("content_type"),
  status: text("status")
    .$type<"pending" | "completed" | "failed">()
    .default("pending")
    .notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  dropTimestamp: bigint("drop_timestamp", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Relations will be defined in index.ts to avoid circular dependencies

// Export types
export type File = typeof file.$inferSelect;
export type NewFile = typeof file.$inferInsert;
