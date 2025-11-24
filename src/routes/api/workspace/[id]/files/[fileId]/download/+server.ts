import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getFileById } from "$lib/server/db/file";
import { getWorkspaceById } from "$lib/server/db/workspace";
import { getPresignedDownloadUrl } from "$lib/server/storage";

/**
 * Get presigned download URL for a file
 * GET /api/workspace/[id]/files/[fileId]/download
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = params;

    if (!fileId) {
      return json({ error: "File ID is required" }, { status: 400 });
    }

    // Get file from database
    const file = await getFileById(fileId);
    if (!file) {
      return json({ error: "File not found" }, { status: 404 });
    }

    // Verify user owns the workspace
    const workspace = await getWorkspaceById(file.workspaceId);
    if (!workspace || workspace.ownerId !== locals.user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if file is deleted
    if (file.deletedAt) {
      return json({ error: "File has been deleted" }, { status: 410 });
    }

    // Check if file upload is completed
    if (file.status !== "completed") {
      return json({ error: "File upload not completed" }, { status: 400 });
    }

    // Generate presigned download URL (valid for 1 hour)
    const downloadUrl = await getPresignedDownloadUrl(
      file.storageKey,
      file.filename,
      3600,
    );

    return json({
      url: downloadUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error("Download URL generation error:", error);
    return json({ error: "Failed to generate download URL" }, { status: 500 });
  }
};
