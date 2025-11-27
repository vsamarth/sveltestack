<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { siteConfig } from "$lib/config";
  import { signupSchema } from "$lib/validation";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import { setError } from "sveltekit-superforms";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { z } from "zod";
  import { goto, invalidateAll } from "$app/navigation";

  type SignupFormData = z.infer<typeof signupSchema>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSignup(form: SuperValidated<SignupFormData, any>) {
    try {
      const { error } = await authClient.signUp.email({
        email: form.data.email,
        password: form.data.password,
        name: form.data.name,
        callbackURL: "/dashboard",
      });
      if (error) {
        const errorField =
          error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "email"
            : "password";
        setError(form, errorField, getErrorMessage(error.code ?? ""));
      } else {
        // Invalidate all to refresh session data, then redirect to dashboard
        await invalidateAll();
        await goto("/dashboard");
      }
    } catch {
      setError(form, "password", getErrorMessage());
    }
  }
</script>

<svelte:head>
  <title>Sign Up | {siteConfig.name}</title>
  <meta
    name="description"
    content="Create a new {siteConfig.name} account to start securely managing your files and workspaces."
  />
</svelte:head>

<AuthForm
  schema={signupSchema}
  onSubmit={handleSignup}
  title="Create your account"
  submitText="Create Account"
  linkText="Already have an account?"
  linkLabel="Sign in"
  linkHref="/login"
  fields={{
    email: {
      label: "Email",
      type: "email",
      autocomplete: "email",
    },
    name: {
      label: "Full Name",
      type: "text",
      autocomplete: "name",
    },
    password: {
      label: "Password",
      type: "password",
      autocomplete: "new-password",
    },
  }}
/>
