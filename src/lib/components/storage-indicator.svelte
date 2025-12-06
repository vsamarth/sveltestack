<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";
  import { formatBytes } from "$lib/utils";
  import type { UserPlan } from "$lib/server/db/schema/auth";
  import { AlertTriangleIcon } from "@lucide/svelte";

  interface Props {
    used: number;
    total: number;
    plan: UserPlan;
    percentage: number;
  }

  let { used, total, plan, percentage }: Props = $props();

  const usedFormatted = $derived(formatBytes(used));
  const totalFormatted = $derived(formatBytes(total));
  const isNearLimit = $derived(percentage >= 80);
  const isAtLimit = $derived(percentage >= 100);

  // Determine progress bar variant based on usage
  const progressVariant = $derived(() => {
    if (percentage >= 95) return "destructive";
    if (percentage >= 80) return "warning";
    return "default";
  });
</script>

<div class="px-2 py-2 space-y-2">
  <div class="flex items-center justify-between text-xs">
    <span class="text-muted-foreground">Storage</span>
    <span class="font-medium">
      {usedFormatted} / {totalFormatted}
    </span>
  </div>

  <Progress value={percentage} max={100} variant={progressVariant()} />

  {#if isNearLimit && plan === "free"}
    <div
      class="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 p-2 text-xs"
    >
      <AlertTriangleIcon
        class="size-3 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5"
      />
      <div class="flex-1 space-y-1">
        <p class="font-medium text-amber-900 dark:text-amber-100">
          Storage almost full
        </p>
        <p class="text-amber-700 dark:text-amber-300">
          Upgrade to Pro for more space
        </p>
      </div>
    </div>
  {:else if isAtLimit}
    <div
      class="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs"
    >
      <AlertTriangleIcon class="size-3 shrink-0 text-destructive mt-0.5" />
      <div class="flex-1 space-y-1">
        <p class="font-medium text-destructive">Storage limit reached</p>
        <p class="text-muted-foreground">Delete files or upgrade to Pro</p>
      </div>
    </div>
  {/if}
</div>
