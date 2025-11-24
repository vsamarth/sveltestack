<script lang="ts">
  import { superForm, defaults } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { forgotPasswordSchema } from "$lib/validation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { authClient } from "$lib/auth-client";
  import * as Form from "$lib/components/ui/form";
  import * as Alert from "$lib/components/ui/alert";
  import { MailCheckIcon, ArrowLeftIcon } from "@lucide/svelte";

  const data = defaults(zod4(forgotPasswordSchema));

  let showSuccess = $state(false);
  let submittedEmail: string | null = $state(null);

  const form = superForm(data, {
    SPA: true,
    validators: zod4(forgotPasswordSchema),
    delayMs: 500,
    timeoutMs: 5000,
    async onUpdate({ form }) {
      if (!form.valid) return;

      try {
        await authClient.requestPasswordReset({
          email: form.data.email,
          redirectTo: "/reset-password",
        });

        submittedEmail = form.data.email;
        showSuccess = true;
      } catch (error) {
        // Even on error, show success to prevent enumeration
        submittedEmail = form.data.email;
        showSuccess = true;
      }
    },
  });

  const { form: formData, enhance, delayed } = form;
</script>

<svelte:head>
  <title>Forgot Password</title>
</svelte:head>

<div class="flex min-h-full flex-col justify-center">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <Button href="/login" variant="ghost" size="sm" class="mb-6 -ml-3">
      <ArrowLeftIcon class="mr-2 h-4 w-4" />
      Back
    </Button>
    <h2 class="text-2xl font-semibold tracking-tight">Reset your password</h2>
    <p class="mt-2 text-sm text-muted-foreground">
      Enter your email address and we'll send you a link to reset your password.
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    {#if showSuccess}
      <Alert.Alert class="mb-6">
        <MailCheckIcon class="h-4 w-4" />
        <Alert.AlertTitle>Check your email</Alert.AlertTitle>
        <Alert.AlertDescription>
          If an account exists for {submittedEmail}, we've sent a password reset
          link. Please check your inbox and spam folder.
        </Alert.AlertDescription>
      </Alert.Alert>

      <div class="flex flex-col gap-4">
        <Button
          variant="ghost"
          onclick={() => {
            showSuccess = false;
            submittedEmail = "";
            $formData.email = "";
          }}
          class="w-full"
        >
          Try a different email
        </Button>
      </div>
    {:else}
      <form method="POST" use:enhance class="space-y-6">
        <Form.Field {form} name="email">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Email</Form.Label>
              <Input
                {...props}
                type="email"
                autocomplete="email"
                bind:value={$formData.email}
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors>
            {#snippet children({ errors, errorProps })}
              {#if errors && errors.length > 0}
                <div {...errorProps}>{errors[0]}</div>
              {/if}
            {/snippet}
          </Form.FieldErrors>
        </Form.Field>

        <Button type="submit" class="w-full" disabled={$delayed}>
          {#if $delayed}
            <Spinner class="mr-2 h-4 w-4" />
            Sending...
          {:else}
            Send reset link
          {/if}
        </Button>
      </form>
    {/if}
  </div>
</div>
