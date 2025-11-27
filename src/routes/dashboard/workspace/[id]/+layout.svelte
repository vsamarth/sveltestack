<script lang="ts">
  import { page } from "$app/state";

  let lastTrackedId = $state<string | null>(null);
  let { children } = $props();

  $effect(() => {
    const workspaceId = page.params.id;
    if (workspaceId && workspaceId !== lastTrackedId) {
      fetch(`/dashboard/workspace/${workspaceId}`, { method: "POST" }).catch(
        (err) => console.error("Failed to set last active workspace:", err),
      );
      lastTrackedId = workspaceId;
    }
  });
</script>

{@render children()}
