import { pgMaterializedView } from "drizzle-orm/pg-core";
import { sql, eq } from "drizzle-orm";
import { user } from "./auth";
import { workspace } from "./workspace";
import { file } from "./file";

export const userUsage = pgMaterializedView("user_usage").as((qb) => {
  return qb
    .select({
      userId: user.id,
      totalFiles: sql<number>`COALESCE(COUNT(DISTINCT CASE 
        WHEN ${file.deletedAt} IS NULL AND ${file.status} = 'completed' 
        THEN ${file.id} 
      END), 0)::BIGINT`.as("total_files"),
      totalStorageBytes: sql<number>`COALESCE(SUM(CASE 
        WHEN ${file.deletedAt} IS NULL AND ${file.status} = 'completed' 
        THEN CAST(${file.size} AS BIGINT) 
        ELSE 0 
      END), 0)::BIGINT`.as("total_storage_bytes"),
    })
    .from(user)
    .leftJoin(workspace, eq(workspace.ownerId, user.id))
    .leftJoin(file, eq(file.workspaceId, workspace.id))
    .groupBy(user.id);
});

// Export types
export type UserUsage = typeof userUsage.$inferSelect;

