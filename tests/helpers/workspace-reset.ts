import { db } from "$lib/server/db";
import { workspace, file, user } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulid";
import {
  deleteFileFromStorage,
  uploadFile,
  initBucket,
} from "$lib/server/storage";
import { TEST_USERS } from "../fixtures/test-users";

type FileSeed = {
  filename: string;
  contentType: string;
  size: number;
};

// File content generation (reused from seed.ts)
const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8jvKQAAAAASUVORK5CYII=",
  "base64",
);

const SAMPLE_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 72 720 Td (Seeded file)
Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000061 00000 n
0000000118 00000 n
0000000215 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`,
  "utf-8",
);

function padBinaryContent(base: Buffer, targetSize: number) {
  if (targetSize === base.length) {
    return Buffer.from(base);
  }
  const padded = Buffer.alloc(targetSize);
  base.copy(padded);
  return padded;
}

function buildTextBuffer(filename: string, size: number) {
  const baseLine = `Seeded file generated for ${filename}.\n`;
  const repeatCount = Math.ceil(size / baseLine.length);
  const text = baseLine.repeat(Math.max(1, repeatCount)).slice(0, size);
  return Buffer.from(text, "utf-8");
}

function generateFileContent(
  filename: string,
  contentType: string,
  size: number,
): Buffer {
  const safeSize = Math.max(size, 256);
  const normalizedType = contentType.toLowerCase();

  if (normalizedType.includes("pdf")) {
    return padBinaryContent(SAMPLE_PDF, safeSize);
  }

  if (normalizedType.includes("png")) {
    return padBinaryContent(SAMPLE_PNG, safeSize);
  }

  if (
    normalizedType.startsWith("text/") ||
    normalizedType.includes("markdown") ||
    normalizedType.includes("plain")
  ) {
    return buildTextBuffer(filename, safeSize);
  }

  return Buffer.alloc(safeSize);
}

async function addFilesToWorkspace(workspaceId: string, files: FileSeed[]) {
  if (files.length === 0) return;

  const fileRecords = [];

  for (const fileSeed of files) {
    const extension = fileSeed.filename.includes(".")
      ? fileSeed.filename.split(".").pop()
      : undefined;
    const storageKey = `${ulid()}.${extension ?? "bin"}`;
    const body = generateFileContent(
      fileSeed.filename,
      fileSeed.contentType,
      fileSeed.size,
    );

    await uploadFile(storageKey, body, fileSeed.contentType);

    fileRecords.push({
      id: ulid(),
      workspaceId,
      filename: fileSeed.filename,
      storageKey,
      size: fileSeed.size.toString(),
      contentType: fileSeed.contentType,
      status: "completed" as const,
    });
  }

  await db.insert(file).values(fileRecords);
}

/**
 * Resets a workspace's files to the original seeded state
 * Deletes all existing files (from storage and DB) and re-adds the default files
 */
export async function resetWorkspaceFiles(workspaceName: string) {
  const verifiedUser = await db
    .select()
    .from(user)
    .where(eq(user.email, TEST_USERS.verified.email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!verifiedUser) {
    throw new Error(`Verified user not found`);
  }

  const targetWorkspace = await db
    .select()
    .from(workspace)
    .where(
      and(
        eq(workspace.ownerId, verifiedUser.id),
        eq(workspace.name, workspaceName),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!targetWorkspace) {
    throw new Error(`Workspace "${workspaceName}" not found`);
  }

  // Get all files in the workspace
  const allFiles = await db
    .select()
    .from(file)
    .where(eq(file.workspaceId, targetWorkspace.id));

  // Delete all files from storage
  for (const fileRecord of allFiles) {
    if (fileRecord.storageKey) {
      try {
        await deleteFileFromStorage(fileRecord.storageKey);
      } catch (error) {
        // Ignore errors if file doesn't exist in storage
        console.warn(
          `Failed to delete ${fileRecord.storageKey} from storage:`,
          error,
        );
      }
    }
  }

  // Delete all file records from database
  await db.delete(file).where(eq(file.workspaceId, targetWorkspace.id));

  // Re-add original files based on workspace
  await initBucket();

  if (workspaceName === TEST_USERS.verified.workspaceName) {
    // Default workspace files
    await addFilesToWorkspace(targetWorkspace.id, [
      {
        filename: "project-plan.pdf",
        contentType: "application/pdf",
        size: 256000,
      },
      {
        filename: "design-assets.png",
        contentType: "image/png",
        size: 183000,
      },
      {
        filename: "meeting-notes.txt",
        contentType: "text/plain",
        size: 4096,
      },
    ]);
  }
  // Add other workspace file sets as needed
}
