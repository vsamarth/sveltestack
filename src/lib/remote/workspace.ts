import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import z from "zod";
import {
  createWorkspace as createWorkspaceDb,
  updateWorkspace as updateWorkspaceDb,
  deleteWorkspace as deleteWorkspaceDb,
  userOwnsWorkspace,
  getWorkspaces,
  setLastActiveWorkspace as setLastActiveWorkspaceDb,
  getWorkspaceById,
} from "$lib/server/db/workspace";
import { hasWorkspaceAccess } from "$lib/server/db/membership";

export const createWorkspace = command(z.string(), async (name) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    const workspace = await createWorkspaceDb(name, locals.user.id);
    return {
      id: workspace.id,
      name: workspace.name,
    };
  } catch (err) {
    console.error("Failed to create workspace:", err);
    error(500, "Failed to create workspace");
  }
});

export const updateWorkspace = command(
  z.object({
    workspaceId: z.string(),
    name: z.string(),
  }),
  async ({ workspaceId, name }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    // Check if workspace exists
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      error(404, "Workspace not found");
    }

    // Check if user owns the workspace
    if (!(await userOwnsWorkspace(workspaceId, locals.user.id))) {
      error(403, "Forbidden");
    }

    try {
      const updated = await updateWorkspaceDb(workspaceId, name);
      return {
        id: updated.id,
        name: updated.name,
      };
    } catch (err) {
      console.error("Failed to update workspace:", err);
      error(500, "Failed to update workspace");
    }
  },
);

export const deleteWorkspace = command(z.string(), async (workspaceId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    // Check ownership
    if (!(await userOwnsWorkspace(workspaceId, locals.user.id))) {
      error(403, "Forbidden");
    }

    // Check if this is the user's last workspace
    const userWorkspaces = await getWorkspaces(locals.user.id);

    if (userWorkspaces.length <= 1) {
      error(
        400,
        "Cannot delete your last workspace. Create a new workspace first.",
      );
    }

    const remainingWorkspaces = userWorkspaces.filter(
      (w) => w.id !== workspaceId,
    );
    await deleteWorkspaceDb(workspaceId);

    return {
      redirectTo: `/dashboard/workspace/${remainingWorkspaces[0].id}`,
    };
  } catch (err) {
    console.error("Failed to delete workspace:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to delete workspace");
  }
});

export const setLastActiveWorkspace = command(
  z.string(),
  async (workspaceId) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    try {
      const workspace = await getWorkspaceById(workspaceId);

      if (!workspace) {
        error(404, "Workspace not found");
      }

      // Check if user has access to the workspace (owner or member)
      const hasAccess = await hasWorkspaceAccess(workspaceId, locals.user.id);
      if (!hasAccess) {
        error(403, "Forbidden");
      }

      await setLastActiveWorkspaceDb(locals.user.id, workspace.id);
      return { success: true };
    } catch (err) {
      console.error("Failed to set last active workspace:", err);
      if (err && (err as { status: number }).status) throw err;
      error(500, "Failed to set last active workspace");
    }
  },
);
