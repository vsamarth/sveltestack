import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { confirmFileUpload, verifyUserOwnsFile } from "$lib/server/db/file";

/**
 * Confirm successful file upload
 * POST /api/upload/confirm
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return json({ error: "File ID is required" }, { status: 400 });
    }

    // Verify user owns the file's workspace
    const hasAccess = await verifyUserOwnsFile(locals.user.id, fileId);
    if (!hasAccess) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark file as completed
    const updatedFile = await confirmFileUpload(fileId);

    if (!updatedFile) {
      return json({ error: "File not found" }, { status: 404 });
    }

    return json({ success: true, file: updatedFile });
  } catch (error) {
    console.error("Upload confirmation error:", error);
    return json({ error: "Failed to confirm upload" }, { status: 500 });
  }
};
