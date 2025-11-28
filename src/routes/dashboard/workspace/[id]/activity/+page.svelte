<script lang="ts">
  import type { PageData } from "./$types";
  import { siteConfig } from "$lib/config";
  import ActivityFeed from "$lib/components/activity-feed.svelte";
  import { ActivityIcon } from "@lucide/svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Activity | {data.workspace.name} | {siteConfig.name}</title>
</svelte:head>

<div class="flex flex-col items-center h-full p-6 gap-8">
  <div class="w-full max-w-6xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-end justify-between mb-8">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight mb-2">Activity</h2>
        <p class="text-muted-foreground">
          Recent activity in {data.workspace.name}
        </p>
      </div>
    </div>

    <!-- Activity Feed -->
    {#if data.activities.length === 0}
      <!-- Empty State -->
      <div role="region" aria-label="Empty activity state" class="w-full">
        <div
          class="bg-card border border-border rounded-lg shadow-sm py-16 px-8 flex flex-col items-center justify-center min-h-[400px]"
        >
          <div
            class="bg-muted/60 text-muted-foreground rounded-full size-10 flex items-center justify-center mb-6 shrink-0"
            aria-hidden="true"
          >
            <ActivityIcon class="size-6" />
          </div>
          <h3 class="text-lg font-semibold text-foreground mb-2 text-center">
            No activity yet
          </h3>
          <p class="text-muted-foreground text-center max-w-sm">
            Activity in this workspace will show up here.
          </p>
        </div>
      </div>
    {:else}
      <div class="w-full">
        <ActivityFeed
          activities={data.activities}
          currentUserId={data.user.id}
        />
      </div>
    {/if}
  </div>
</div>
