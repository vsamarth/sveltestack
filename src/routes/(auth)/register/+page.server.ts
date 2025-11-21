import { superValidate } from "sveltekit-superforms/server";
import { zod4 } from "sveltekit-superforms/adapters";
import { signupSchema } from "$lib/validation";
import { auth } from "$lib/server/auth";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

// Define outside the load function so the adapter can be cached
const adapter = zod4(signupSchema);

export const load = async () => {
  return {
    form: await superValidate(adapter),
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, adapter);

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: form.data.email as string,
          password: form.data.password as string,
          name: form.data.name as string,
        },
        headers: request.headers,
      });

      // better-auth returns the result directly, not wrapped in { data, error }
      // If signup is successful, result contains user and token
      if (result.user) {
        throw redirect(303, "/");
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 303
      ) {
        throw error; // Re-throw redirect
      }

      // Handle better-auth errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during signup. Please try again.";

      return fail(400, {
        form: {
          ...form,
          errors: {
            _errors: [errorMessage],
          },
        },
      });
    }
  },
};
