<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { siteConfig } from "$lib/config";
  import { loginSchema } from "$lib/validation";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import { setError } from "sveltekit-superforms";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { z } from "zod";

  type LoginFormData = z.infer<typeof loginSchema>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleLogin(form: SuperValidated<LoginFormData, any>) {
    try {
      const { error } = await authClient.signIn.email({
        email: form.data.email,
        password: form.data.password,
        callbackURL: "/dashboard",
      });
      if (error) {
        setError(form, "password", getErrorMessage(error.code ?? ""));
      }
    } catch {
      setError(form, "password", getErrorMessage());
    }
  }
</script>

<svelte:head>
  <title>Sign In | {siteConfig.name}</title>
  <meta
    name="description"
    content="Sign in to your {siteConfig.name} account to securely access your workspaces and files."
  />
</svelte:head>

<AuthForm
  schema={loginSchema}
  onSubmit={handleLogin}
  title={`Sign in`}
  submitText="Sign in"
  linkText="Don't have an account?"
  linkLabel="Sign up"
  linkHref="/register"
  fields={{
    email: {
      label: "Email",
      type: "email",
      autocomplete: "email",
    },
    password: {
      label: "Password",
      type: "password",
      autocomplete: "current-password",
      showForgotPassword: true,
    },
  }}
/>