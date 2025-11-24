import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  setLastActiveWorkspace,
} from "$lib/server/db/workspace";
import { workspaceSchema } from "$lib/validation";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const result = workspaceSchema.safeParse(body);

    if (!result.success) {
      throw error(400, { message: "Invalid workspace data" });
    }

    const workspace = await createWorkspace(result.data.name, locals.user.id);
    await setLastActiveWorkspace(locals.user.id, workspace.id);

    return json({ workspace });
  } catch (err) {
    if (err && (err as { status: number }).status) throw err;
    throw error(500, "Failed to create workspace");
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  try {
    const body = await request.json();
    const workspaceId = body.workspaceId as string;

    if (!workspaceId) {
      throw error(400, "Workspace ID is required");
    }

    // Check if this is the user's last workspace
    const userWorkspaces = await getWorkspaces(locals.user.id);

    if (userWorkspaces.length <= 1) {
      throw error(
        400,
        "Cannot delete your last workspace. Create a new workspace first.",
      );
    }

    // Verify ownership
    const workspaceToDelete = userWorkspaces.find((w) => w.id === workspaceId);
    if (!workspaceToDelete) {
      throw error(404, "Workspace not found");
    }

    await deleteWorkspace(workspaceId);

    // Return the first remaining workspace to redirect to
    const remainingWorkspaces = userWorkspaces.filter(
      (w) => w.id !== workspaceId,
    );

    return json({
      success: true,
      redirectTo: `/dashboard/workspace/${remainingWorkspaces[0].id}`,
    });
  } catch (err) {
    if (err && (err as { status: number }).status) throw err;
    throw error(500, "Failed to delete workspace");
  }
};
