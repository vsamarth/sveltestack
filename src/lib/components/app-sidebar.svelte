<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  import type { User, Workspace } from "$lib/server/db/schema";
  import {
    EllipsisIcon,
    FolderIcon,
    ShareIcon,
    Trash2Icon,
  } from "@lucide/svelte";
  import * as DropdownMenu from "./ui/dropdown-menu";
  import { page } from "$app/state";
  import NavUser from "./nav-user.svelte";

  let {
    workspaces = [],
    user,
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> & {
    workspaces?: Workspace[];
    user: User;
  } = $props();

  const sidebar = Sidebar.useSidebar();
</script>

<Sidebar.Root {...restProps} bind:ref>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Workspaces</Sidebar.GroupLabel>
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
                <DropdownMenu.Item>
                  <FolderIcon class="text-muted-foreground" />
                  <span>View Project</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                  <ShareIcon class="text-muted-foreground" />
                  <span>Share Project</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item>
                  <Trash2Icon class="text-muted-foreground" />
                  <span>Delete Project</span>
                </DropdownMenu.Item>
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
