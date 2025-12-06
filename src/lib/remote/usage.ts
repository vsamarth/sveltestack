import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { getUserStorageUsage } from "$lib/server/db/user-usage";
import { getUserPlan } from "$lib/server/db/usage";
import { PLAN_LIMITS } from "$lib/server/usage-limits";

export const getUserUsageRemote = command(async () => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  const [used, plan] = await Promise.all([
    getUserStorageUsage(locals.user.id),
    getUserPlan(locals.user.id),
  ]);

  const total = PLAN_LIMITS[plan].storageBytes;
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return {
    used,
    total,
    plan,
    percentage: Math.min(percentage, 100),
  };
});
