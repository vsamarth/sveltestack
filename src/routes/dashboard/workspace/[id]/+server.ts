import {
  getWorkspaceById,
  setLastActiveWorkspace,
} from "$lib/server/db/workspace";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspace = await getWorkspaceById(params.id);

  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }
  if (workspace.ownerId !== locals.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await setLastActiveWorkspace(locals.user.id, workspace.id);
  return new Response(null, { status: 204 });
};
