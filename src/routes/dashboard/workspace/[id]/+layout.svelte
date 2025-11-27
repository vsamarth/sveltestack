<script lang="ts">
  import { page } from "$app/state";
  import { setLastActiveWorkspace } from "$lib/remote/actions.remote";

  let lastTrackedId = $state<string | null>(null);
  let { children } = $props();

  $effect(() => {
    const workspaceId = page.params.id;
    if (workspaceId && workspaceId !== lastTrackedId) {
      setLastActiveWorkspace(workspaceId).catch((err) =>
        console.error("Failed to set last active workspace:", err),
      );
      lastTrackedId = workspaceId;
    }
  });
</script>

{@render children()}
