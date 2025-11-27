import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  deleteFile,
  renameFile,
  getFilePreviewUrl,
  getFileDownloadUrl,
} from "./file";
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

// Mock $app/server
const mockGetRequestEvent = vi.fn();
vi.mock("$app/server", () => ({
  command: (schema: unknown, handler: unknown) => handler,
  getRequestEvent: () => mockGetRequestEvent(),
}));

// Mock S3
setupAllMocks();

describe("file integration tests", () => {
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

  describe("deleteFile", () => {
    it("should delete file when user has workspace access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await deleteFile(file.id);

      expect(result.success).toBe(true);

      // Verify file was deleted (soft delete)
      const deletedFile = await getFileById(file.id);
      expect(deletedFile?.deletedAt).toBeDefined();
    });

    it("should return 401 when user is not authenticated", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(null));

      try {
        await deleteFile(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(401);
      }
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));

      try {
        await deleteFile(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(403);
      }
    });

    it("should return 404 when file doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await deleteFile("non-existent-id");
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(404);
      }
    });

    it("should work for both owners and members", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      // Test as member
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));

      const result = await deleteFile(file.id);
      expect(result.success).toBe(true);
    });
  });

  describe("renameFile", () => {
    it("should rename file when user has workspace access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "old-name.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await renameFile({
        fileId: file.id,
        newFilename: "new-name.txt",
      });

      expect(result.success).toBe(true);

      // Verify file was renamed
      const renamedFile = await getFileById(file.id);
      expect(renamedFile?.filename).toBe("new-name.txt");
    });

    it("should return 401 when user is not authenticated", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(null));

      try {
        await renameFile({
          fileId: file.id,
          newFilename: "new-name.txt",
        });
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(401);
      }
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));

      try {
        await renameFile({
          fileId: file.id,
          newFilename: "new-name.txt",
        });
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(403);
      }
    });

    it("should return 400 when filename is empty", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await renameFile({
          fileId: file.id,
          newFilename: "",
        });
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(400);
      }
    });

    it("should return 404 when file doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await renameFile({
          fileId: "non-existent-id",
          newFilename: "new-name.txt",
        });
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(404);
      }
    });

    it("should trim whitespace from filename", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "old-name.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await renameFile({
        fileId: file.id,
        newFilename: "  new-name.txt  ",
      });

      // Verify whitespace was trimmed
      const renamedFile = await getFileById(file.id);
      expect(renamedFile?.filename).toBe("new-name.txt");
    });
  });

  describe("getFilePreviewUrl", () => {
    it("should return presigned URL when user has access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
        contentType: "text/plain",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await getFilePreviewUrl(file.id);

      expect(result.url).toBeDefined();
      expect(result.filename).toBe("test.txt");
      expect(result.contentType).toBe("text/plain");
      expect(result.size).toBeDefined();
    });

    it("should return 401 when user is not authenticated", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(null));

      try {
        await getFilePreviewUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(401);
      }
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));

      try {
        await getFilePreviewUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(403);
      }
    });

    it("should return 410 when file is deleted", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      // Delete the file
      const { deleteFile: deleteFileDb } = await import("$lib/server/db/file");
      await deleteFileDb(file.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await getFilePreviewUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(410);
      }
    });

    it("should return 400 when file upload not completed", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await getFilePreviewUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(400);
      }
    });
  });

  describe("getFileDownloadUrl", () => {
    it("should return presigned URL when user has access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
        contentType: "text/plain",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await getFileDownloadUrl(file.id);

      expect(result.url).toBeDefined();
      expect(result.filename).toBe("test.txt");
      expect(result.contentType).toBe("text/plain");
      expect(result.size).toBeDefined();
    });

    it("should return 401 when user is not authenticated", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(null));

      try {
        await getFileDownloadUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(401);
      }
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));

      try {
        await getFileDownloadUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(403);
      }
    });

    it("should return 410 when file is deleted", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "completed",
      });

      // Delete the file
      const { deleteFile: deleteFileDb } = await import("$lib/server/db/file");
      await deleteFileDb(file.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await getFileDownloadUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(410);
      }
    });

    it("should return 400 when file upload not completed", async () => {
      const workspace = await createTestWorkspace({
        name: "Test Workspace",
        ownerId: testUser1.id,
      });

      const file = await createTestFile({
        workspaceId: workspace.id,
        filename: "test.txt",
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      try {
        await getFileDownloadUrl(file.id);
        expect.fail("Should have thrown error");
      } catch (err) {
        expect((err as { status: number }).status).toBe(400);
      }
    });
  });
});

