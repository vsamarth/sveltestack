import { getWorkspaceById } from "$lib/server/db/workspace";
import {
  getWorkspaceFiles,
  deleteFile,
  getFileById,
} from "$lib/server/db/file";
import type { Actions, PageServerLoad } from "./$types";
import { error, fail } from "@sveltejs/kit";

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

  const files = await getWorkspaceFiles(params.id);

  return {
    workspace,
    files,
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
      // Get file and verify workspace ownership
      const file = await getFileById(fileId);
      if (!file) {
        return fail(404, { error: "File not found" });
      }

      const workspace = await getWorkspaceById(file.workspaceId);
      if (!workspace || workspace.ownerId !== locals.user.id) {
        return fail(403, { error: "Forbidden" });
      }

      await deleteFile(fileId);
      return { success: true };
    } catch (err) {
      console.error("Delete file error:", err);
      return fail(500, { error: "Failed to delete file" });
    }
  },
};
