import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPresignedUploadUrlRemote, confirmUpload } from "./upload";
import {
  createTestUser,
  createTestWorkspace,
  createTestMember,
  createTestFile,
  cleanupTestData,
} from "../../../tests/helpers/test-db";
import { createMockRequestEvent } from "../../../tests/helpers/mock-request";
import { getFileById } from "$lib/server/db/file";
import { setupAllMocks } from "../../../tests/helpers/mocks";
import {
  findActivity,
  expectActivity,
} from "../../../tests/helpers/activity-helpers";

// Mock $app/server
const mockGetRequestEvent = vi.fn();
vi.mock("$app/server", () => ({
  command: (schema: unknown, handler: unknown) => handler,
  getRequestEvent: () => mockGetRequestEvent(),
}));

// Mock S3
setupAllMocks();

describe("upload integration tests", () => {
  let testUser1: Awaited<ReturnType<typeof createTestUser>>;
  let testUser2: Awaited<ReturnType<typeof createTestUser>>;
  let userIds: string[] = [];

  beforeEach(async () => {
    testUser1 = await createTestUser({ name: "Workspace Owner" });
    testUser2 = await createTestUser({ name: "Other User" });
    userIds = [testUser1.id, testUser2.id];
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(userIds);
    vi.clearAllMocks();
  });

  // Helper functions
  const createWorkspace = () =>
    createTestWorkspace({ name: "Test Workspace", ownerId: testUser1.id });

  const expectError = async (
    fn: () => Promise<unknown>,
    expectedStatus: number,
  ) => {
    try {
      await fn();
      expect.fail("Should have thrown error");
    } catch (err) {
      expect((err as { status: number }).status).toBe(expectedStatus);
    }
  };

  describe("getPresignedUploadUrlRemote", () => {
    it("should return presigned URL and create pending file when user has workspace access", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await getPresignedUploadUrlRemote({
        filename: "test.txt",
        contentType: "text/plain",
        workspaceId: workspace.id,
        size: 1024,
      });

      expect(result.url).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.method).toBe("PUT");
      expect(result.headers["Content-Type"]).toBe("text/plain");
      expect(result.fileId).toBeDefined();

      // Verify pending file was created
      const file = await getFileById(result.fileId);
      expect(file?.status).toBe("pending");
      expect(file?.filename).toBe("test.txt");
      expect(file?.workspaceId).toBe(workspace.id);
      expect(file?.size).toBe("1024");
      expect(file?.contentType).toBe("text/plain");
    });

    it("should generate unique storage keys for different files", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result1 = await getPresignedUploadUrlRemote({
        filename: "test1.txt",
        workspaceId: workspace.id,
      });

      const result2 = await getPresignedUploadUrlRemote({
        filename: "test2.txt",
        workspaceId: workspace.id,
      });

      expect(result1.key).not.toBe(result2.key);
    });

    it("should return 400 when filename or workspaceId missing", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await expectError(
        () =>
          getPresignedUploadUrlRemote({
            filename: "",
            contentType: "text/plain",
            workspaceId: workspace.id,
            size: 1024,
          }),
        400,
      );

      await expectError(
        () =>
          getPresignedUploadUrlRemote({
            filename: "test.txt",
            contentType: "text/plain",
            workspaceId: "",
            size: 1024,
          }),
        400,
      );
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createWorkspace();
      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));

      await expectError(
        () =>
          getPresignedUploadUrlRemote({
            filename: "test.txt",
            contentType: "text/plain",
            workspaceId: workspace.id,
            size: 1024,
          }),
        403,
      );
    });
  });

  describe("confirmUpload", () => {
    it("should confirm upload and update file status when user has file access", async () => {
      const workspace = await createWorkspace();
      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const result = await confirmUpload({ fileId: file.id });

      expect(result.success).toBe(true);
      expect(result.file?.status).toBe("completed");

      const updatedFile = await getFileById(file.id);
      expect(updatedFile?.status).toBe("completed");
      expect(updatedFile?.updatedAt).toBeDefined();
    });

    it("should log file.uploaded activity", async () => {
      const workspace = await createWorkspace();
      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
        size: 1024,
        contentType: "text/plain",
      });
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await confirmUpload({ fileId: file.id });
      const activity = await findActivity(workspace.id, "file.uploaded");
      expectActivity(activity, {
        actorId: testUser1.id,
        eventType: "file.uploaded",
        entityType: "file",
        entityId: file.id,
        metadataFields: ["filename", "size", "contentType"],
      });
    });

    it("should work for both owners and members", async () => {
      const workspace = await createWorkspace();
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });
      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      const result = await confirmUpload({ fileId: file.id });
      expect(result.success).toBe(true);
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createWorkspace();
      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
      });
      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));
      await expectError(() => confirmUpload({ fileId: file.id }), 403);
    });

    it("should return 404 when file doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await expectError(
        () => confirmUpload({ fileId: "non-existent-id" }),
        404,
      );
    });
  });
});
