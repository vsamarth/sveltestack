<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import type { User, Workspace } from "$lib/server/db/schema";
  import {
    EllipsisIcon,
    Trash2Icon,
    PlusIcon,
    PencilIcon,
  } from "@lucide/svelte";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import * as Tooltip from "./ui/tooltip";
  import * as Dialog from "./ui/dialog";
  import { page } from "$app/state";
  import NavUser from "./nav-user.svelte";
  import WorkspaceFormDialog from "./workspace-form-dialog.svelte";
  import type { SuperValidated } from "sveltekit-superforms";
  import type { WorkspaceSchema } from "$lib/validation";
  import { deleteWorkspace } from "$lib/remote/workspace.remote";
  import { goto, invalidateAll } from "$app/navigation";

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
  let dialogOpen = $state(false);
  let dialogMode = $state<"create" | "rename">("create");
  let selectedWorkspaceId = $state("");
  let selectedWorkspaceName = $state("");
  let deleteDialogOpen = $state(false);
  let workspaceToDelete = $state<{ id: string; name: string } | null>(null);

  function openCreateDialog() {
    dialogMode = "create";
    dialogOpen = true;
  }

  function openRenameDialog(workspaceId: string, name: string) {
    dialogMode = "rename";
    selectedWorkspaceId = workspaceId;
    selectedWorkspaceName = name;
    dialogOpen = true;
  }

  function openDeleteWorkspaceDialog(workspaceId: string, name: string) {
    workspaceToDelete = { id: workspaceId, name };
    deleteDialogOpen = true;
  }

  async function confirmDeleteWorkspace() {
    if (!workspaceToDelete) return;

    try {
      const result = await deleteWorkspace(workspaceToDelete.id);
      deleteDialogOpen = false;
      workspaceToDelete = null;
      await invalidateAll();
      await goto(result.redirectTo);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
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
    <Sidebar.Group>
      <div class="flex items-center justify-between px-2 py-1.5">
        <Sidebar.GroupLabel class="text-xs">Workspaces</Sidebar.GroupLabel>
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
                <DropdownMenu.Item
                  onclick={() => openRenameDialog(item.id, item.name)}
                >
                  <PencilIcon class="text-muted-foreground" />
                  <span>Rename Workspace</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
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
                    onclick={() =>
                      openDeleteWorkspaceDialog(item.id, item.name)}
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
  <WorkspaceFormDialog
    bind:open={dialogOpen}
    data={workspaceForm}
    mode={dialogMode}
    workspaceId={selectedWorkspaceId}
    currentName={selectedWorkspaceName}
  />
{/if}

<!-- Delete Workspace Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete Workspace</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete
        <span class="font-semibold">{workspaceToDelete?.name}</span>? This
        action cannot be undone and all files in this workspace will be
        permanently removed.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button
        variant="outline"
        onclick={() => {
          deleteDialogOpen = false;
          workspaceToDelete = null;
        }}
      >
        Cancel
      </Button>
      <Button variant="destructive" onclick={confirmDeleteWorkspace}>
        Delete Workspace
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
