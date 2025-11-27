<script lang="ts">
  import type { PageData } from "./$types";
  import { siteConfig } from "$lib/config";
  import * as Card from "$lib/components/ui/card";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    MailIcon,
    AlertTriangleIcon,
    UsersIcon,
    XIcon,
  } from "@lucide/svelte";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import { enhance } from "$app/forms";
  import { formatRelativeTime } from "$lib/utils";
  import { toast } from "svelte-sonner";

  let { data }: { data: PageData } = $props();

  let isAccepting = $state(false);
  let isDeclining = $state(false);
  let showSuccess = $state(false);
  let declined = $state(false);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
</script>

<svelte:head>
  <title>Accept Invitation | {siteConfig.name}</title>
  <meta name="description" content="Accept your workspace invitation." />
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted p-4"
>
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center space-y-4">
      <!-- Logo -->
      <div class="flex justify-center">
        <div
          class="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-lg"
        >
          <GalleryVerticalEndIcon class="size-7" />
        </div>
      </div>

      {#if data.error}
        <!-- Error State -->
        <div class="space-y-2">
          {#if data.error === "expired"}
            <div class="flex justify-center text-amber-500 dark:text-amber-400">
              <ClockIcon class="h-12 w-12" />
            </div>
            <Card.Title class="text-xl">Invitation Expired</Card.Title>
          {:else if data.error === "accepted"}
            <div class="flex justify-center text-green-500 dark:text-green-400">
              <CheckCircleIcon class="h-12 w-12" />
            </div>
            <Card.Title class="text-xl">Already Accepted</Card.Title>
          {:else}
            <div class="flex justify-center text-destructive">
              <XCircleIcon class="h-12 w-12" />
            </div>
            <Card.Title class="text-xl">Invalid Invitation</Card.Title>
          {/if}
          <Card.Description>{data.message}</Card.Description>
        </div>
      {:else if data.invite}
        <!-- Valid Invite -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Card.Title class="text-xl">You're Invited!</Card.Title>
            <Card.Description>
              <span class="font-medium text-foreground"
                >{data.invite.inviterName}</span
              >
              has invited you to join
            </Card.Description>
          </div>

          <!-- Inviter Info -->
          <div class="flex items-center justify-center gap-3 py-2">
            <Avatar.Root class="size-10 rounded-lg ring-2 ring-border">
              {#if data.invite.inviterImage}
                <Avatar.Image
                  src={data.invite.inviterImage}
                  alt={data.invite.inviterName}
                />
              {/if}
              <Avatar.Fallback
                class="rounded-lg text-sm font-medium bg-primary/10 text-primary"
              >
                {getInitials(data.invite.inviterName)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="text-left">
              <p class="text-sm font-medium text-foreground">
                Invited by {data.invite.inviterName}
              </p>
              {#if data.invite.createdAt}
                <p class="text-xs text-muted-foreground">
                  {formatRelativeTime(data.invite.createdAt)}
                </p>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </Card.Header>

    {#if !data.error && data.invite}
      <Card.Content class="space-y-4">
        {#if data.user}
          <!-- Logged in -->
          {#if showSuccess}
            <!-- Success State -->
            <div
              class="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <div
                class="flex justify-center text-green-500 dark:text-green-400"
              >
                <CheckCircleIcon class="h-16 w-16" />
              </div>
              <div class="text-center space-y-2">
                <p class="text-lg font-semibold">Invitation Accepted!</p>
                <p class="text-sm text-muted-foreground">
                  You've joined <span class="font-medium"
                    >{data.invite.workspaceName}</span
                  >. Redirecting...
                </p>
              </div>
            </div>
          {:else if declined}
            <!-- Declined State -->
            <div
              class="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <div class="flex justify-center text-muted-foreground">
                <XCircleIcon class="h-16 w-16" />
              </div>
              <div class="text-center space-y-2">
                <p class="text-lg font-semibold">Invitation Declined</p>
                <p class="text-sm text-muted-foreground">
                  You've declined the invitation to join <span
                    class="font-medium">{data.invite.workspaceName}</span
                  >.
                </p>
              </div>
              <Button href="/dashboard" class="w-full mt-4">
                Go to Dashboard
              </Button>
            </div>
          {:else}
            <!-- Workspace Context -->
            <div class="rounded-lg border bg-card p-4 space-y-3">
              <div>
                <h3 class="text-base font-semibold text-foreground mb-1">
                  {data.invite.workspaceName}
                </h3>
                {#if data.invite.memberCount !== undefined}
                  <div
                    class="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <UsersIcon class="h-4 w-4" />
                    <span>
                      {data.invite.memberCount === 1
                        ? "1 member"
                        : `${data.invite.memberCount} members`}
                    </span>
                  </div>
                {/if}
              </div>
            </div>

            {#if !data.emailMatches}
              <!-- Email mismatch warning -->
              <div
                class="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
              >
                <AlertTriangleIcon
                  class="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <div>
                  <p
                    class="font-medium text-amber-700 dark:text-amber-300 mb-1"
                  >
                    Email mismatch
                  </p>
                  <p class="text-amber-600 dark:text-amber-400">
                    This invite was sent to <span class="font-medium"
                      >{data.invite.email}</span
                    >, but you're logged in as
                    <span class="font-medium">{data.user.email}</span>. You can
                    still accept if you manage multiple accounts. This is safe
                    if intentional.
                  </p>
                </div>
              </div>
            {/if}

            <!-- Subtle Logged in as indicator -->
            <div
              class="flex items-center justify-between text-xs text-muted-foreground px-1"
            >
              <span>Logged in as {data.user.name}</span>
              <span>{data.user.email}</span>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-2 pt-2">
              <form
                method="POST"
                action="?/accept"
                use:enhance={() => {
                  isAccepting = true;
                  return async ({ update, result }) => {
                    await update();
                    if (result.type === "redirect") {
                      showSuccess = true;
                      toast.success("Invitation accepted!", {
                        description: `You've joined ${data.invite.workspaceName}`,
                      });
                    }
                    isAccepting = false;
                  };
                }}
              >
                <Button
                  type="submit"
                  class="w-full"
                  disabled={isAccepting || isDeclining}
                >
                  {#if isAccepting}
                    <Spinner class="mr-2" />
                    Accepting...
                  {:else}
                    Accept Invitation
                  {/if}
                </Button>
              </form>

              <form
                method="POST"
                action="?/decline"
                use:enhance={() => {
                  isDeclining = true;
                  return async ({ update, result }) => {
                    await update();
                    if (result.type === "success" && result.data?.declined) {
                      declined = true;
                      toast.info("Invitation declined");
                    }
                    isDeclining = false;
                  };
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  class="w-full"
                  disabled={isAccepting || isDeclining}
                >
                  {#if isDeclining}
                    <Spinner class="mr-2" />
                    Declining...
                  {:else}
                    <XIcon class="mr-2 h-4 w-4" />
                    Decline
                  {/if}
                </Button>
              </form>
            </div>
          {/if}
        {:else}
          <!-- Not logged in -->
          <div
            class="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground"
          >
            <MailIcon class="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              This invite was sent to <span class="font-medium text-foreground"
                >{data.invite.email}</span
              >. Sign in or create an account to accept.
            </p>
          </div>

          <div class="space-y-2">
            <Button href={data.loginUrl} class="w-full">Sign In</Button>
            <Button href={data.registerUrl} variant="outline" class="w-full">
              Create Account
            </Button>
          </div>
        {/if}
      </Card.Content>
    {:else}
      <Card.Content>
        <Button href="/dashboard" class="w-full">Go to Dashboard</Button>
      </Card.Content>
    {/if}
  </Card.Root>
</div>
