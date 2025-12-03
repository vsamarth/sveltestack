#!/usr/bin/env tsx

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { detectPackageManager } from "nypm";
import { consola } from "consola";

const commandExists = (cmd: string): boolean => {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const getNodeVersion = (): number => {
  try {
    return parseInt(
      execSync("node --version", { encoding: "utf-8" })
        .trim()
        .replace("v", "")
        .split(".")[0] || "0",
    );
  } catch {
    return 0;
  }
};

const checkPrerequisites = async () => {
  consola.info("Checking prerequisites...\n");

  if (!commandExists("node") || getNodeVersion() < 20) {
    consola.error("Node.js >= 20 is required");
    process.exit(1);
  }
  consola.success(`Node.js v${getNodeVersion()} found`);

  if (!commandExists("docker")) {
    consola.error(
      "Docker is not installed. Please install Docker with Docker Compose",
    );
    process.exit(1);
  }

  try {
    execSync("docker info", { stdio: "ignore" });
    consola.success("Docker is installed and running");
  } catch {
    consola.error("Docker is installed but not running. Please start Docker");
    process.exit(1);
  }

  try {
    execSync("docker compose version", { stdio: "ignore" });
    consola.success("Docker Compose found");
  } catch {
    if (commandExists("docker-compose")) {
      consola.success("Docker Compose found (legacy)");
    } else {
      consola.error("Docker Compose is not installed");
      process.exit(1);
    }
  }

  consola.success("All prerequisites met!\n");
};

const setupEnvironment = () => {
  consola.info("Setting up environment...");

  if (existsSync(".env")) {
    consola.success(".env file already exists");
    return;
  }

  if (!existsSync(".env.example")) {
    consola.error(".env.example file not found");
    process.exit(1);
  }

  copyFileSync(".env.example", ".env");
  const secret = randomBytes(32).toString("base64");
  const envContent = readFileSync(".env", "utf-8").replace(
    /^BETTER_AUTH_SECRET=.*/m,
    `BETTER_AUTH_SECRET=${secret}`,
  );
  writeFileSync(".env", envContent, "utf-8");

  consola.success("Created .env file with generated BETTER_AUTH_SECRET");
  consola.warn(
    "Please review and update .env with your actual credentials if needed\n",
  );
};

const getPackageManager = async (): Promise<string> => {
  const pm = await detectPackageManager(process.cwd());
  if (!pm) {
    consola.error("Could not detect package manager");
    process.exit(1);
  }
  return pm.name;
};

const runCommand = (cmd: string, args: string[], pm: string) => {
  execSync(`${pm} ${cmd} ${args.join(" ")}`.trim(), { stdio: "inherit" });
};

const main = async () => {
  consola.box("SvelteStack Setup Script");
  consola.log("\n");

  try {
    await checkPrerequisites();
    setupEnvironment();
    const pm = await getPackageManager();

    consola.info("Starting database...");
    runCommand("run", ["db:start"], pm);
    consola.success("Database started\n");

    consola.info("Waiting for database to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    consola.info("Running database migrations...");
    runCommand("run", ["db:push"], pm);
    consola.success("Database migrations completed\n");

    if (
      await consola.prompt(
        "Would you like to seed the database with sample data?",
        {
          type: "confirm",
        },
      )
    ) {
      consola.info("Seeding database...");
      runCommand("run", ["db:seed"], pm);
      consola.success("Database seeded\n");
    }

    consola.success("Setup complete!\n");
    consola.info("To start the development server, run:");
    consola.log(`  ${pm} dev\n`);
    consola.info("Visit http://localhost:5173 to see your app\n");
  } catch (err) {
    consola.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

main();
