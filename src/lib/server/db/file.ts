import { db } from "./index";
import { file, workspace } from "./schema";
import { eq, and, isNull } from "drizzle-orm";

export async function createPendingFile(
  workspaceId: string,
  filename: string,
  storageKey: string,
  size: number,
  contentType: string,
) {
  const [newFile] = await db
    .insert(file)
    .values({
      workspaceId,
      filename,
      storageKey,
      size: size.toString(),
      contentType,
      status: "pending",
    })
    .returning();
  return newFile;
}

export async function confirmFileUpload(fileId: string) {
  const [updated] = await db
    .update(file)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(file.id, fileId))
    .returning();
  return updated;
}

export async function markFileAsFailed(fileId: string) {
  const [updated] = await db
    .update(file)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(file.id, fileId))
    .returning();
  return updated;
}

export async function getWorkspaceFiles(
  workspaceId: string,
  includeDeleted = false,
) {
  const conditions = includeDeleted
    ? [eq(file.workspaceId, workspaceId), eq(file.status, "completed")]
    : [
        eq(file.workspaceId, workspaceId),
        eq(file.status, "completed"),
        isNull(file.deletedAt),
      ];

  return await db
    .select()
    .from(file)
    .where(and(...conditions))
    .orderBy(file.createdAt);
}

export async function getFileById(fileId: string) {
  const [result] = await db.select().from(file).where(eq(file.id, fileId));
  return result;
}

export async function deleteFile(fileId: string) {
  const [deleted] = await db
    .update(file)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(file.id, fileId))
    .returning();
  return deleted;
}

export async function renameFile(fileId: string, newFilename: string) {
  const [updated] = await db
    .update(file)
    .set({ filename: newFilename, updatedAt: new Date() })
    .where(eq(file.id, fileId))
    .returning();
  return updated;
}

export async function verifyUserOwnsFile(
  userId: string,
  fileId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: file.id })
    .from(file)
    .innerJoin(workspace, eq(file.workspaceId, workspace.id))
    .where(and(eq(file.id, fileId), eq(workspace.ownerId, userId)))
    .limit(1);

  return result.length > 0;
}

export async function verifyUserHasFileAccess(
  userId: string,
  fileId: string,
): Promise<boolean> {
  const file = await getFileById(fileId);
  if (!file) return false;

  const { hasWorkspaceAccess } = await import("./membership");
  return hasWorkspaceAccess(file.workspaceId, userId);
}
