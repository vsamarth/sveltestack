<script lang="ts">
  import type { PageData } from "./$types";
  import { siteConfig } from "$lib/config";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Table from "$lib/components/ui/table";
  import * as Avatar from "$lib/components/ui/avatar";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import { Spinner } from "$lib/components/ui/spinner";
  import {
    UserPlusIcon,
    Trash2Icon,
    AlertTriangleIcon,
    CrownIcon,
    UsersIcon,
    MailIcon,
    MoreHorizontal,
    UserMinusIcon,
    XCircleIcon,
    ClockIcon,
    PencilIcon,
    CheckIcon,
    XIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { goto, invalidateAll } from "$app/navigation";
  import {
    updateWorkspace,
    deleteWorkspace,
    cancelInvite,
    removeMember,
  } from "$lib/remote/actions.remote";
  import InviteMemberDialog from "$lib/components/invite-member-dialog.svelte";

  let { data }: { data: PageData } = $props();

  // Workspace name inline edit
  let isEditingName = $state(false);
  let editedName = $state(data.workspace.name);
  let isSavingName = $state(false);
  let nameInputRef = $state<HTMLInputElement | null>(null);

  function startEditingName() {
    editedName = data.workspace.name;
    isEditingName = true;
    // Focus input after it renders
    setTimeout(() => nameInputRef?.focus(), 0);
  }

  function cancelEditingName() {
    isEditingName = false;
    editedName = data.workspace.name;
  }

  async function saveWorkspaceName() {
    if (!editedName.trim() || editedName === data.workspace.name) {
      cancelEditingName();
      return;
    }

    isSavingName = true;
    try {
      await updateWorkspace({
        workspaceId: data.workspace.id,
        name: editedName.trim(),
      });
      await invalidateAll();
      isEditingName = false;
      toast.success("Workspace renamed successfully");
    } catch (error) {
      console.error("Failed to rename workspace:", error);
      toast.error("Failed to rename workspace");
    } finally {
      isSavingName = false;
    }
  }

  function handleNameKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveWorkspaceName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditingName();
    }
  }

  // Delete workspace dialog
  let deleteDialogOpen = $state(false);
  let deleteConfirmation = $state("");
  let isDeleting = $state(false);

  async function handleDeleteWorkspace() {
    if (deleteConfirmation !== data.workspace.name) return;

    isDeleting = true;
    try {
      const result = await deleteWorkspace(data.workspace.id);
      await invalidateAll();
      toast.success("Workspace deleted successfully");
      await goto(result.redirectTo);
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      toast.error("Failed to delete workspace");
    } finally {
      isDeleting = false;
      deleteDialogOpen = false;
    }
  }

  // Invite dialog
  let inviteDialogOpen = $state(false);

  // Remove member dialog
  let removeMemberDialogOpen = $state(false);
  let memberToRemove = $state<{
    userId: string;
    name: string;
  } | null>(null);
  let isRemovingMember = $state(false);

  function openRemoveMemberDialog(userId: string, name: string) {
    memberToRemove = { userId, name };
    removeMemberDialogOpen = true;
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;

    isRemovingMember = true;
    try {
      await removeMember({
        workspaceId: data.workspace.id,
        userId: memberToRemove.userId,
      });
      await invalidateAll();
      toast.success("Member removed", {
        description: `${memberToRemove.name} has been removed from this workspace.`,
      });
      removeMemberDialogOpen = false;
      memberToRemove = null;
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    } finally {
      isRemovingMember = false;
    }
  }

  // Cancel invite
  async function handleCancelInvite(inviteId: string, email: string) {
    try {
      await cancelInvite(inviteId);
      await invalidateAll();
      toast.success("Invitation cancelled", {
        description: `The invitation to ${email} has been cancelled.`,
      });
    } catch (error) {
      console.error("Failed to cancel invite:", error);
      toast.error("Failed to cancel invitation");
    }
  }

  // Format date
  function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Get initials from name
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Total members including owner
  // const totalMembers = $derived(data.members.length + 1);
