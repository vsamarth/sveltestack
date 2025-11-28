import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import z from "zod";
import {
  deleteFile as deleteFileDb,
  renameFile as renameFileDb,
  getFileById,
} from "$lib/server/db/file";
import { hasWorkspaceAccess } from "$lib/server/db/membership";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "$lib/server/env";
import { getPresignedDownloadUrl } from "$lib/server/storage";
import {
  logFileDeleted,
  logFileRenamed,
  logFileDownloaded,
} from "$lib/server/db/activity";

const s3Client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const deleteFile = command(z.string(), async (fileId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    const file = await getFileById(fileId);
    if (!file) {
      error(404, "File not found.");
    }

    // Check if user has access to the workspace (owner or member)
    const hasAccess = await hasWorkspaceAccess(
      file.workspaceId,
      locals.user.id,
    );
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    await deleteFileDb(fileId);

    // Log activity
    await logFileDeleted(
      file.workspaceId,
      locals.user.id,
      fileId,
      file.filename,
    );

    return { success: true };
  } catch (err) {
    console.error("Delete file error:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to delete file");
  }
});

export const renameFile = command(
  z.object({
    fileId: z.string(),
    newFilename: z.string(),
  }),
  async ({ fileId, newFilename }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    if (!fileId) {
      error(400, "File ID is required");
    }

    if (!newFilename || newFilename.trim() === "") {
      error(400, "New filename is required");
    }

    try {
      // Get file and verify workspace access
      const file = await getFileById(fileId);
      if (!file) {
        error(404, "File not found");
      }

      // Check if user has access to the workspace (owner or member)
      const hasAccess = await hasWorkspaceAccess(
        file.workspaceId,
        locals.user.id,
      );
      if (!hasAccess) {
        error(403, "Forbidden");
      }

      await renameFileDb(fileId, newFilename.trim());

      // Log activity
      await logFileRenamed(
        file.workspaceId,
        locals.user.id,
        fileId,
        file.filename,
        newFilename.trim(),
      );

      return { success: true };
    } catch (err) {
      console.error("Rename file error:", err);
      if (err && (err as { status: number }).status) throw err;
      error(500, "Failed to rename file");
    }
  },
);

export const getFilePreviewUrl = command(z.string(), async (fileId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    // Get file from database
    const file = await getFileById(fileId);
    if (!file) {
      error(404, "File not found");
    }

    // Check if user has access to the workspace (owner or member)
    const hasAccess = await hasWorkspaceAccess(
      file.workspaceId,
      locals.user.id,
    );
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    // Check if file is deleted
    if (file.deletedAt) {
      error(410, "File has been deleted");
    }

    // Check if file upload is completed
    if (file.status !== "completed") {
      error(400, "File upload not completed");
    }

    // Generate presigned URL for inline display (no Content-Disposition header)
    const getObjectCommand = new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: file.storageKey,
      ResponseContentType: file.contentType || undefined,
    });

    const previewUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600,
    });

    // We typically don't log "preview" as "download", or maybe we do?
    // User asked for "file.downloaded" event.
    // Preview is essentially a download.
    // I'll log it as downloaded for now, or skip if it's just a preview.
    // The event list had "file.downloaded".
    // Let's log it.
    // Wait, preview might be triggered often. "Downloaded" usually implies "Save As".
    // The `getFileDownloadUrl` is definitely for download.
    // `getFilePreviewUrl` is for viewing.
    // I'll skip logging for preview to avoid noise, and only log explicit download.

    return {
      url: previewUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    };
  } catch (err) {
    console.error("Preview URL generation error:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to generate preview URL");
  }
});

export const getFileDownloadUrl = command(z.string(), async (fileId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    // Get file from database
    const file = await getFileById(fileId);
    if (!file) {
      error(404, "File not found");
    }

    // Check if user has access to the workspace (owner or member)
    const hasAccess = await hasWorkspaceAccess(
      file.workspaceId,
      locals.user.id,
    );
    if (!hasAccess) {
      error(403, "Forbidden");
    }

    // Check if file is deleted
    if (file.deletedAt) {
      error(410, "File has been deleted");
    }

    // Check if file upload is completed
    if (file.status !== "completed") {
      error(400, "File upload not completed");
    }

    // Generate presigned download URL (valid for 1 hour)
    const downloadUrl = await getPresignedDownloadUrl(
      file.storageKey,
      file.filename,
      3600,
    );

    // Log activity
    await logFileDownloaded(
      file.workspaceId,
      locals.user.id,
      fileId,
      file.filename,
    );

    return {
      url: downloadUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    };
  } catch (err) {
    console.error("Download URL generation error:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to generate download URL");
  }
});
