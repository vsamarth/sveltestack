import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_USERS } from "./test-users";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, "../../playwright/.auth");

export const AUTH_STATES = {
  verified: path.join(AUTH_DIR, "verified.json"),
  member: path.join(AUTH_DIR, "member.json"),
};

export type AuthUserKey = "verified" | "member";

export const AUTH_USERS = {
  verified: TEST_USERS.verified,
  member: TEST_USERS.member,
};

