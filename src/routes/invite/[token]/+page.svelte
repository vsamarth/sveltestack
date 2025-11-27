<script lang="ts">
  import type { PageData } from "./$types";
  import { siteConfig } from "$lib/config";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    MailIcon,
    AlertTriangleIcon,
  } from "@lucide/svelte";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import { enhance } from "$app/forms";

  let { data }: { data: PageData } = $props();

  let isAccepting = $state(false);
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
        <div class="space-y-2">
          <Card.Title class="text-xl">You're Invited!</Card.Title>
          <Card.Description>
            <span class="font-medium text-foreground"
              >{data.invite.inviterName}</span
            >
            has invited you to join
            <span class="font-medium text-foreground"
              >{data.invite.workspaceName}</span
            >
          </Card.Description>
        </div>
      {/if}
    </Card.Header>

    {#if !data.error && data.invite}
      <Card.Content class="space-y-4">
        {#if data.user}
          <!-- Logged in -->
          {#if !data.emailMatches}
            <!-- Email mismatch warning -->
            <div
              class="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
            >
              <AlertTriangleIcon
                class="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <div>
                <p class="font-medium text-amber-700 dark:text-amber-300">
                  Email mismatch
                </p>
                <p class="text-amber-600 dark:text-amber-400">
                  This invite was sent to <span class="font-medium"
                    >{data.invite.email}</span
                  >, but you're logged in as
                  <span class="font-medium">{data.user.email}</span>. You can
                  still accept, but make sure this is intentional.
                </p>
              </div>
            </div>
          {/if}

          <div class="rounded-lg bg-muted p-4">
            <p class="text-sm text-muted-foreground mb-1">Logged in as</p>
            <p class="font-medium">{data.user.name}</p>
            <p class="text-sm text-muted-foreground">{data.user.email}</p>
          </div>

          <form
            method="POST"
            action="?/accept"
            use:enhance={() => {
              isAccepting = true;
              return async ({ update }) => {
                await update();
                isAccepting = false;
              };
            }}
          >
            <Button type="submit" class="w-full" disabled={isAccepting}>
              {#if isAccepting}
                <Spinner class="mr-2" />
                Accepting...
              {:else}
                Accept Invitation
              {/if}
            </Button>
          </form>
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
