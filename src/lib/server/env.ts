import { z } from "zod";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Load environment variables with fallback support
 * Tries SvelteKit's $env/dynamic/private first, then falls back to dotenv + process.env
 * This works in both SvelteKit contexts (where $env is available) and other contexts
 */
function getEnvSource(): Record<string, unknown> {
  // Load .env file with dotenv first (ensures process.env has .env values)
  // This is needed for non-SvelteKit contexts where $env is not available
  try {
    require("dotenv/config");
  } catch {
    // dotenv already loaded or not available, continue
  }

  // Try to use SvelteKit's $env/dynamic/private if available
  // In SvelteKit contexts (dev, build, preview), this will work
  // In other contexts, this will throw and we'll use process.env
  try {
    // $env might not be available in all contexts, that's why we have try-catch
    const svelteEnvModule = require("$env/dynamic/private");
    return svelteEnvModule.env;
  } catch {
    // $env not available, use process.env (which may have been populated by dotenv above)
    return process.env;
  }
}

const svelteEnv = getEnvSource();

/**
 * Environment variable schema
 * Add your environment variables here with proper validation
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  // MinIO/S3 configuration
  STORAGE_ENDPOINT: z.string().url("STORAGE_ENDPOINT must be a valid URL"),
  STORAGE_ACCESS_KEY: z.string().min(1, "STORAGE_ACCESS_KEY is required"),
  STORAGE_SECRET_KEY: z.string().min(1, "STORAGE_SECRET_KEY is required"),
  STORAGE_BUCKET: z.string().min(1, "STORAGE_BUCKET is required"),
  STORAGE_REGION: z.string().min(1, "STORAGE_REGION is required"),
  // Email configuration (optional)
  EMAIL_API_KEY: z
    .string()
    .min(1, "EMAIL_API_KEY must be non-empty if provided")
    .optional(),
  EMAIL_FROM: z
    .string()
    .email("EMAIL_FROM must be a valid email address if provided")
    .optional(),
});

/**
 * Validates environment variables
 */
function validateEnv(env: Record<string, unknown>) {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      throw new Error(
        `Invalid environment variables:\n${missingVars.join("\n")}\n\nPlease check your .env file.`,
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables
 */
export const env = validateEnv(svelteEnv);

/**
 * Type-safe environment variables type
 */
export type Env = z.infer<typeof envSchema>;
