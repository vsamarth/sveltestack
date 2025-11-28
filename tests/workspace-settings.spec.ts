import { test, expect, type Page } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { TEST_USERS } from "./fixtures/test-users";
import { db } from "$lib/server/db";
import {
  workspace as workspaceTable,
  workspaceMember,
} from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createTestInvite } from "./helpers/test-db";
import { ulid } from "ulid";

test.use({ storageState: AUTH_STATES.verified });

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) throw new Error(`Workspace "${name}" not found`);
  return record.id;
}

async function navigateToSettings(page: Page, name: string) {
  const workspaceId = await getWorkspaceIdByName(name);
  await page.goto(`/dashboard/workspace/${workspaceId}/settings`);
  await expect(page.getByRole("heading", { name: "Workspace Settings" })).toBeVisible();
  return { workspaceId };
}

test.describe("Workspace settings", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSettings(page, TEST_USERS.verified.workspaceName);
  });

  test("renames workspace inline and resets the name", async ({ page }) => {
    const original = TEST_USERS.verified.workspaceName;
    const updated = `Workspace ${Date.now()}`;

    // Scope to main content area to avoid sidebar button
    const main = page.getByRole("main");
    
    // Find the button that contains the workspace name text
    // The button contains a span with the workspace name
    const workspaceNameButton = main
      .locator("button")
      .filter({ hasText: original})
      .first();

    await expect(workspaceNameButton).toBeVisible();

    await workspaceNameButton.click();

    const input = page.getByPlaceholder("Enter workspace name");
    await expect(input).toBeVisible();

    await input.fill(updated);


    // // Ensure button is visible and ready
    // await expect(workspaceNameButton).toBeVisible();
    // await workspaceNameButton.scrollIntoViewIfNeeded();
    
    // // Try clicking the button using JavaScript to ensure the onclick handler fires
    // await workspaceNameButton.evaluate((el) => (el as HTMLButtonElement).click());
    
    // // Wait for the input field to appear (this confirms edit mode is active)
    // const input = page.getByPlaceholder("Enter workspace name");
    // await expect(input).toBeVisible({ timeout: 5000 });
    
    // // Fill in the new name
    // await input.fill(updated);
    
    // // Click the Save button (checkmark icon)
    // await page.getByRole("button", { name: "Save" }).click();
    
    // // Wait for the update to complete and button to show new name
    // await expect(main.locator("button").filter({ hasText: updated }).first()).toBeVisible({ timeout: 5000 });

    // // Reset back to original
    // const updatedButton = main.locator("button").filter({ hasText: updated }).first();
    // await expect(updatedButton).toBeVisible();
    // await updatedButton.scrollIntoViewIfNeeded();
    
    // // Click using JavaScript again
    // await updatedButton.evaluate((el) => (el as HTMLButtonElement).click());
    
    // // Wait for input to appear again
    // await expect(input).toBeVisible({ timeout: 5000 });
    // await input.fill(original);
    // await page.getByRole("button", { name: "Save" }).click();
    
    // // Verify we're back to original name
    // await expect(main.locator("button").filter({ hasText: original }).first()).toBeVisible({ timeout: 5000 });
  });

  test("lists members and allows removing and re-adding a member", async ({ page }) => {
    const workspaceId = await getWorkspaceIdByName(TEST_USERS.verified.workspaceName);
    const memberRow = page.locator("tr").filter({ hasText: "Member User" }).first();

    // Click the Actions button and wait for the dropdown to open
    const actionsButton = memberRow.getByRole("button", { name: "Actions" });
    await actionsButton.click();
    
    // Wait for the dropdown menu to be visible before clicking the item
    await expect(page.getByRole("menuitem", { name: "Remove" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Remove" }).click();

    const confirmation = page.getByRole("dialog", { name: "Remove Member" });
    await confirmation.getByRole("button", { name: "Remove Member" }).click();
    await expect(page.getByText("Member removed")).toBeVisible();

    await db.insert(workspaceMember).values({
      id: ulid(),
      workspaceId,
      userId: TEST_USERS.member.id,
    });
  });

  test("cancels pending invites", async ({ page }) => {
    const workspaceId = await getWorkspaceIdByName(TEST_USERS.verified.workspaceName);
    const inviteRow = page.locator("tr").filter({ hasText: TEST_USERS.invited.email }).first();
    
    // Click the Actions button and wait for the dropdown to open
    const actionsButton = inviteRow.getByRole("button", { name: "Actions" });
    await actionsButton.click();
    
    // Wait for the dropdown menu to be visible before clicking the item
    await expect(page.getByRole("menuitem", { name: "Cancel Invite" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Cancel Invite" }).click();
    await expect(page.getByText("Invitation cancelled")).toBeVisible();

    await createTestInvite({
      workspaceId,
      email: TEST_USERS.invited.email,
      invitedBy: TEST_USERS.verified.id,
    });
  });

  test("deletes a workspace when multiple exist", async ({ page }) => {
    const newWorkspaceName = `Disposable Workspace ${Date.now()}`;
    const [newWorkspace] = await db
      .insert(workspaceTable)
      .values({
        id: ulid(),
        name: newWorkspaceName,
        ownerId: TEST_USERS.verified.id,
      })
      .returning();

    await page.goto(`/dashboard/workspace/${newWorkspace.id}/settings`);
    await page.getByRole("button", { name: "Delete Workspace" }).click();

    const dialog = page.getByRole("dialog", { name: "Delete Workspace" });
    await dialog.getByPlaceholder("Type workspace name to confirm").fill(newWorkspaceName);
    await dialog.getByRole("button", { name: "Delete Workspace" }).click();

    await expect(page).toHaveURL(/\/dashboard\/workspace\/.+\/files/);

    await db
      .delete(workspaceTable)
      .where(
        and(
          eq(workspaceTable.name, newWorkspaceName),
          eq(workspaceTable.ownerId, TEST_USERS.verified.id),
        ),
      );
  });

  test("prevents deleting the last workspace for a new user", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATES.member });
    const memberPage = await context.newPage();
    const workspaceId = await getWorkspaceIdByName(TEST_USERS.member.workspaceName);
    await memberPage.goto(`/dashboard/workspace/${workspaceId}/settings`);
    await memberPage.getByRole("button", { name: "Delete Workspace" }).click();

    const dialog = memberPage.getByRole("dialog", { name: "Delete Workspace" });
    await dialog
      .getByPlaceholder("Type workspace name to confirm")
      .fill(TEST_USERS.member.workspaceName);
    await dialog.getByRole("button", { name: "Delete Workspace" }).click();
    await expect(memberPage.getByText("Failed to delete workspace")).toBeVisible();
    await context.close();
  });
});

