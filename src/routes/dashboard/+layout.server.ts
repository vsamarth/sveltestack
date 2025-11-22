import { getWorkspaces } from "$lib/server/db/workspace";
import type { LayoutServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const workspaces = await getWorkspaces(locals.user.id);

  return {
    user: locals.user,
    workspaces,
  };
};
