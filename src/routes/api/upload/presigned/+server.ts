import { json } from "@sveltejs/kit";
import { getPresignedUploadUrl, initBucket } from "$lib/server/storage";
import { ulid } from "ulid";
import type { RequestHandler } from "./$types";

/**
 * Get presigned URL for direct upload to S3/MinIO
 * POST /api/upload/presigned
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename) {
      return json({ error: "Filename is required" }, { status: 400 });
    }

    // Generate unique key
    const fileExtension = filename.split(".").pop();
    const key = `${ulid()}.${fileExtension}`;

    // Generate presigned URL (valid for 1 hour)
    const url = await getPresignedUploadUrl(key, contentType, 3600);

    return json({
      url,
      key,
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
};
