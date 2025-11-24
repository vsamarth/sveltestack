import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getFileById } from "$lib/server/db/file";
import { getWorkspaceById } from "$lib/server/db/workspace";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "$lib/server/env";

const s3Client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Get presigned preview URL for a file (inline display, no download)
 * GET /api/workspace/[id]/files/[fileId]/preview
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

    // Generate presigned URL for inline display (no Content-Disposition header)
    const command = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: file.storageKey,
      ResponseContentType: file.contentType || undefined,
    });

    const previewUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return json({
      url: previewUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error("Preview URL generation error:", error);
    return json({ error: "Failed to generate preview URL" }, { status: 500 });
  }
};