</script>

<svelte:head>
  <title>Settings - {data.workspace.name} | {siteConfig.name}</title>
  <meta
    name="description"
    content="Manage settings for the {data.workspace.name} workspace."
  />
</svelte:head>

<div class="flex flex-col items-center h-full p-6 gap-8">
  <div class="w-full max-w-6xl mx-auto space-y-12">
    <!-- Workspace Details Section -->
    <div class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight mb-2">
            Workspace Settings
          </h2>
          <p class="text-muted-foreground">
            Manage your workspace configuration.
          </p>
        </div>
      </div>

      <div class="w-full overflow-hidden rounded-lg border bg-card">
        <div class="p-4 flex items-center justify-between">
          <div class="flex-1">
            <p class="text-xs font-medium text-muted-foreground mb-1.5">
              Workspace Name
            </p>
            {#if isEditingName}
              <div class="flex items-center gap-2">
                <Input
                  bind:ref={nameInputRef}
                  type="text"
                  bind:value={editedName}
                  onkeydown={handleNameKeydown}
                  disabled={isSavingName}
                  class="h-9 max-w-xs text-base"
                  placeholder="Enter workspace name"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                  onclick={saveWorkspaceName}
                  disabled={isSavingName || !editedName.trim()}
                >
                  {#if isSavingName}
                    <Spinner class="h-4 w-4" />
                  {:else}
                    <CheckIcon class="h-4 w-4" />
                  {/if}
                  <span class="sr-only">Save</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onclick={cancelEditingName}
                  disabled={isSavingName}
                >
                  <XIcon class="h-4 w-4" />
                  <span class="sr-only">Cancel</span>
                </Button>
              </div>
            {:else}
              <button
                type="button"
                onclick={startEditingName}
                class="group flex items-center gap-2 text-left hover:bg-muted/50 -ml-2 px-2 py-1 rounded-md transition-colors"
              >
                <span class="text-base font-medium">{data.workspace.name}</span>
                <PencilIcon
                  class="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Members Section -->
    <div class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight mb-2">Members</h2>
          <p class="text-muted-foreground">
            People who have access to this workspace.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onclick={() => (inviteDialogOpen = true)}
        >
          <UserPlusIcon class="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div class="w-full overflow-hidden rounded-lg border bg-card">
        <Table.Root class="table-fixed w-full">
          <Table.Header>
            <Table.Row class="hover:bg-transparent border-b-0 bg-muted/20">
              <Table.Head class="w-12 pl-4 h-10"></Table.Head>
              <Table.Head class="font-normal text-xs text-muted-foreground h-10"
                >Name</Table.Head
              >
              <Table.Head
                class="font-normal text-xs text-muted-foreground w-28 h-10"
                >Role</Table.Head
              >
              <Table.Head
                class="font-normal text-xs text-muted-foreground w-32 h-10"
                >Joined</Table.Head
              >
              <Table.Head
                class="text-right font-normal text-xs text-muted-foreground pr-4 w-20 h-10"
              ></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <!-- Owner row -->
            <Table.Row class="group hover:bg-muted/40 border-b last:border-b-0">
              <Table.Cell class="py-3 pl-4 w-12">
                <Avatar.Root class="h-8 w-8">
                  {#if data.owner.image}
                    <Avatar.Image
                      src={data.owner.image}
                      alt={data.owner.name}
                    />
                  {/if}
                  <Avatar.Fallback class="text-xs bg-primary/10 text-primary">
                    {getInitials(data.owner.name)}
                  </Avatar.Fallback>
                </Avatar.Root>
              </Table.Cell>
              <Table.Cell class="py-3 min-w-0">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-foreground truncate">
                    {data.owner.name}
                    {#if data.owner.id === data.currentUserId}
                      <span class="text-muted-foreground font-normal"
                        >(You)</span
                      >
                    {/if}
                  </span>
                  <span class="text-xs text-muted-foreground truncate">
                    {data.owner.email}
                  </span>
                </div>
              </Table.Cell>
              <Table.Cell class="py-3 w-28">
                <Badge variant="default" class="text-xs gap-1">
                  <CrownIcon class="h-3 w-3" />
                  Owner
                </Badge>
              </Table.Cell>
              <Table.Cell class="py-3 w-32">
                <span class="text-sm text-muted-foreground">
                  {formatDate(data.owner.createdAt)}
                </span>
              </Table.Cell>
              <Table.Cell class="py-3 pr-4 text-right w-20"></Table.Cell>
            </Table.Row>

            <!-- Member rows -->
            {#each data.members as member (member.id)}
              <Table.Row
                class="group hover:bg-muted/40 border-b last:border-b-0"
              >
                <Table.Cell class="py-3 pl-4 w-12">
                  <Avatar.Root class="h-8 w-8">
                    {#if member.userImage}
                      <Avatar.Image
                        src={member.userImage}
                        alt={member.userName}
                      />
                    {/if}
                    <Avatar.Fallback class="text-xs bg-muted">
                      {getInitials(member.userName)}
                    </Avatar.Fallback>
                  </Avatar.Root>
                </Table.Cell>
                <Table.Cell class="py-3 min-w-0">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-foreground truncate">
                      {member.userName}
                      {#if member.userId === data.currentUserId}
                        <span class="text-muted-foreground font-normal"
                          >(You)</span
                        >
                      {/if}
                    </span>
                    <span class="text-xs text-muted-foreground truncate">
                      {member.userEmail}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell class="py-3 w-28">
                  <Badge variant="outline" class="text-xs">Member</Badge>
                </Table.Cell>
                <Table.Cell class="py-3 w-32">
                  <span class="text-sm text-muted-foreground">
                    {formatDate(member.createdAt)}
                  </span>
                </Table.Cell>
                <Table.Cell class="py-3 pr-4 text-right w-20">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      {#snippet child({ props })}
                        <Button
                          {...props}
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal class="h-4 w-4" />
                          <span class="sr-only">Actions</span>
                        </Button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-40">
                      <DropdownMenu.Item
                        onclick={() =>
                          openRemoveMemberDialog(
                            member.userId,
                            member.userName,
                          )}
                        class="cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <UserMinusIcon class="mr-2 h-4 w-4" />
                        <span>Remove</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>

        {#if data.members.length === 0}
          <div
            class="flex flex-col items-center justify-center py-12 text-center border-t border-dashed"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4"
            >
              <UsersIcon class="h-6 w-6 text-muted-foreground" />
            </div>
            <p class="text-sm font-medium text-foreground mb-1">
              No members yet
            </p>
            <p class="text-sm text-muted-foreground">
              Invite someone to collaborate on this workspace.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Pending Invites Section -->
    {#if data.pendingInvites.length > 0}
      <div class="space-y-4">
        <div class="flex items-end justify-between">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight mb-2">
              Pending Invites
            </h2>
            <p class="text-muted-foreground">
              Invitations that haven't been accepted yet.
            </p>
          </div>
        </div>

        <div class="w-full overflow-hidden rounded-lg border bg-card">
          <Table.Root class="table-fixed w-full">
            <Table.Header>
              <Table.Row class="hover:bg-transparent border-b-0 bg-muted/20">
                <Table.Head class="w-12 pl-4 h-10"></Table.Head>
                <Table.Head
                  class="font-normal text-xs text-muted-foreground h-10"
                  >Email</Table.Head
                >
                <Table.Head
                  class="font-normal text-xs text-muted-foreground w-28 h-10"
                  >Status</Table.Head
                >
                <Table.Head
                  class="font-normal text-xs text-muted-foreground w-32 h-10"
                  >Sent</Table.Head
                >
                <Table.Head
                  class="text-right font-normal text-xs text-muted-foreground pr-4 w-20 h-10"
                ></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each data.pendingInvites as invite (invite.id)}
                <Table.Row
                  class="group hover:bg-muted/40 border-b last:border-b-0"
                >
                  <Table.Cell class="py-3 pl-4 w-12">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                    >
                      <MailIcon class="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Table.Cell>
                  <Table.Cell class="py-3 min-w-0">
                    <span class="text-sm font-medium text-foreground truncate">
                      {invite.email}
                    </span>
                  </Table.Cell>
                  <Table.Cell class="py-3 w-28">
                    <Badge
                      variant="secondary"
                      class="text-xs gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    >
                      <ClockIcon class="h-3 w-3" />
                      Pending
                    </Badge>
                  </Table.Cell>
                  <Table.Cell class="py-3 w-32">
                    <span class="text-sm text-muted-foreground">
                      {formatDate(invite.createdAt)}
                    </span>
                  </Table.Cell>
                  <Table.Cell class="py-3 pr-4 text-right w-20">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                          <Button
                            {...props}
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal class="h-4 w-4" />
                            <span class="sr-only">Actions</span>
                          </Button>
                        {/snippet}
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" class="w-40">
                        <DropdownMenu.Item
                          onclick={() =>
                            handleCancelInvite(invite.id, invite.email)}
                          class="cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <XCircleIcon class="mr-2 h-4 w-4" />
                          <span>Cancel Invite</span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    {/if}

    <!-- Danger Zone Section -->
    <div class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2
            class="text-2xl font-semibold tracking-tight mb-2 text-destructive flex items-center gap-2"
          >
            <AlertTriangleIcon class="h-6 w-6" />
            Danger Zone
          </h2>
          <p class="text-muted-foreground">
            Irreversible and destructive actions.
          </p>
        </div>
      </div>

      <div
        class="w-full overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-foreground">Delete this workspace</p>
            <p class="text-sm text-muted-foreground mt-1">
              Permanently delete this workspace and all of its files. This
              action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onclick={() => (deleteDialogOpen = true)}
          >
            <Trash2Icon class="h-4 w-4 mr-2" />
            Delete Workspace
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Delete Workspace Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete Workspace</Dialog.Title>
      <Dialog.Description>
        This action cannot be undone. This will permanently delete the
        <span class="font-semibold">{data.workspace.name}</span>
        workspace and all of its files.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <p class="text-sm text-muted-foreground">
        To confirm, type
        <span class="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded"
          >{data.workspace.name}</span
        >
        below:
      </p>
      <Input
        bind:value={deleteConfirmation}
        placeholder="Type workspace name to confirm"
        class="w-full"
      />
    </div>
    <Dialog.Footer class="gap-2">
      <Button
        variant="outline"
        onclick={() => {
          deleteDialogOpen = false;
          deleteConfirmation = "";
        }}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        onclick={handleDeleteWorkspace}
        disabled={deleteConfirmation !== data.workspace.name || isDeleting}
      >
        {#if isDeleting}
          <Spinner class="mr-2" />
        {/if}
        Delete Workspace
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Invite Member Dialog -->
<InviteMemberDialog
  bind:open={inviteDialogOpen}
  workspaceId={data.workspace.id}
  workspaceName={data.workspace.name}
/>

<!-- Remove Member Confirmation Dialog -->
<Dialog.Root bind:open={removeMemberDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Remove Member</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to remove
        <span class="font-semibold">{memberToRemove?.name}</span>
        from this workspace? They will lose access to all files.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button
        variant="outline"
        onclick={() => {
          removeMemberDialogOpen = false;
          memberToRemove = null;
        }}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        onclick={handleRemoveMember}
        disabled={isRemovingMember}
      >
        {#if isRemovingMember}
          <Spinner class="mr-2" />
        {/if}
        Remove Member
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
