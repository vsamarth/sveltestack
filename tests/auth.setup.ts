import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { TEST_USERS } from "./fixtures/test-users";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, "../playwright/.auth");

type AuthConfig = {
  label: string;
  email: string;
  password: string;
  storageFile: string;
};

const USERS_TO_AUTHENTICATE: AuthConfig[] = [
  {
    label: "verified",
    email: TEST_USERS.verified.email,
    password: TEST_USERS.verified.password,
    storageFile: path.join(authDir, "verified.json"),
  },
  {
    label: "member",
    email: TEST_USERS.member.email,
    password: TEST_USERS.member.password,
    storageFile: path.join(authDir, "member.json"),
  },
];

setup.beforeAll(async () => {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
});

for (const user of USERS_TO_AUTHENTICATE) {
  setup(`authenticate ${user.label} user`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);

    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/);

    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().storageState({ path: user.storageFile });
  });
}

