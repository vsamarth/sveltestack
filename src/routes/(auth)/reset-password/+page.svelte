<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { resetPasswordSchema } from "$lib/validation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import { setError } from "sveltekit-superforms";
  import * as Alert from "$lib/components/ui/alert";
  import { AlertCircleIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { z } from "zod";

  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  let token = $state("");
  let tokenError = $state(false);

  onMount(() => {
    const urlToken = $page.url.searchParams.get("token");
    if (!urlToken) {
      tokenError = true;
    } else {
      token = urlToken;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleResetPassword(
    form: SuperValidated<ResetPasswordFormData, any>,
  ) {
    if (!token) {
      setError(form, "password", "Invalid or missing reset token.");
      return;
    }

    try {
      const { error } = await authClient.resetPassword({
        newPassword: form.data.password,
        token: token,
      });

      if (error) {
        setError(form, "password", getErrorMessage(error.code));
      } else {
        toast.success(
          "Password reset successful! Please sign in with your new password.",
        );
        goto("/login");
      }
    } catch {
      setError(form, "password", "Failed to reset password. Please try again.");
    }
  }
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

{#if tokenError}
  <div class="flex flex-col gap-6">
    <Alert.Alert variant="destructive">
      <AlertCircleIcon class="h-4 w-4" />
      <Alert.AlertTitle>Invalid reset link</Alert.AlertTitle>
      <Alert.AlertDescription>
        This password reset link is invalid or has expired. Please request a new
        one.
      </Alert.AlertDescription>
    </Alert.Alert>

    <Button href="/forgot-password" class="w-full">
      Request new reset link
    </Button>
  </div>
{:else}
  <AuthForm
    schema={resetPasswordSchema}
    onSubmit={handleResetPassword}
    title="Set new password"
    submitText="Reset password"
    fields={{
      password: {
        label: "New Password",
        type: "password",
        autocomplete: "new-password",
        placeholder: "Enter new password",
      },
    }}
  >
    {#snippet titleSnippet()}
      <div class="flex flex-col items-start gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p class="text-sm text-muted-foreground">
          Your new password must be at least 8 characters long.
        </p>
      </div>
    {/snippet}
  </AuthForm>
{/if}
