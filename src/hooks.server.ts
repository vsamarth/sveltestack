import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { initBucket } from "$lib/server/storage";
import { checkEmailConfiguration } from "$lib/server/email";

if (!building) {
  initBucket().catch(console.error);
  checkEmailConfiguration();
}

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }
  // If the user is not authenticated, redirect dashboard requests to login
  const { pathname } = event.url;
  if (pathname.startsWith("/dashboard") && !event.locals.user) {
    return Response.redirect(new URL("/login", event.url).toString(), 303);
  }
  return svelteKitHandler({ event, resolve, auth, building });
};
