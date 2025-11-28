import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isCI = !!process.env.CI;
const authFile = path.join(__dirname, "playwright/.auth/verified.json");

const browserProjects = isCI
  ? [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"], storageState: authFile },
        dependencies: ["setup"],
      },
      {
        name: "firefox",
        use: { ...devices["Desktop Firefox"], storageState: authFile },
        dependencies: ["setup"],
      },
      {
        name: "webkit",
        use: { ...devices["Desktop Safari"], storageState: authFile },
        dependencies: ["setup"],
      },
    ]
  : [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"], storageState: authFile },
        dependencies: ["setup"],
      },
    ];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "html",

  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: !isCI ? "on" : "off",
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    ...browserProjects,
  ],

  webServer: {
    command: "npm run db:reset-seed && npm run build && npm run preview",
    port: 4173,
    reuseExistingServer: !isCI,
  },
});
