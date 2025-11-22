<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
  import BellIcon from "@lucide/svelte/icons/bell";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import CreditCardIcon from "@lucide/svelte/icons/credit-card";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import { authClient } from "$lib/auth-client";
  import { goto } from "$app/navigation";
  import type { User } from "$lib/server/db/schema";

  let { user }: { user: User } = $props();
  const sidebar = useSidebar();

  function getInitials(name: string) {
    const names = name.split(" ");
    const initials = names.map((n) => n.charAt(0).toUpperCase());
    return initials.slice(0, 2).join("");
  }

  async function handleLogout() {
    await authClient.signOut();
    goto("/login");
  }
</script>

{#snippet userAvatar()}
  <Avatar.Root class="size-8 rounded-lg">
    {#if user.image}
      <Avatar.Image src={user.image} alt={user.name} />
    {/if}
    <Avatar.Fallback class="rounded-lg"
      >{getInitials(user.name)}</Avatar.Fallback
    >
  </Avatar.Root>
  <div class="grid flex-1 text-left text-sm leading-tight">
    <span class="truncate font-medium">{user.name}</span>
    <span class="truncate text-xs">{user.email}</span>
  </div>
{/snippet}

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            {@render userAvatar()}
            <ChevronsUpDownIcon class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            {@render userAvatar()}
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item>
            <SparklesIcon />
            Upgrade to Pro
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item>
            <BadgeCheckIcon />
            Account
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <CreditCardIcon />
            Billing
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <BellIcon />
            Notifications
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={handleLogout}>
          <LogOutIcon />
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
