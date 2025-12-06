import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { db } from "$lib/server/db";
import { user, file } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import {
  createTestUser,
  createTestWorkspace,
  createTestFile,
  cleanupTestData,
} from "../../../tests/helpers/test-db";
import { refreshUserUsage } from "$lib/server/db/user-usage";
import { getUserStorageUsage } from "$lib/server/db/user-usage";
import {
  checkStorageLimit,
  checkFileSizeLimit,
  getUserPlan,
} from "$lib/server/db/usage";
import { PLAN_LIMITS, UsageLimitExceededError } from "$lib/server/usage-limits";
import { deleteFileFromStorage } from "$lib/server/storage";

describe("Usage Limits", () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeEach(async () => {
    const testUser = await createTestUser({
      email: `limit-test-${Date.now()}@example.com`,
      name: "Limit Test User",
    });
    testUserId = testUser.id;

    const testWorkspace = await createTestWorkspace({
      name: "Limit Test Workspace",
      ownerId: testUserId,
    });
    testWorkspaceId = testWorkspace.id;

    await refreshUserUsage();
  });

  afterEach(async () => {
    if (testWorkspaceId) {
      const files = await db
        .select()
        .from(file)
        .where(eq(file.workspaceId, testWorkspaceId));

      for (const fileRecord of files) {
        if (fileRecord.storageKey) {
          try {
            await deleteFileFromStorage(fileRecord.storageKey);
          } catch {
            // Ignore errors if file doesn't exist
          }
        }
      }

      await db.delete(file).where(eq(file.workspaceId, testWorkspaceId));
    }

    if (testUserId) {
      await cleanupTestData([testUserId]);
    }
  });

  describe("Storage Limits", () => {
    it("allows uploads within free plan storage limit", async () => {
      const fileSize = 5 * 1024 * 1024; // 5 MB

      await expect(
        checkStorageLimit(testUserId, fileSize),
      ).resolves.not.toThrow();
    });

    it("prevents uploads that exceed free plan storage limit", async () => {
      const existingUsage = 45 * 1024 * 1024; // 45 MB already used
      const fileSize = 10 * 1024 * 1024; // 10 MB file

      // Create files to reach near the limit
      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "existing-file.txt",
        size: existingUsage,
        status: "completed",
      });

      await refreshUserUsage();

      const currentUsage = await getUserStorageUsage(testUserId);
      expect(currentUsage).toBeGreaterThanOrEqual(existingUsage);

      // Try to upload a file that would exceed the limit
      await expect(checkStorageLimit(testUserId, fileSize)).rejects.toThrow(
        UsageLimitExceededError,
      );
    });

    it("prevents uploads exactly at the storage limit", async () => {
      const fileSize = PLAN_LIMITS.free.storageBytes; // Exactly at the limit

      await expect(checkStorageLimit(testUserId, fileSize)).rejects.toThrow(
        UsageLimitExceededError,
      );
    });

    it("prevents uploads that would exceed limit by 1 byte", async () => {
      const freeLimit = PLAN_LIMITS.free.storageBytes;
      const existingUsage = freeLimit - 1000; // 1 KB under limit
      const fileSize = 1001; // 1 KB + 1 byte

      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "near-limit.txt",
        size: existingUsage,
        status: "completed",
      });

      await refreshUserUsage();

      await expect(checkStorageLimit(testUserId, fileSize)).rejects.toThrow(
        UsageLimitExceededError,
      );
    });

    it("provides user-friendly error message when storage limit exceeded", async () => {
      const existingUsage = 45 * 1024 * 1024; // 45 MB
      const fileSize = 10 * 1024 * 1024; // 10 MB

      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "existing.txt",
        size: existingUsage,
        status: "completed",
      });

      await refreshUserUsage();

      let errorThrown = false;
      try {
        await checkStorageLimit(testUserId, fileSize);
      } catch (error: unknown) {
        errorThrown = true;
        expect(error).toBeInstanceOf(UsageLimitExceededError);
        if (error instanceof UsageLimitExceededError) {
          expect(error.message).toContain("Storage limit exceeded");
          expect(error.message).toContain("Upgrade to Pro");
          expect(error.limitType).toBe("storage");
          expect(error.currentUsage).toBeDefined();
          expect(error.limit).toBe(PLAN_LIMITS.free.storageBytes);
        }
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("File Size Limits", () => {
    it("allows files within free plan file size limit (10MB)", async () => {
      const fileSize = 9 * 1024 * 1024; // 9 MB
      const plan = await getUserPlan(testUserId);

      expect(() => checkFileSizeLimit(plan, fileSize)).not.toThrow();
    });

    it("allows files exactly at free plan file size limit (10MB)", async () => {
      const fileSize = PLAN_LIMITS.free.maxFileSizeBytes; // Exactly 10 MB
      const plan = await getUserPlan(testUserId);

      expect(() => checkFileSizeLimit(plan, fileSize)).not.toThrow();
    });

    it("prevents files exceeding free plan file size limit", async () => {
      const fileSize = PLAN_LIMITS.free.maxFileSizeBytes + 1; // 10 MB + 1 byte
      const plan = await getUserPlan(testUserId);

      expect(() => checkFileSizeLimit(plan, fileSize)).toThrow(
        UsageLimitExceededError,
      );
    });

    it("provides user-friendly error message for file size limit", async () => {
      const fileSize = PLAN_LIMITS.free.maxFileSizeBytes + 1024; // Over limit
      const plan = await getUserPlan(testUserId);

      let errorThrown = false;
      try {
        checkFileSizeLimit(plan, fileSize);
      } catch (error: unknown) {
        errorThrown = true;
        expect(error).toBeInstanceOf(UsageLimitExceededError);
        if (error instanceof UsageLimitExceededError) {
          expect(error.message).toContain("File size exceeds limit");
          expect(error.message).toContain("Maximum file size");
          expect(error.limitType).toBe("file_size");
          expect(error.currentUsage).toBe(fileSize);
          expect(error.limit).toBe(PLAN_LIMITS.free.maxFileSizeBytes);
        }
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("Pro Plan Limits", () => {
    beforeEach(async () => {
      // Update user to pro plan
      await db.update(user).set({ plan: "pro" }).where(eq(user.id, testUserId));
    });

    it("allows larger files on pro plan (100MB limit)", async () => {
      const fileSize = 50 * 1024 * 1024; // 50 MB
      const plan = await getUserPlan(testUserId);
      expect(plan).toBe("pro");

      expect(() => checkFileSizeLimit(plan, fileSize)).not.toThrow();
    });

    it("allows files at pro plan file size limit (100MB)", async () => {
      const fileSize = PLAN_LIMITS.pro.maxFileSizeBytes; // Exactly 100 MB
      const plan = await getUserPlan(testUserId);

      expect(() => checkFileSizeLimit(plan, fileSize)).not.toThrow();
    });

    it("prevents files exceeding pro plan file size limit", async () => {
      const fileSize = PLAN_LIMITS.pro.maxFileSizeBytes + 1; // 100 MB + 1 byte
      const plan = await getUserPlan(testUserId);

      expect(() => checkFileSizeLimit(plan, fileSize)).toThrow(
        UsageLimitExceededError,
      );
    });

    it("allows more storage on pro plan (10GB limit)", async () => {
      const fileSize = 5 * 1024 * 1024 * 1024; // 5 GB

      await expect(
        checkStorageLimit(testUserId, fileSize),
      ).resolves.not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("handles zero-byte files", async () => {
      await expect(checkStorageLimit(testUserId, 0)).resolves.not.toThrow();
    });

    it("correctly calculates storage after multiple uploads", async () => {
      const file1Size = 10 * 1024 * 1024; // 10 MB
      const file2Size = 15 * 1024 * 1024; // 15 MB
      const file3Size = 20 * 1024 * 1024; // 20 MB

      // Check first file passes
      await expect(
        checkStorageLimit(testUserId, file1Size),
      ).resolves.not.toThrow();

      // Create first file to simulate usage
      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "file1.txt",
        size: file1Size,
        status: "completed",
      });

      await refreshUserUsage();

      // Check second file passes
      await expect(
        checkStorageLimit(testUserId, file2Size),
      ).resolves.not.toThrow();

      // Create second file to simulate usage
      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "file2.txt",
        size: file2Size,
        status: "completed",
      });

      await refreshUserUsage();

      const currentUsage = await getUserStorageUsage(testUserId);
      expect(currentUsage).toBeGreaterThanOrEqual(file1Size + file2Size);

      // Try to upload third file that would exceed limit
      const totalAfter = currentUsage + file3Size;
      if (totalAfter > PLAN_LIMITS.free.storageBytes) {
        await expect(checkStorageLimit(testUserId, file3Size)).rejects.toThrow(
          UsageLimitExceededError,
        );
      }
    });

    it("storage calculation excludes pending files", async () => {
      const fileSize = 10 * 1024 * 1024; // 10 MB

      // Create a pending file (shouldn't count toward storage)
      await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "pending.txt",
        size: fileSize,
        status: "pending",
      });

      await refreshUserUsage();

      const currentUsage = await getUserStorageUsage(testUserId);
      expect(currentUsage).toBe(0); // Pending files shouldn't count

      // Should be able to upload another file
      await expect(
        checkStorageLimit(testUserId, fileSize),
      ).resolves.not.toThrow();
    });

    it("storage calculation excludes deleted files", async () => {
      const fileSize = 10 * 1024 * 1024; // 10 MB

      // Create and then "delete" a file
      const deletedFile = await createTestFile({
        workspaceId: testWorkspaceId,
        filename: "deleted.txt",
        size: fileSize,
        status: "completed",
      });

      await db
        .update(file)
        .set({ deletedAt: new Date() })
        .where(eq(file.id, deletedFile.id));

      await refreshUserUsage();

      const currentUsage = await getUserStorageUsage(testUserId);
      expect(currentUsage).toBe(0); // Deleted files shouldn't count

      // Should be able to upload another file
      await expect(
        checkStorageLimit(testUserId, fileSize),
      ).resolves.not.toThrow();
    });
  });
});
