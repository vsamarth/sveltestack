import { db } from ".";
import { eq } from "drizzle-orm";
import { userUsage } from "./schema";
import type { UserUsage } from "./schema/user-usage";

export async function refreshUserUsage(): Promise<void> {
  await db.refreshMaterializedView(userUsage);
}

export async function getUserUsage(
  userId: string,
): Promise<UserUsage | undefined> {
  const result = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  return result;
}

export async function getUserStorageUsage(userId: string): Promise<number> {
  const result = await getUserUsage(userId);
  const bytes = result?.totalStorageBytes;
  return bytes ? Number(bytes) : 0;
}

export async function getUserFileCount(userId: string): Promise<number> {
  const result = await getUserUsage(userId);
  return result?.totalFiles ?? 0;
}
