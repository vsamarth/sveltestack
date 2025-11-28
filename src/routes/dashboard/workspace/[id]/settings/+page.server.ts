import { getWorkspaceById } from "$lib/server/db/workspace";
import { getWorkspaceMembersWithDetails } from "$lib/server/db/membership";
import { getPendingInvites } from "$lib/server/db/invite";
import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { workspaceSchema } from "$lib/validation";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  const workspace = await getWorkspaceById(params.id);

  if (!workspace) {
    throw error(404, "Workspace not found");
  }

  // Only owners can access settings
  const isOwner = workspace.ownerId === locals.user.id;
  if (!isOwner) {
    throw error(403, "Only workspace owners can access settings");
  }

  const [members, pendingInvites] = await Promise.all([
    getWorkspaceMembersWithDetails(params.id),
    getPendingInvites(params.id),
  ]);

  // Get owner details
  const ownerInfo = {
    id: locals.user.id,
    name: locals.user.name,
    email: locals.user.email,
    image: locals.user.image,
    role: "owner" as const,
    createdAt: workspace.createdAt,
  };

  return {
    workspace,
    owner: ownerInfo,
    members,
    pendingInvites,
    isOwner,
    currentUserId: locals.user.id,
    workspaceForm: await superValidate(
      { name: workspace.name },
      zod4(workspaceSchema),
    ),
  };
};
