<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import VerificationBanner from "$lib/components/verification-banner.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  let { data, children } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar
    ownedWorkspaces={data.ownedWorkspaces}
    memberWorkspaces={data.memberWorkspaces}
    user={{ ...data.user, image: data.user.image ?? null }}
    workspaceForm={data.workspaceForm}
    storageUsage={data.storageUsage}
  />
  <Sidebar.Inset class="p-12">
    {#if !data.user.emailVerified}
      <div class="px-4 pb-4">
        <VerificationBanner email={data.user.email} />
      </div>
    {/if}

    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
