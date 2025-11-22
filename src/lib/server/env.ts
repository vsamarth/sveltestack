import { z } from "zod";
import { env as svelteEnv } from "$env/dynamic/private";

/**
 * Environment variable schema
 * Add your environment variables here with proper validation
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  // Add more environment variables as needed
  // API_KEY: z.string().min(1).optional(),
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
