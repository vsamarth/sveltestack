import { db } from ".";
import { eq, sql } from "drizzle-orm";
import { user, workspace } from "./schema";
import { workspaceActivity } from "./schema";
import { PLAN_LIMITS, UsageLimitExceededError, formatBytes } from "../usage-limits";
import type { UserPlan } from "./schema/auth";

/**
 * Get user's plan from the user table
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const result = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  return result?.plan ?? "free";
}

/**
 * Get current storage usage for a user (computed from activity logs)
 * Aggregates file.uploaded and file.deleted events from workspaces owned by the user
 */
export async function getStorageUsage(userId: string): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(
        CASE 
          WHEN ${workspaceActivity.eventType} = 'file.uploaded' 
            THEN CAST((${workspaceActivity.metadata}->>'size') AS BIGINT)
          WHEN ${workspaceActivity.eventType} = 'file.deleted' 
            THEN -CAST((${workspaceActivity.metadata}->>'size') AS BIGINT)
          ELSE 0
        END
      ), 0)`,
    })
    .from(workspaceActivity)
    .innerJoin(workspace, eq(workspaceActivity.workspaceId, workspace.id))
    .where(eq(workspace.ownerId, userId))
    .then((rows) => rows[0]);

  return result?.total ?? 0;
}

/**
 * Get workspace count for a user (simple COUNT query)
 */
export async function getWorkspaceCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(workspace)
    .where(eq(workspace.ownerId, userId))
    .then((rows) => rows[0]);

  return result?.count ?? 0;
}

/**
 * Check if adding bytes would exceed storage limit
 */
export async function checkStorageLimit(
  userId: string,
  additionalBytes: number,
): Promise<void> {
  const plan = await getUserPlan(userId);
  const currentUsage = await getStorageUsage(userId);
  const limit = PLAN_LIMITS[plan].storageBytes;

  if (currentUsage + additionalBytes > limit) {
    throw new UsageLimitExceededError(
      `Storage limit exceeded. You're using ${formatBytes(currentUsage)} of ${formatBytes(limit)}. Upgrade to Pro for more space.`,
      "storage",
      currentUsage,
      limit,
    );
  }
}

/**
 * Check if file size is allowed for the plan
 */
export function checkFileSizeLimit(plan: UserPlan, fileSize: number): void {
  const limit = PLAN_LIMITS[plan].maxFileSizeBytes;

  if (fileSize > limit) {
    throw new UsageLimitExceededError(
      `File size exceeds limit for your plan. Maximum file size is ${formatBytes(limit)}.`,
      "file_size",
      fileSize,
      limit,
    );
  }
}

/**
 * Check if user can create another workspace
 */
export async function checkWorkspaceLimit(
  plan: UserPlan,
  currentCount: number,
): Promise<void> {
  const limit = PLAN_LIMITS[plan].maxWorkspaces;

  if (currentCount >= limit) {
    throw new UsageLimitExceededError(
      `Free plan allows up to ${limit} workspaces. Upgrade to Pro for unlimited workspaces.`,
      "workspace",
      currentCount,
      limit,
    );
  }
}

/**
 * Check if invites are allowed for the plan
 */
export function checkInviteAllowed(plan: UserPlan): void {
  if (!PLAN_LIMITS[plan].allowsInvites) {
    throw new UsageLimitExceededError(
      "Invites are not available on the Free plan. Upgrade to Pro to invite team members.",
      "invite",
    );
  }
}

