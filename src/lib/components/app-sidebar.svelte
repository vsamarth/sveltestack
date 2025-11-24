<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import type { User, Workspace } from "$lib/server/db/schema";
  import { EllipsisIcon, Trash2Icon, PlusIcon } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import * as Tooltip from "./ui/tooltip";
  import { page } from "$app/state";
  import NavUser from "./nav-user.svelte";
  import CreateWorkspaceDialog from "./create-workspace-dialog.svelte";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { WorkspaceSchema } from "$lib/validation";

  type Props = ComponentProps<typeof Sidebar.Root> & {
    workspaces?: Workspace[];
    user: User;
    workspaceForm?: SuperValidated<WorkspaceSchema>;
  };

  let {
    workspaces = [],
    user,
    workspaceForm,
    ref = $bindable(null),
    ...restProps
  }: Props = $props();

  const sidebar = Sidebar.useSidebar();
  let createDialogOpen = $state(false);

  async function handleDeleteWorkspace(workspaceId: string) {
    if (!confirm("Are you sure you want to delete this workspace?")) {
      return;
    }

    try {
      const response = await fetch("/api/workspace", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (!response.ok) {
        const error = await response.text();
        alert(error || "Failed to delete workspace");
        return;
      }

      const { redirectTo } = await response.json();
      window.location.href = redirectTo;
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      alert("Failed to delete workspace");
    }
  }
</script>

<Sidebar.Root {...restProps} bind:ref>
  <Sidebar.Content>
    <Sidebar.Group>
      <div class="flex items-center justify-between px-2 py-1.5">
        <Sidebar.GroupLabel class="text-xs">Workspaces</Sidebar.GroupLabel>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          onclick={() => (createDialogOpen = true)}
        >
          <PlusIcon class="h-4 w-4" />
          <span class="sr-only">Add Workspace</span>
        </Button>
      </div>
      <Sidebar.Menu>
        {#each workspaces as item (item.name)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.params.id === item.id}>
              {#snippet child({ props })}
                <a href={`/dashboard/workspace/${item.id}`} {...props}>
                  <!-- <item.icon /> -->
                  <span>{item.name}</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Sidebar.MenuAction showOnHover {...props}>
                    <EllipsisIcon />
                    <span class="sr-only">More</span>
                  </Sidebar.MenuAction>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                class="w-48"
                side={sidebar.isMobile ? "bottom" : "right"}
                align={sidebar.isMobile ? "end" : "start"}
              >
                {#if workspaces.length <= 1}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {#snippet child({ props: tooltipProps })}
                        <div {...tooltipProps}>
                          <DropdownMenu.Item disabled={true}>
                            <Trash2Icon class="text-muted-foreground" />
                            <span>Delete Workspace</span>
                          </DropdownMenu.Item>
                        </div>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <p>Cannot delete your last workspace</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <DropdownMenu.Item
                    onclick={() => handleDeleteWorkspace(item.id)}
                  >
                    <Trash2Icon class="text-muted-foreground" />
                    <span>Delete Workspace</span>
                  </DropdownMenu.Item>
                {/if}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser {user} />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>

{#if workspaceForm}
  <CreateWorkspaceDialog bind:open={createDialogOpen} data={workspaceForm} />
{/if}
