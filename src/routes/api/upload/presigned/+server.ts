import { json } from "@sveltejs/kit";
import { getPresignedUploadUrl } from "$lib/server/storage";
import { ulid } from "ulid";
import type { RequestHandler } from "./$types";
import { createPendingFile } from "$lib/server/db/file";
import { getWorkspaceById } from "$lib/server/db/workspace";

/**
 * Get presigned URL for direct upload to S3/MinIO
 * POST /api/upload/presigned
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, workspaceId, size } = body;

    if (!filename || !workspaceId) {
      return json(
        { error: "Filename and workspaceId are required" },
        { status: 400 },
      );
    }

    // Verify user owns workspace
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace || workspace.ownerId !== locals.user.id) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Generating presigned URL for:", filename);

    // Generate unique storage key
    const fileExtension = filename.split(".").pop();
    const storageKey = `${ulid()}.${fileExtension}`;
    const finalContentType = contentType || "application/octet-stream";

    // Create pending file record in database
    const fileRecord = await createPendingFile(
      workspaceId,
      filename,
      storageKey,
      size || 0,
      finalContentType,
    );

    // Generate presigned URL (valid for 1 hour)
    const url = await getPresignedUploadUrl(storageKey, finalContentType, 3600);

    console.log("Presigned URL generated:", url);

    return json({
      url,
      key: storageKey,
      method: "PUT",
      headers: {
        "Content-Type": finalContentType,
      },
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
};
