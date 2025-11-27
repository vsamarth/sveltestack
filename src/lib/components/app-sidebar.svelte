<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import type { ComponentProps } from "svelte";
  import type { User, Workspace } from "$lib/server/db/schema";
  import {
    PlusIcon,
    ChevronRightIcon,
    FolderIcon,
    SettingsIcon,
  } from "@lucide/svelte";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import { Button } from "$lib/components/ui/button";
  import { page } from "$app/state";
  import NavUser from "./nav-user.svelte";
  import WorkspaceFormDialog from "./workspace-form-dialog.svelte";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { WorkspaceSchema } from "$lib/validation";

  type Props = ComponentProps<typeof Sidebar.Root> & {
    ownedWorkspaces?: Workspace[];
    memberWorkspaces?: Workspace[];
    user: User;
    workspaceForm?: SuperValidated<WorkspaceSchema>;
  };

  let {
    ownedWorkspaces = [],
    memberWorkspaces = [],
    user,
    workspaceForm,
    ref = $bindable(null),
    ...restProps
  }: Props = $props();

  let dialogOpen = $state(false);

  function openCreateDialog() {
    dialogOpen = true;
  }

  // Track which workspaces are expanded
  let expandedWorkspaces = $state<Set<string>>(new Set());

  // Auto-expand the current workspace
  $effect(() => {
    if (page.params.id) {
      expandedWorkspaces.add(page.params.id);
      expandedWorkspaces = expandedWorkspaces;
    }
  });

  function toggleWorkspace(id: string) {
    if (expandedWorkspaces.has(id)) {
      expandedWorkspaces.delete(id);
    } else {
      expandedWorkspaces.add(id);
    }
    expandedWorkspaces = expandedWorkspaces;
  }

  function isWorkspaceActive(workspaceId: string): boolean {
    return page.params.id === workspaceId;
  }

  function isSubPageActive(workspaceId: string, subPage: string): boolean {
    return (
      page.params.id === workspaceId &&
      page.url.pathname.includes(`/${subPage}`)
    );
  }
</script>

<Sidebar.Root {...restProps} bind:ref>
  <Sidebar.Header>
    <div class="flex items-center gap-2 px-2 py-2">
      <div
        class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md"
      >
        <GalleryVerticalEndIcon class="size-5" />
      </div>
      <span class="text-lg font-semibold">Vault</span>
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <!-- My Workspaces Section -->
    <Sidebar.Group>
      <div class="flex items-center justify-between px-2 py-1.5">
        <Sidebar.GroupLabel class="text-xs">My Workspaces</Sidebar.GroupLabel>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          onclick={openCreateDialog}
        >
          <PlusIcon class="h-4 w-4" />
          <span class="sr-only">Add Workspace</span>
        </Button>
      </div>
      <Sidebar.Menu>
        {#each ownedWorkspaces as workspace (workspace.id)}
          <Collapsible.Root
            open={expandedWorkspaces.has(workspace.id)}
            onOpenChange={() => toggleWorkspace(workspace.id)}
            class="group/collapsible"
          >
            <Sidebar.MenuItem>
              <Collapsible.Trigger class="w-full">
                {#snippet child({ props })}
                  <Sidebar.MenuButton
                    {...props}
                    isActive={isWorkspaceActive(workspace.id)}
                    class="pr-2"
                  >
                    <ChevronRightIcon
                      class="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                    />
                    <span class="truncate">{workspace.name}</span>
                  </Sidebar.MenuButton>
                {/snippet}
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Sidebar.MenuSub>
                  <Sidebar.MenuSubItem>
                    <Sidebar.MenuSubButton
                      isActive={isSubPageActive(workspace.id, "files")}
                    >
                      {#snippet child({ props })}
                        <a
                          href={`/dashboard/workspace/${workspace.id}/files`}
                          {...props}
                        >
                          <FolderIcon class="h-4 w-4" />
                          <span>Files</span>
                        </a>
                      {/snippet}
                    </Sidebar.MenuSubButton>
                  </Sidebar.MenuSubItem>
                  <Sidebar.MenuSubItem>
                    <Sidebar.MenuSubButton
                      isActive={isSubPageActive(workspace.id, "settings")}
                    >
                      {#snippet child({ props })}
                        <a
                          href={`/dashboard/workspace/${workspace.id}/settings`}
                          {...props}
                        >
                          <SettingsIcon class="h-4 w-4" />
                          <span>Settings</span>
                        </a>
                      {/snippet}
                    </Sidebar.MenuSubButton>
                  </Sidebar.MenuSubItem>
                </Sidebar.MenuSub>
              </Collapsible.Content>
            </Sidebar.MenuItem>
          </Collapsible.Root>
        {/each}
      </Sidebar.Menu>
    </Sidebar.Group>

    <!-- Shared with me Section -->
    {#if memberWorkspaces.length > 0}
      <Sidebar.Group>
        <div class="flex items-center justify-between px-2 py-1.5">
          <Sidebar.GroupLabel class="text-xs">Shared with me</Sidebar.GroupLabel
          >
        </div>
        <Sidebar.Menu>
          {#each memberWorkspaces as workspace (workspace.id)}
            <Collapsible.Root
              open={expandedWorkspaces.has(workspace.id)}
              onOpenChange={() => toggleWorkspace(workspace.id)}
              class="group/collapsible"
            >
              <Sidebar.MenuItem>
                <Collapsible.Trigger class="w-full">
                  {#snippet child({ props })}
                    <Sidebar.MenuButton
                      {...props}
                      isActive={isWorkspaceActive(workspace.id)}
                      class="pr-2"
                    >
                      <ChevronRightIcon
                        class="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                      <span class="truncate">{workspace.name}</span>
                    </Sidebar.MenuButton>
                  {/snippet}
                </Collapsible.Trigger>
                <Collapsible.Content>
                  <Sidebar.MenuSub>
                    <Sidebar.MenuSubItem>
                      <Sidebar.MenuSubButton
                        isActive={isSubPageActive(workspace.id, "files")}
                      >
                        {#snippet child({ props })}
                          <a
                            href={`/dashboard/workspace/${workspace.id}/files`}
                            {...props}
                          >
                            <FolderIcon class="h-4 w-4" />
                            <span>Files</span>
                          </a>
                        {/snippet}
                      </Sidebar.MenuSubButton>
                    </Sidebar.MenuSubItem>
                  </Sidebar.MenuSub>
                </Collapsible.Content>
              </Sidebar.MenuItem>
            </Collapsible.Root>
          {/each}
        </Sidebar.Menu>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser {user} />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>

{#if workspaceForm}
  <WorkspaceFormDialog
    bind:open={dialogOpen}
    data={workspaceForm}
    mode="create"
  />
{/if}
