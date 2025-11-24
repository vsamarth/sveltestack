<script lang="ts">
  import { superForm, defaults, setError } from "sveltekit-superforms";
  import { zod4 } from "sveltekit-superforms/adapters";
  import { resetPasswordSchema } from "$lib/validation";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { authClient, getErrorMessage } from "$lib/auth-client";
  import * as Form from "$lib/components/ui/form";
  import * as Alert from "$lib/components/ui/alert";
  import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  const data = defaults(zod4(resetPasswordSchema));

  let showPassword = $state(false);
  let token = $state("");
  let tokenError = $state(false);

  onMount(() => {
    // Extract token from URL search params
    const urlToken = $page.url.searchParams.get("token");
    if (!urlToken) {
      tokenError = true;
    } else {
      token = urlToken;
    }
  });

  const form = superForm(data, {
    SPA: true,
    validators: zod4(resetPasswordSchema),
    delayMs: 500,
    timeoutMs: 5000,
    async onUpdate({ form }) {
      if (!form.valid) return;

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
          setError(form, "password", getErrorMessage(error.code ?? ""));
        } else {
          // Success! Redirect to login with success message
          toast.success(
            "Password reset successful! Please log in with your new password.",
          );
          goto("/login");
        }
      } catch (error) {
        setError(
          form,
          "password",
          "Failed to reset password. Please try again.",
        );
      }
    },
  });

  const { form: formData, enhance, delayed } = form;
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

<div class="flex min-h-full flex-col justify-center">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="text-2xl font-semibold tracking-tight">Set new password</h2>
    <p class="mt-2 text-sm text-muted-foreground">
      Your new password must be at least 8 characters long.
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    {#if tokenError}
      <Alert.Alert variant="destructive" class="mb-6">
        <AlertCircleIcon class="h-4 w-4" />
        <Alert.AlertTitle>Invalid reset link</Alert.AlertTitle>
        <Alert.AlertDescription>
          This password reset link is invalid or has expired. Please request a
          new one.
        </Alert.AlertDescription>
      </Alert.Alert>

      <Button href="/forgot-password" class="w-full">
        Request new reset link
      </Button>
    {:else}
      <form method="POST" use:enhance class="space-y-6">
        <Form.Field {form} name="password">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>New Password</Form.Label>
              <InputGroup.Root>
                <InputGroup.Input
                  {...props}
                  type={showPassword ? "text" : "password"}
                  autocomplete="new-password"
                  placeholder="Enter new password"
                  bind:value={$formData.password}
                />
                {#if $formData.password}
                  <InputGroup.Addon
                    align="inline-end"
                    class="rounded-r-md animate-in fade-in"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onclick={() => (showPassword = !showPassword)}
                      class="hover:bg-transparent"
                    >
                      {#if !showPassword}
                        <EyeIcon />
                      {:else}
                        <EyeOffIcon />
                      {/if}
                      <span class="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </InputGroup.Addon>
                {/if}
              </InputGroup.Root>
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

        <div class="flex flex-col gap-4">
          <Button type="submit" class="w-full" disabled={$delayed}>
            {#if $delayed}
              <Spinner class="mr-2 h-4 w-4" />
              Resetting password...
            {:else}
              Reset password
            {/if}
          </Button>
        </div>
      </form>
    {/if}
  </div>
</div>
