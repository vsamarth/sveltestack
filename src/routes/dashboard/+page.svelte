<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import WorkspaceFormDialog from "$lib/components/workspace-form-dialog.svelte";
  import { FolderIcon } from "@lucide/svelte";
  import { page } from "$app/state";
  import { siteConfig } from "$lib/config";

  let createDialogOpen = $state(false);
</script>

<svelte:head>
  <title>Workspaces | {siteConfig.name}</title>
  <meta
    name="description"
    content="Manage your workspaces and files securely from your {siteConfig.name} dashboard."
  />
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
  <div class="mx-auto flex max-w-md flex-col items-center text-center">
    <div
      class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted"
    >
      <FolderIcon class="h-10 w-10 text-muted-foreground" />
    </div>
    <h1 class="mb-2 text-2xl font-semibold tracking-tight">
      No Workspaces Yet
    </h1>
    <p class="mb-6 text-muted-foreground">
      Get started by creating your first workspace to organize your files and
      projects.
    </p>
    <Button onclick={() => (createDialogOpen = true)}>
      Create Your First Workspace
    </Button>
  </div>
</div>

{#if page.data.workspaceForm}
  <WorkspaceFormDialog
    bind:open={createDialogOpen}
    data={page.data.workspaceForm}
    mode="create"
  />
{/if}
