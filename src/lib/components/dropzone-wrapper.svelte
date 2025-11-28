<script lang="ts">
  import { useDropzone } from "@uppy/svelte";
  import { CloudIcon } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { emptyMediaVariants } from "./ui/empty/empty-media.svelte";

  let { children }: { children: Snippet } = $props();

  let isDragging = $state(false);

  const { getRootProps, getInputProps } = useDropzone({
    noClick: true,
    onDragOver: () => {
      isDragging = true;
    },
    onDragLeave: () => {
      isDragging = false;
    },
    onDrop: () => {
      isDragging = false;
    },
  });
</script>

<div
  {...getRootProps()}
  class="relative w-full h-full outline-none"
  data-testid="file-dropzone"
>
  <input {...getInputProps()} class="hidden sr-only" />

  {@render children()}

  {#if isDragging}
    <div
      class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg pointer-events-none"
      data-testid="file-dropzone-overlay"
    >
      <div class={emptyMediaVariants({ variant: "icon" })}>
        <CloudIcon />
      </div>
      <div class="text-lg font-medium tracking-tight">Drop files here</div>
      <div class="text-muted-foreground text-sm/relaxed">
        Release to add files to this workspace
      </div>
    </div>
  {/if}
</div>
