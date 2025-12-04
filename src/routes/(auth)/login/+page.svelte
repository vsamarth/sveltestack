<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { siteConfig } from "$lib/config";
  import { loginSchema } from "$lib/validation";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import { setError } from "sveltekit-superforms";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { z } from "zod";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { loginDemo } from "$lib/remote/actions.remote";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";

  type LoginFormData = z.infer<typeof loginSchema>;

  let isDemoLoading = $state(false);
  let demoToastShown = $state(false);

  const demoEnabled = $derived(page.data.demoEnabled ?? false);

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
      } else {
        // Invalidate all to refresh session data, then redirect to dashboard
        await invalidateAll();
        await goto("/dashboard");
      }
    } catch {
      setError(form, "password", getErrorMessage());
    }
  }

  async function handleDemoLogin() {
    if (isDemoLoading) return;
    isDemoLoading = true;
    try {
      await loginDemo();
      await invalidateAll();
      await goto("/dashboard");
    } catch (err) {
      console.error("Demo login failed:", err);
      toast.error("Failed to start demo. Please try again.");
    } finally {
      isDemoLoading = false;
    }
  }

  onMount(() => {
    if (demoEnabled && !demoToastShown) {
      demoToastShown = true;
      toast("Try the demo", {
        description: "Explore all features without creating an account",
        action: {
          label: "Start Demo",
          onClick: handleDemoLogin,
        },
        duration: 10000,
      });
    }
  });
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
  title="Sign in"
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
