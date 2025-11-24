import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  getWorkspaceFiles,
  softDeleteFile,
  getFileById,
} from "$lib/server/db/file";
import { getWorkspaceById } from "$lib/server/db/workspace";

/**
 * Get all files for a workspace
 * GET /api/workspace/[id]/files
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;

    // Verify user owns workspace
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || workspace.ownerId !== locals.user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const files = await getWorkspaceFiles(workspaceId);
    return json({ files });
  } catch (error) {
    console.error("Get files error:", error);
    return json({ error: "Failed to get files" }, { status: 500 });
  }
};

/**
 * Soft delete a file
 * DELETE /api/workspace/[id]/files
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return json({ error: "File ID is required" }, { status: 400 });
    }

    // Get file and verify workspace ownership
    const file = await getFileById(fileId);
    if (!file) {
      return json({ error: "File not found" }, { status: 404 });
    }

    const workspace = await getWorkspaceById(file.workspaceId);
    if (!workspace || workspace.ownerId !== locals.user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const deletedFile = await softDeleteFile(fileId);
    return json({ success: true, file: deletedFile });
  } catch (error) {
    console.error("Delete file error:", error);
    return json({ error: "Failed to delete file" }, { status: 500 });
  }
};
