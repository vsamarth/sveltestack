<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Avatar from "$lib/components/ui/avatar";
  import type { User } from "$lib/server/db/schema";
  import {
    MailIcon,
    BadgeCheckIcon,
    BadgeXIcon,
    KeyIcon,
    MailCheckIcon,
    Trash2Icon,
    TriangleAlertIcon,
    ChevronRight,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { authClient } from "$lib/auth-client";

  let { open = $bindable(false), user }: { open?: boolean; user: User } =
    $props();
  let showDeleteConfirm = $state(false);
  let isChangingPassword = $state(false);
  let isResendingVerification = $state(false);
  let isDeletingAccount = $state(false);

  // Profile Editing State

  function getInitials(name: string) {
    const names = name.split(" ");
    const initials = names.map((n) => n.charAt(0).toUpperCase());
    return initials.slice(0, 2).join("");
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function handleChangePassword() {
    isChangingPassword = true;
    await authClient.requestPasswordReset({
      email: user.email,
      redirectTo: "/reset-password",
    });
    isChangingPassword = false;
    toast.success("Password change link sent. Check your inbox.");
  }

  async function handleResendVerification() {
    isResendingVerification = true;
    try {
      await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: "/dashboard",
      });
      toast.success("Verification email sent. Check your inbox.");
    } catch {
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      isResendingVerification = false;
    }
  }

  async function handleDeleteAccount() {
    isDeletingAccount = true;
    await new Promise((r) => setTimeout(r, 1500));
    isDeletingAccount = false;
    showDeleteConfirm = false;
    toast.success("Account deletion has been started.");
  }
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => (open = isOpen)}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Account details</Dialog.Title>
      <Dialog.Description
        >Manage your account information and security settings.</Dialog.Description
      >
    </Dialog.Header>

    <div class="space-y-7 py-4">
      <!-- Profile Header -->
      <div class="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
        <Avatar.Root class="size-16 rounded-md ring-1 ring-border">
          {#if user.image}
            <Avatar.Image src={user.image} alt={user.name} />
          {/if}
          <Avatar.Fallback class="rounded-md text-base font-medium">
            {getInitials(user.name)}
          </Avatar.Fallback>
        </Avatar.Root>
        <div class="flex-1 space-y-1">
          <h3 class="text-lg font-semibold tracking-tight">{user.name}</h3>
          <p class="text-sm text-muted-foreground flex items-center gap-1">
            <MailIcon class="size-3.5 text-muted-foreground" />
            {user.email}
          </p>
          <p class="text-xs text-muted-foreground">
            Member since {formatDate(user.createdAt)}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1">
          {#if user.emailVerified}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700"
              ><BadgeCheckIcon class="size-3" /> Verified</span
            >
          {:else}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700"
              ><BadgeXIcon class="size-3" /> Unverified</span
            >
          {/if}
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <h4
          class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Quick actions
        </h4>
        <div class="space-y-1">
          <Button
            variant="ghost"
            class="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50"
            onclick={handleChangePassword}
            disabled={isChangingPassword}
          >
            <div class="flex items-center gap-3">
              <div
                class="flex size-8 items-center justify-center rounded-md bg-muted"
              >
                <KeyIcon class="size-4 text-muted-foreground" />
              </div>
              <div class="text-left">
                <p class="text-sm font-medium leading-none">Change password</p>
                <p class="text-xs text-muted-foreground mt-1">
                  Send a secure link to update your password.
                </p>
              </div>
            </div>
            {#if isChangingPassword}
              <span class="text-xs text-muted-foreground">Sending…</span>
            {:else}
              <ChevronRight class="size-4 text-muted-foreground/50" />
            {/if}
          </Button>

          {#if !user.emailVerified}
            <Button
              variant="ghost"
              class="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50"
              onclick={handleResendVerification}
              disabled={isResendingVerification}
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex size-8 items-center justify-center rounded-md bg-amber-500/10"
                >
                  <MailCheckIcon class="size-4 text-amber-600" />
                </div>
                <div class="text-left">
                  <p class="text-sm font-medium leading-none">Verify email</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    Resend the verification email to complete setup.
                  </p>
                </div>
              </div>
              {#if isResendingVerification}
                <span class="text-xs text-muted-foreground">Sending…</span>
              {:else}
                <ChevronRight class="size-4 text-muted-foreground/50" />
              {/if}
            </Button>
          {/if}

          <Button
            variant="ghost"
            class="w-full justify-between h-auto py-3 px-3 hover:bg-destructive/5 text-destructive hover:text-destructive"
            onclick={() => (showDeleteConfirm = !showDeleteConfirm)}
            aria-expanded={showDeleteConfirm}
          >
            <div class="flex items-center gap-3">
              <div
                class="flex size-8 items-center justify-center rounded-md bg-destructive/10"
              >
                <Trash2Icon class="size-4 text-destructive" />
              </div>
              <div class="text-left">
                <p class="text-sm font-medium leading-none">Delete account</p>
                <p class="text-xs text-muted-foreground/80 mt-1">
                  Permanently delete your account and all associated data.
                </p>
              </div>
            </div>
            <ChevronRight
              class="size-4 text-destructive/50 transition-transform duration-200 {showDeleteConfirm
                ? 'rotate-90'
                : ''}"
            />
          </Button>

          {#if showDeleteConfirm}
            <div
              class="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-3"
            >
              <div class="flex items-start gap-2">
                <TriangleAlertIcon class="size-5 text-destructive" />
                <p class="text-sm leading-relaxed text-muted-foreground">
                  This will permanently delete your account and all associated
                  data. This action cannot be undone.
                </p>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  class="flex-1"
                  onclick={() => (showDeleteConfirm = false)}
                >
                  Keep account
                </Button>
                <Button
                  variant="destructive"
                  class="flex-1"
                  onclick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? "Deleting…" : "Delete account"}
                </Button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)} class="w-full">
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
