import { getWorkspaceById } from "$lib/server/db/workspace";
import { hasWorkspaceAccess } from "$lib/server/db/membership";
import { getWorkspaceActivities } from "$lib/server/db/activity";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

const ACTIVITIES_PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, params, url }) => {
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

  // Get page from query params
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const offset = (page - 1) * ACTIVITIES_PER_PAGE;

  const activities = await getWorkspaceActivities(params.id, {
    limit: ACTIVITIES_PER_PAGE + 1, // Fetch one extra to check if there's more
    offset,
  });

  // Check if there are more activities
  const hasMore = activities.length > ACTIVITIES_PER_PAGE;
  const displayActivities = hasMore
    ? activities.slice(0, ACTIVITIES_PER_PAGE)
    : activities;

  return {
    workspace,
    activities: displayActivities,
    isOwner: workspace.ownerId === locals.user.id,
    currentUserId: locals.user.id,
    pagination: {
      page,
      hasMore,
      hasPrevious: page > 1,
    },
  };
};
