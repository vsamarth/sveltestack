<script lang="ts">
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { authClient } from "$lib/auth-client";
  import Spinner from "./ui/spinner/spinner.svelte";

  let { email }: { email: string } = $props();

  let isResending = $state(false);

  async function resendVerification() {
    // TODO: Implement resend verification email logic
    isResending = true;
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });
    } finally {
      isResending = false;
    }
  }
</script>

<Alert
  variant="warning"
  class="flex items-start justify-between border-l-4"
  role="status"
>
  <AlertCircleIcon class="mt-0.5" />
  <div class="flex-1">
    <AlertTitle class="font-semibold mb-0">Verify your email</AlertTitle>
    <AlertDescription class="text-amber-800 mt-0 block">
      We sent a verification link to <span class="font-semibold">{email}</span>.
      Check your inbox (and spam folder) to activate your account.
    </AlertDescription>
  </div>
  <Button
    variant="outline"
    size="sm"
    onclick={resendVerification}
    disabled={isResending}
    class="ml-4 border-amber-700 text-amber-900 hover:bg-amber-100 hover:text-amber-900 shrink-0 bg-transparent self-center"
  >
    {#if isResending}
      <Spinner class="size-4" />
      Sending
    {:else}
      Send again
    {/if}
  </Button>
</Alert>
