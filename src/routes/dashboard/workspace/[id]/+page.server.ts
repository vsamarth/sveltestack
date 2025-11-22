import { getWorkspaceById } from "$lib/server/db/workspace";
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

  if (workspace.ownerId !== locals.user.id) {
    throw error(403, "Forbidden");
  }
  return {
    workspace,
  };
};
