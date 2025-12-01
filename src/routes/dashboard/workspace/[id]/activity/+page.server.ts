import { getWorkspaceById } from "$lib/server/db/workspace";
import { hasWorkspaceAccess } from "$lib/server/db/membership";
import { getWorkspaceActivities } from "$lib/server/db/activity";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const workspace = await getWorkspaceById(params.id);

  if (!workspace) {
    throw error(404, "Workspace not found");
  }

  // Check if user has access (owner or member)
  const hasAccess = await hasWorkspaceAccess(params.id, locals.user.id);
  if (!hasAccess) {
    throw error(403, "Forbidden");
  }

  // Get all activities without pagination
  const activities = await getWorkspaceActivities(params.id);

  return {
    workspace,
    activities,
    isOwner: workspace.ownerId === locals.user.id,
    currentUserId: locals.user.id,
  };
};
