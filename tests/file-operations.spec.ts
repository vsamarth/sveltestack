import { test, expect, type Page } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { db } from "$lib/server/db";
import { workspace } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { resetWorkspaceFiles } from "./helpers/workspace-reset";
import { TEST_USERS } from "./fixtures/test-users";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

test.use({ storageState: AUTH_STATES.verified });

async function gotoFilesPage(page: Page) {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);
}

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select()
    .from(workspace)
    .where(eq(workspace.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) {
    throw new Error(`Workspace "${name}" not found`);
  }
  return record.id;
}

function fileRow(page: Page, filename: string) {
  return page.locator("tr").filter({ hasText: filename });
}

test.describe("File operations", () => {
  // Run tests serially to maintain state consistency
  // Tests share the same workspace and files, so order matters
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // await stubS3(page);
    await gotoFilesPage(page);
  });

  test("lists seeded files with metadata", async ({ page }) => {
    await expect(page.getByText("project-plan.pdf")).toBeVisible();
    await expect(page.getByText("design-assets.png")).toBeVisible();
    await expect(page.getByText("meeting-notes.txt")).toBeVisible();
  });

  test("downloads an existing file", async ({ page }) => {
    const downloadedFilePath = "project-plan.pdf";
    const row = fileRow(page, "project-plan.pdf");
    await row.getByRole("button", { name: "Actions" }).click();

    await expect(page.getByRole("menuitem", { name: "Download" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Download" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("project-plan.pdf");
    await download.saveAs(downloadedFilePath);

    try {
      if (existsSync(downloadedFilePath)) {
        await unlink(downloadedFilePath);
      }
    } catch (error) {
      // Ignore errors if file doesn't exist or can't be deleted
      console.warn(
        `Failed to delete downloaded file ${downloadedFilePath}:`,
        error,
      );
    }
  });

  test("previews an image file in the dialog", async ({ page }) => {
    const row = fileRow(page, "design-assets.png");
    await row.getByRole("button", { name: "Actions" }).click();

    await expect(page.getByRole("menuitem", { name: "Preview" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Preview" }).click();

    const dialog = page.getByRole("dialog", { name: "design-assets.png" });
    await expect(dialog).toBeVisible();

    const img = dialog.locator("img[alt='design-assets.png']");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", /.+/);

    // Close the dialog by pressing Escape (more reliable than clicking overlapping buttons)
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("renames a file via the action menu", async ({ page }) => {
    const original = "meeting-notes.txt";
    const replacement = `meeting-notes-renamed-${Date.now()}.txt`;

    const row = fileRow(page, original);
    await row.getByRole("button", { name: "Actions" }).click();

    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Rename" }).click();

    const dialog = page.getByRole("dialog", { name: "Rename File" });
    await dialog.getByPlaceholder("Enter new filename").fill(replacement);
    await dialog.getByRole("button", { name: "Rename" }).click();

    const table = page.getByRole("table");
    await expect(table.getByText(replacement)).toBeVisible();

    await expect(dialog).not.toBeVisible();

    await expect(table.getByText(original)).toHaveCount(0);
  });

  test("deletes a file after confirmation", async ({ page }) => {
    const filename = "design-assets.png";
    const row = fileRow(page, filename);

    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Actions" }).click();

    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog", { name: "Delete File" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const deleteButton = dialog.getByRole("button", { name: "Delete File" });
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await expect(deleteButton).toBeEnabled();

    await deleteButton.click();

    const table = page.getByRole("table");
    await expect(table.getByText(filename)).not.toBeVisible({ timeout: 10000 });

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("shows empty state when workspace has no files", async ({ page }) => {
    const emptyWorkspaceId = await getWorkspaceIdByName("Empty Workspace");
    await page.goto(`/dashboard/workspace/${emptyWorkspaceId}/files`);

    await expect(
      page.getByRole("heading", { name: "Nothing here yet" }),
    ).toBeVisible();
  });

  test.afterAll(async () => {
    await resetWorkspaceFiles(TEST_USERS.verified.workspaceName);
  });
});
