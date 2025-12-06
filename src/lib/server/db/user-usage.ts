import { db } from ".";
import { eq } from "drizzle-orm";
import { userUsage } from "./schema";
import type { UserUsage } from "./schema/user-usage";

/**
 * Refresh the user_usage materialized view
 * This should be called periodically or after significant data changes
 */
export async function refreshUserUsage(): Promise<void> {
  await db.refreshMaterializedView(userUsage);
}

/**
 * Get all usage metrics for a user
 */
export async function getUserUsage(userId: string): Promise<UserUsage | undefined> {
  const result = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  return result;
}

/**
 * Get storage usage for a user (in bytes)
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  const result = await getUserUsage(userId);
  return result?.totalStorageBytes ?? 0;
}

/**
 * Get file count for a user
 */
export async function getUserFileCount(userId: string): Promise<number> {
  const result = await getUserUsage(userId);
  return result?.totalFiles ?? 0;
}

