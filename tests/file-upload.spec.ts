import { test, expect, type Page } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { db } from "$lib/server/db";
import { file, workspace, user } from "$lib/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { deleteFileFromStorage } from "$lib/server/storage";
import { TEST_USERS } from "./fixtures/test-users";
import { resetWorkspaceFiles } from "./helpers/workspace-reset";

test.use({ storageState: AUTH_STATES.verified });

async function gotoDefaultWorkspace(page: Page) {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);
}

function makeFile(name: string, content: string, mimeType = "text/plain") {
  return {
    name,
    mimeType,
    buffer: Buffer.from(content),
  };
}

function fileRow(page: Page, filename: string) {
  return page.locator("tr").filter({ hasText: filename });
}

const addFilesInputSelector = '[data-testid="add-files-input"]';

test.describe("File upload", () => {
  // Run tests serially to maintain state consistency
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await gotoDefaultWorkspace(page);
  });

  test("uploads a single file via Add Files button", async ({ page }) => {
    const filename = `single-upload-${Date.now()}.txt`;

    await page.waitForLoadState("networkidle");

    const fileInput = page.locator(addFilesInputSelector);
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles(makeFile(filename, "Hello world"));

    // Wait for upload to complete by checking for file in table (more reliable than toast)
    const table = page.getByRole("table");
    await expect(table.getByText(filename)).toBeVisible({ timeout: 15000 });

    const row = fileRow(page, filename);
    await expect(row).toBeVisible();
  });

  test("uploads multiple files in one selection", async ({ page }) => {
    const fileA = `multi-a-${Date.now()}.md`;
    const fileB = `multi-b-${Date.now()}.md`;

    await page.waitForLoadState("networkidle");

    const fileInput = page.locator(addFilesInputSelector);
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles([
      makeFile(fileA, "# Notes"),
      makeFile(fileB, "More notes"),
    ]);

    // Wait for uploads to complete by checking for files in table (more reliable than toast)
    // Multiple toasts appear for multiple files, so checking table is better
    const table = page.getByRole("table");

    // Wait for both files to appear - check both in parallel to avoid race conditions
    await Promise.all([
      expect(table.getByText(fileA)).toBeVisible({ timeout: 15000 }),
      expect(table.getByText(fileB)).toBeVisible({ timeout: 15000 }),
    ]);

    await expect(fileRow(page, fileA)).toBeVisible();
    await expect(fileRow(page, fileB)).toBeVisible();
  });

  test("supports drag and drop anywhere in the dropzone", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const dropzone = page.getByTestId("file-dropzone");
    const overlay = page.getByTestId("file-dropzone-overlay");

    // useDropzone from @uppy/svelte requires proper drag events with dataTransfer
    // Simulate drag over by dispatching events with proper dataTransfer properties
    await dropzone.evaluate((element) => {
      const dt = new DataTransfer();
      dt.effectAllowed = "all";
      dt.dropEffect = "copy";
      // Add a dummy file to make it more realistic
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      dt.items.add(file);

      const event = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      element.dispatchEvent(event);
    });

    // Wait for the overlay to appear (Svelte state update might take a moment)
    await expect(overlay).toBeVisible({ timeout: 5000 });

    await dropzone.evaluate((element) => {
      const dt = new DataTransfer();
      dt.effectAllowed = "all";
      dt.dropEffect = "none";

      const event = new DragEvent("dragleave", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      element.dispatchEvent(event);
    });

    await expect(overlay).toBeHidden({ timeout: 5000 });

    const filename = `drag-upload-${Date.now()}.txt`;
    const fileInput = dropzone.locator('input[type="file"]').first();
    await fileInput.setInputFiles(makeFile(filename, "drag drop"));

    // Wait for upload to complete by checking for file in table (more reliable than toast)
    const table = page.getByRole("table");
    await expect(table.getByText(filename)).toBeVisible({ timeout: 15000 });
    await expect(fileRow(page, filename)).toBeVisible();
  });

  test("prevents uploading files larger than 10MB", async ({ page }) => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, "a");
    const fileInput = page.locator(addFilesInputSelector);

    await fileInput.setInputFiles({
      name: `huge-${Date.now()}.bin`,
      mimeType: "application/octet-stream",
      buffer: largeBuffer,
    });

    await expect(page.getByText("Upload restriction")).toBeVisible({
      timeout: 5000,
    });
  });

  test("prevents uploading more than five files at once", async ({ page }) => {
    const files = Array.from({ length: 6 }).map((_, index) =>
      makeFile(`limit-${index}-${Date.now()}.txt`, "content"),
    );
    const fileInput = page.locator(addFilesInputSelector);

    await fileInput.setInputFiles(files);

    await expect(page.getByText("Upload restriction")).toBeVisible({
      timeout: 5000,
    });
  });

  test.afterAll(async () => {
    // Clean up test files uploaded during tests
    const verifiedUser = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_USERS.verified.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!verifiedUser) return;

    const defaultWorkspace = await db
      .select()
      .from(workspace)
      .where(
        and(
          eq(workspace.ownerId, verifiedUser.id),
          eq(workspace.name, TEST_USERS.verified.workspaceName),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!defaultWorkspace) return;

    // Find and delete test files (files with test prefixes)
    const testFilePatterns = [
      "single-upload-%",
      "multi-a-%",
      "multi-b-%",
      "drag-upload-%",
      "huge-%",
      "limit-%",
    ];

    for (const pattern of testFilePatterns) {
      const testFiles = await db
        .select()
        .from(file)
        .where(
          and(
            eq(file.workspaceId, defaultWorkspace.id),
            like(file.filename, pattern),
          ),
        );

      for (const fileRecord of testFiles) {
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

      await db
        .delete(file)
        .where(
          and(
            eq(file.workspaceId, defaultWorkspace.id),
            like(file.filename, pattern),
          ),
        );
    }

    // Reset workspace to seeded state after cleaning up test files
    await resetWorkspaceFiles(TEST_USERS.verified.workspaceName);
  });
});
