import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

const ALLOW_AUTHENTICATED_PATHS = new Set(["/reset-password"]);

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (locals.user && !ALLOW_AUTHENTICATED_PATHS.has(url.pathname)) {
    throw redirect(303, "/dashboard");
  }

  return {};
};
