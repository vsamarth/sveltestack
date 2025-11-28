import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  // Redirect to the files page
  throw redirect(302, `/dashboard/workspace/${params.id}/files`);
};
