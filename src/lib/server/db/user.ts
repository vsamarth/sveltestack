import { db } from ".";
import { eq } from "drizzle-orm";
import { user } from "./schema";

export async function getUserByEmail(email: string) {
  return await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
    .then((rows) => rows[0]);
}
