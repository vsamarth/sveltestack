import type { LayoutServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { workspaceSchema } from "$lib/validation";
import { getUserWorkspaces } from "$lib/server/db/membership";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Get all workspaces (owned + member)
  const { owned: ownedWorkspaces, member: memberWorkspaces } =
    await getUserWorkspaces(locals.user.id);

  return {
    user: locals.user,
    ownedWorkspaces,
    memberWorkspaces,
    workspaceForm: await superValidate(zod4(workspaceSchema)),
  };
};
