import { getWorkspaceById } from "$lib/server/db/workspace";
import {
  getWorkspaceFiles,
  deleteFile,
  getFileById,
  renameFile,
} from "$lib/server/db/file";
import type { Actions, PageServerLoad } from "./$types";
import { error, fail } from "@sveltejs/kit";
import { hasWorkspaceAccess } from "$lib/server/db/membership";

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

  const files = await getWorkspaceFiles(params.id);

  return {
    workspace,
    files,
    isOwner: workspace.ownerId === locals.user.id,
  };
};

export const actions: Actions = {
  deleteFile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Unauthorized" });
    }

    const formData = await request.formData();
    const fileId = formData.get("fileId") as string;

    if (!fileId) {
      return fail(400, { error: "File ID is required" });
    }

    try {
      // Get file and verify workspace access
      const file = await getFileById(fileId);
      if (!file) {
        return fail(404, { error: "File not found" });
      }

      const hasAccess = await hasWorkspaceAccess(
        file.workspaceId,
        locals.user.id,
      );
      if (!hasAccess) {
        return fail(403, { error: "Forbidden" });
      }

      await deleteFile(fileId);
      return { success: true };
    } catch (err) {
      console.error("Delete file error:", err);
      return fail(500, { error: "Failed to delete file" });
    }
  },

  renameFile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Unauthorized" });
    }

    const formData = await request.formData();
    const fileId = formData.get("fileId") as string;
    const newFilename = formData.get("newFilename") as string;

    if (!fileId) {
      return fail(400, { error: "File ID is required" });
    }

    if (!newFilename || newFilename.trim() === "") {
      return fail(400, { error: "New filename is required" });
    }

    try {
      // Get file and verify workspace access
      const file = await getFileById(fileId);
      if (!file) {
        return fail(404, { error: "File not found" });
      }

      const hasAccess = await hasWorkspaceAccess(
        file.workspaceId,
        locals.user.id,
      );
      if (!hasAccess) {
        return fail(403, { error: "Forbidden" });
      }

      await renameFile(fileId, newFilename.trim());
      return { success: true };
    } catch (err) {
      console.error("Rename file error:", err);
      return fail(500, { error: "Failed to rename file" });
    }
  },
};
