import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import z from "zod";
import { getPresignedUploadUrl } from "$lib/server/storage";
import { ulid } from "ulid";
import {
  createPendingFile,
  confirmFileUpload,
  verifyUserHasFileAccess,
} from "$lib/server/db/file";
import { hasWorkspaceAccess } from "$lib/server/db/membership";

export const getPresignedUploadUrlRemote = command(
  z.object({
    filename: z.string(),
    contentType: z.string().optional(),
    workspaceId: z.string(),
    size: z.number().optional(),
  }),
  async ({ filename, contentType, workspaceId, size }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    if (!filename || !workspaceId) {
      error(400, "Filename and workspaceId are required");
    }

    // Check if user has access to the workspace (owner or member)
    const hasAccess = await hasWorkspaceAccess(workspaceId, locals.user.id);
    if (!hasAccess) {
      error(403, "Forbidden");
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

    return {
      url,
      key: storageKey,
      method: "PUT",
      headers: {
        "Content-Type": finalContentType,
      },
      fileId: fileRecord.id,
    };
  },
);

export const confirmUpload = command(
  z.object({
    fileId: z.string(),
  }),
  async ({ fileId }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    if (!fileId) {
      error(400, "File ID is required");
    }

    // Verify user has access to the file's workspace (owner or member)
    const hasAccess = await verifyUserHasFileAccess(locals.user.id, fileId);
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    // Mark file as completed
    const updatedFile = await confirmFileUpload(fileId);

    if (!updatedFile) {
      error(404, "File not found");
    }

    return { success: true, file: updatedFile };
  },
);
