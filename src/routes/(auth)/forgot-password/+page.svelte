<script lang="ts">
  import AuthForm from "$lib/components/auth-form.svelte";
  import { forgotPasswordSchema } from "$lib/validation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { FieldGroup } from "$lib/components/ui/field/index.js";
  import { authClient } from "$lib/auth-client";
  import * as Alert from "$lib/components/ui/alert";
  import { MailCheckIcon, ArrowLeftIcon } from "@lucide/svelte";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { z } from "zod";

  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  let showSuccess = $state(false);
  let submittedEmail = $state("");

  async function handleForgotPassword(
    form: SuperValidated<ForgotPasswordFormData, unknown>,
  ) {
    try {
      await authClient.requestPasswordReset({
        email: form.data.email,
        redirectTo: "/reset-password",
      });
    } catch {
      // Even on error, show success to prevent enumeration
    }
    submittedEmail = form.data.email;
    showSuccess = true;
  }
</script>

<svelte:head>
  <title>Forgot Password</title>
</svelte:head>

{#snippet header()}
  <div class="flex flex-col items-start gap-1">
    <Button href="/login" variant="ghost" size="sm" class="mb-4 -ml-3">
      <ArrowLeftIcon class="mr-2 h-4 w-4" />
      Back
    </Button>
    <h1 class="text-2xl font-semibold tracking-tight">Reset your password</h1>
    <p class="text-sm text-muted-foreground">
      Enter your email address and we'll send you a link to reset your password.
    </p>
  </div>
{/snippet}

{#if showSuccess}
  <div class="flex flex-col gap-6">
    <FieldGroup>
      {@render header()}

      <Alert.Alert>
        <MailCheckIcon class="h-4 w-4" />
        <Alert.AlertTitle>Check your email</Alert.AlertTitle>
        <Alert.AlertDescription>
          If an account exists for {submittedEmail}, we've sent a password reset
          link. Please check your inbox and spam folder.
        </Alert.AlertDescription>
      </Alert.Alert>

      <Button
        variant="ghost"
        onclick={() => {
          showSuccess = false;
          submittedEmail = "";
        }}
        class="w-full"
      >
        Try a different email
      </Button>
    </FieldGroup>
  </div>
{:else}
  <AuthForm
    schema={forgotPasswordSchema}
    onSubmit={handleForgotPassword}
    title="Reset your password"
    submitText="Send reset link"
    fields={{
      email: {
        label: "Email",
        type: "email",
        autocomplete: "email",
      },
    }}
  >
    {#snippet titleSnippet()}
      {@render header()}
    {/snippet}
  </AuthForm>
{/if}
