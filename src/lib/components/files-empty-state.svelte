<script lang="ts">
  import { Cloud } from "@lucide/svelte";

  let {
    disabled = false,
    disabledMessage = "You've reached your storage limit for this workspace.",
  }: {
    disabled?: boolean;
    disabledMessage?: string;
  } = $props();
</script>

<div
  role="region"
  aria-label="Empty files state - upload area"
  class="w-full max-w-[960px] mx-auto"
>
  <div
    class="bg-card border border-border rounded-lg shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-accent/5 py-16 px-8 sm:py-12 sm:px-6 flex flex-col items-center justify-center min-h-[400px]"
  >
    <!-- Icon Container -->
    <div
      class="bg-muted/60 text-muted-foreground rounded-full size-10 flex items-center justify-center mb-6 shrink-0"
      aria-hidden="true"
    >
      <Cloud class="size-6" />
    </div>

    <!-- Title -->
    <h3 class="text-lg font-medium text-foreground mb-2 tracking-tight">
      {#if disabled}
        Upload unavailable
      {:else}
        Nothing here yet
      {/if}
    </h3>

    <!-- Description -->
    {#if disabled}
      <p
        class="text-sm text-muted-foreground text-center max-w-md leading-relaxed"
      >
        {disabledMessage}
      </p>
    {:else}
      <p
        class="text-sm text-muted-foreground text-center max-w-md leading-relaxed"
      >
        Drag files here to upload, or click Add Files above.
      </p>
    {/if}
  </div>
</div>
