import { test, expect } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { TEST_USERS } from "./fixtures/test-users";
import { db } from "$lib/server/db";
import {
  workspaceInvite,
  workspaceMember,
  workspace as workspaceTable,
} from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import {
  createTestInvite,
  createTestUser,
  cleanupTestData,
} from "./helpers/test-db";

test.use({ storageState: AUTH_STATES.verified });

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(eq(workspaceTable.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) throw new Error(`Workspace "${name}" not found`);
  return record.id;
}

async function deleteInviteByEmail(email: string) {
  await db.delete(workspaceInvite).where(eq(workspaceInvite.email, email));
}

test.describe("Invite flow", () => {
  test("owner sends invite via dialog and sees it in pending list", async ({
    page,
  }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const inviteEmail = `invitee-${Date.now()}@example.com`;
    await page.goto(`/dashboard/workspace/${workspaceId}/settings`);

    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Invite Member" }).click();

    const dialog = page.getByRole("dialog", { name: "Invite Member" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const emailInput = dialog.getByLabel("Email");
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toBeEnabled();

    await emailInput.fill(inviteEmail);
    await dialog.getByRole("button", { name: "Send Invitation" }).click();

    await expect(page.getByText("Invitation sent")).toBeVisible();

    await expect(dialog).not.toBeVisible();

    // Wait for the pending invites section heading to appear (if it wasn't already visible)
    // This ensures the section has rendered
    const pendingInvitesHeading = page.getByRole("heading", {
      name: "Pending Invites",
    });
    await expect(pendingInvitesHeading).toBeVisible({ timeout: 5000 });

    // Use a more specific locator to avoid matching the toast message
    const inviteRow = page
      .locator("tbody tr")
      .filter({ hasText: inviteEmail })
      .first();
    await expect(inviteRow).toBeVisible({ timeout: 10000 });

    const emailCell = inviteRow.locator("td").filter({ hasText: inviteEmail });
    await expect(
      emailCell.getByText(inviteEmail, { exact: true }),
    ).toBeVisible();

    await deleteInviteByEmail(inviteEmail);
  });

  test("invitee accepts invitation and appears in member list", async ({
    page,
    browser,
  }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const inviteeEmail = `accepted-${Date.now()}@example.com`;
    const invitee = await createTestUser({
      email: inviteeEmail,
      name: "Invitee User",
    });

    const invite = await createTestInvite({
      workspaceId,
      email: inviteeEmail,
      invitedBy: TEST_USERS.verified.id,
    });

    const context = await browser.newContext();
    // Clear cookies to sign out
    context.clearCookies();
    const inviteePage = await context.newPage();

    await inviteePage.goto("/login");

    await expect(inviteePage.getByLabel("Email")).toBeVisible({
      timeout: 10000,
    });
    await inviteePage.getByLabel("Email").fill(inviteeEmail);
    await inviteePage.getByLabel("Password").fill("password123");
    await Promise.all([
      inviteePage.waitForURL(/\/dashboard/),
      inviteePage.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await inviteePage.goto(`/invite/${invite.token}`);
    await inviteePage
      .getByRole("button", { name: "Accept Invitation" })
      .click();
    await inviteePage.waitForURL(/\/dashboard\/workspace\/.+\/files/);

    await page.goto(`/dashboard/workspace/${workspaceId}/settings`);

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    const memberRow = page
      .locator("tbody tr")
      .filter({ hasText: invitee.name })
      .first();
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    await expect(
      memberRow.getByText(invitee.name, { exact: true }),
    ).toBeVisible();

    await expect(
      memberRow.getByText(inviteeEmail, { exact: true }),
    ).toBeVisible();

    await context.close();
    await db
      .delete(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, invitee.id),
        ),
      );
    await deleteInviteByEmail(inviteeEmail);
    await cleanupTestData([invitee.id]);
  });
});
