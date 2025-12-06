import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import z from "zod";
import { getPresignedUploadUrl } from "$lib/server/storage";
import { ulid } from "ulid";
import {
  createPendingFile,
  confirmFileUpload,
  verifyUserHasFileAccess,
  getFileById,
} from "$lib/server/db/file";
import { hasWorkspaceAccess } from "$lib/server/db/membership";
import {
  checkStorageLimit,
  checkFileSizeLimit,
  getUserPlan,
} from "$lib/server/db/usage";
import { UsageLimitExceededError } from "$lib/server/usage-limits";

export const getPresignedUploadUrlRemote = command(
  z.object({
    filename: z.string(),
    contentType: z.string().optional(),
    workspaceId: z.string(),
    size: z.number().optional(),
    dropTimestamp: z.number().optional(),
  }),
  async ({ filename, contentType, workspaceId, size, dropTimestamp }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    if (!filename || !workspaceId) {
      error(400, "Filename and workspaceId are required");
    }

    const hasAccess = await hasWorkspaceAccess(workspaceId, locals.user.id);
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    const plan = await getUserPlan(locals.user.id);
    const fileSize = size || 0;

    if (fileSize > 0) {
      try {
        checkFileSizeLimit(plan, fileSize);
        await checkStorageLimit(locals.user.id, fileSize);
      } catch (err) {
        if (err instanceof UsageLimitExceededError) {
          error(400, err.message);
        }
        throw err;
      }
    }

    console.log("Generating presigned URL for:", filename);

    const fileExtension = filename.split(".").pop();
    const storageKey = `${ulid()}.${fileExtension}`;
    const finalContentType = contentType || "application/octet-stream";

    const fileRecord = await createPendingFile(
      workspaceId,
      filename,
      storageKey,
      size || 0,
      finalContentType,
      dropTimestamp,
    );

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

    const file = await getFileById(fileId);
    if (!file) {
      error(404, "File not found");
    }

    const hasAccess = await verifyUserHasFileAccess(locals.user.id, fileId);
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    const updatedFile = await confirmFileUpload(fileId, locals.user.id);

    if (!updatedFile) {
      error(404, "File not found");
    }

    return { success: true, file: updatedFile };
  },
);
