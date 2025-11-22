<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  let { data, children } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar
    workspaces={data.workspaces}
    user={{ ...data.user, image: data.user.image ?? null }}
  />
  <Sidebar.Inset>
    <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Sidebar.Trigger class="-ml-1" />
    </header>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
