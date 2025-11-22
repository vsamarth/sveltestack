import { json } from "@sveltejs/kit";
import { getPresignedUploadUrl } from "$lib/server/storage";
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

    console.log("Generating presigned URL for:", filename);

    // Generate unique key
    const fileExtension = filename.split(".").pop();
    const key = `${ulid()}.${fileExtension}`;
    const finalContentType = contentType || "application/octet-stream";

    // Generate presigned URL (valid for 1 hour)
    const url = await getPresignedUploadUrl(key, finalContentType, 3600);

    console.log("Presigned URL generated:", url);

    return json({
      url,
      key,
      method: "PUT",
      headers: {
        "Content-Type": finalContentType,
      },
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
};
