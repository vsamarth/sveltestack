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
  let initialDemoToastId: string | number | null = null;

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

    // Dismiss the initial demo toast
    if (initialDemoToastId) {
      toast.dismiss(initialDemoToastId);
    }

    // Threshold for showing loading toast (500ms)
    const LOADING_THRESHOLD = 500;
    let loadingToast: string | number | null = null;
    let shouldShowLoading = false;

    // Start timer to show loading toast only if operation takes longer than threshold
    const loadingTimer = setTimeout(() => {
      if (!shouldShowLoading) {
        shouldShowLoading = true;
        loadingToast = toast.loading("Setting up your demo account...", {
          description:
            "Creating your account and preparing demo data. This may take a few seconds.",
        });
      }
    }, LOADING_THRESHOLD);

    try {
      const startTime = Date.now();
      await loginDemo();
      const duration = Date.now() - startTime;

      // Clear the timer if it hasn't fired yet
      clearTimeout(loadingTimer);

      // If loading toast was shown, dismiss it
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }

      // Only show success toast if we showed loading toast or if it took a while
      if (loadingToast || duration > LOADING_THRESHOLD) {
        toast.success("Demo account ready!", {
          description: "Redirecting to your dashboard...",
        });
        // Small delay to show success message, then redirect
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await invalidateAll();
      await goto("/dashboard");
    } catch (err) {
      console.error("Demo login failed:", err);
      clearTimeout(loadingTimer);
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      toast.error("Failed to start demo", {
        description:
          "Please try again or contact support if the issue persists.",
      });
    } finally {
      isDemoLoading = false;
    }
  }

  onMount(() => {
    if (demoEnabled && !demoToastShown) {
      demoToastShown = true;
      initialDemoToastId = toast("Try the demo", {
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
