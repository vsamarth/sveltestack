import type { LayoutServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { workspaceSchema } from "$lib/validation";
import { getUserWorkspaces } from "$lib/server/db/membership";
import { getUserStorageUsage } from "$lib/server/db/user-usage";
import { getUserPlan } from "$lib/server/db/usage";
import { PLAN_LIMITS } from "$lib/server/usage-limits";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Get all workspaces (owned + member)
  const { owned: ownedWorkspaces, member: memberWorkspaces } =
    await getUserWorkspaces(locals.user.id);

  // Get storage usage data
  const [used, plan] = await Promise.all([
    getUserStorageUsage(locals.user.id),
    getUserPlan(locals.user.id),
  ]);

  const total = PLAN_LIMITS[plan].storageBytes;
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return {
    user: { ...locals.user, plan },
    ownedWorkspaces,
    memberWorkspaces,
    workspaceForm: await superValidate(zod4(workspaceSchema)),
    storageUsage: {
      used,
      total,
      plan,
      percentage: Math.min(percentage, 100),
    },
  };
};
