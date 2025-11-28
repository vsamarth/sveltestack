import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures/test-users";

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

const TEST_USER = TEST_USERS.verified;

test.describe("Authentication", () => {
  test.describe("Sign In", () => {
    test("should sign in with valid credentials and redirect to dashboard", async ({
      page,
    }) => {
      await page.goto("/login");

      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill(TEST_USER.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/dashboard/);

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByText(/incorrect|invalid|wrong/i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Sign Out", () => {
    test("should sign out and redirect to sign in page", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill(TEST_USER.password);

      await Promise.all([
        page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        page.getByRole("button", { name: "Sign in" }).click(),
      ]);

      await page
        .getByRole("button", { name: new RegExp(TEST_USER.name, "i") })
        .click();

      const signOutButton = page.getByRole("menuitem", { name: "Sign out" });
      await expect(signOutButton).toBeVisible({ timeout: 5000 });

      await signOutButton.click();

      await expect(page).toHaveURL("/login", { timeout: 10000 });
    });
  });

  test.describe("Forgot Password", () => {
    test("should show success message after submitting forgot password form", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      await page.getByLabel("Email").fill(TEST_USER.email);

      await page.getByRole("button", { name: "Send reset link" }).click();

      await expect(page.getByText("Check your email")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole("alert")).toBeVisible();
    });
  });

  test.describe("Auth Page Navigation", () => {
    test("should navigate from sign in to register page", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: "Sign up" }).click();

      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("heading", { name: "Create your account" }),
      ).toBeVisible();
    });

    test("should navigate from register to sign in page", async ({ page }) => {
      await page.goto("/register");

      await page.getByRole("link", { name: "Sign in" }).click();

      await expect(page).toHaveURL("/login");
      await expect(
        page.getByRole("heading", { name: /Sign in/i }),
      ).toBeVisible();
    });

    test("should navigate from sign in to forgot password and back", async ({
      page,
    }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: "Forgot password?" }).click();

      await expect(page).toHaveURL("/forgot-password");
      await expect(
        page.getByRole("heading", { name: "Reset your password" }),
      ).toBeVisible();

      await page.getByRole("link", { name: "Back" }).click();

      await expect(page).toHaveURL("/login");
    });
  });
});
