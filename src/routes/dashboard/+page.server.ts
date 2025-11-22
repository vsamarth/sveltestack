import {
  getLastActiveWorkspace,
  getWorkspaces,
} from "$lib/server/db/workspace";
import type { PageServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const userId = locals.user.id;

  try {
    const [lastWorkspace, workspaces] = await Promise.all([
      getLastActiveWorkspace(userId),
      getWorkspaces(userId),
    ]);

    if (lastWorkspace) {
      redirect(303, `/dashboard/workspace/${lastWorkspace.id}`);
    }

    if (workspaces.length > 0) {
      throw redirect(303, `/dashboard/workspace/${workspaces[0].id}`);
    }

    error(500, "No workspaces found for user");
  } catch (err) {
    // If it's already a thrown SvelteKit error/redirect rethrow it
    if (err && (err as { status: string }).status) throw err;
    throw error(500, "Failed to load workspaces");
  }
};
