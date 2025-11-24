<script lang="ts">
  import { useDropzone } from "@uppy/svelte";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Spinner } from "$lib/components/ui/spinner";
  import {
    CloudIcon,
    CheckCircle2Icon,
    XCircleIcon,
    FileIcon,
    XIcon,
    UploadIcon,
  } from "@lucide/svelte";
  import { emptyMediaVariants } from "./ui/empty/empty-media.svelte";
  import type { UppyFile, Meta } from "@uppy/core";
  import prettyBytes from "pretty-bytes";

  type FileWithProgress = UppyFile<Meta, Record<string, never>> & {
    progress?: {
      percentage: number;
      bytesUploaded: number;
      bytesTotal: number;
    };
  };

  interface Props {
    files: FileWithProgress[];
    onRemove: (fileId: string) => void;
    onStartUpload: () => void;
    isUploading: boolean;
    openFileDialog?: (openFn: () => void) => void;
  }

  let { files, onRemove, onStartUpload, isUploading, openFileDialog }: Props =
    $props();

  let isDragging = $state(false);
  let inputElement: HTMLInputElement;

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

  function getFileIcon(file: FileWithProgress) {
    const error = file.error;
    const isComplete = file.progress?.percentage === 100;

    if (error) return XCircleIcon;
    if (isComplete) return CheckCircle2Icon;
    return FileIcon;
  }

  function getIconColor(file: FileWithProgress) {
    const error = file.error;
    const isComplete = file.progress?.percentage === 100;

    if (error) return "text-destructive";
    if (isComplete) return "text-green-600";
    return "text-muted-foreground";
  }

  const hasFiles = $derived(files.length > 0);
  const gridCols = $derived(files.length === 1 ? "grid-cols-1" : "grid-cols-2");
  const totalSize = $derived(
    files.reduce((acc, file) => acc + (file.size ?? 0), 0),
  );

  $effect(() => {
    if (openFileDialog && inputElement) {
      openFileDialog(() => inputElement.click());
    }
  });
</script>

{#snippet emptyState()}
  <Card.Content>
    <div class="flex flex-col items-center gap-2 text-center">
      <div class={emptyMediaVariants({ variant: "icon" })}>
        <CloudIcon />
      </div>
      <div class="text-lg font-medium tracking-tight">Nothing here yet</div>
      <div class="text-muted-foreground text-sm/relaxed">
        Start by uploading your files to this workspace.
      </div>
    </div>
  </Card.Content>
{/snippet}

{#snippet fileCard(file: FileWithProgress)}
  {@const Icon = getFileIcon(file)}
  {@const progress = file.progress?.percentage ?? 0}
  {@const isUploadingFile = progress > 0 && progress < 100}
  {@const isComplete = progress === 100}

  <div
    class="relative flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors overflow-hidden"
  >
    <!-- Progress indicator as background -->
    {#if isUploadingFile}
      <div
        class="absolute inset-0 bg-primary/5 transition-all duration-300 ease-out"
        style="width: {progress}%"
      ></div>
    {/if}

    <div class="relative {getIconColor(file)}">
      {#if isUploadingFile}
        <Spinner class="size-5" />
      {:else}
        <Icon class="size-5" />
      {/if}
    </div>

    <div class="relative flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="font-medium text-sm truncate">{file.name}</p>
          <p class="text-xs text-muted-foreground">
            {prettyBytes(file.size ?? 0)}
          </p>
        </div>

        {#if !isUploadingFile && !isComplete}
          <Button
            size="icon"
            variant="ghost"
            class="size-6 shrink-0"
            onclick={() => onRemove(file.id)}
          >
            <XIcon class="size-4" />
          </Button>
        {/if}
      </div>

      {#if file.error}
        <p class="text-xs text-destructive mt-1">
          {file.error}
        </p>
      {/if}
    </div>
  </div>
{/snippet}

<Card.Root
  class="border-dashed border-2 transition-colors shadow-none w-full max-w-lg {isDragging
    ? 'border-primary/20 bg-muted/5'
    : hasFiles
      ? 'border-transparent'
      : 'border-transparent'} {hasFiles ? 'p-6' : 'p-12'}"
  {...getRootProps()}
>
  <input bind:this={inputElement} {...getInputProps()} class="hidden sr-only" />

  {#if hasFiles}
    <Card.Content class="grid {gridCols} gap-3">
      {#each files as file (file.id)}
        {@render fileCard(file)}
      {/each}
    </Card.Content>

    <div
      class="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm text-muted-foreground">
          {prettyBytes(totalSize)}
        </div>
        <Button size="sm" onclick={onStartUpload} disabled={isUploading}>
          {#if isUploading}
            <Spinner class="size-4" />
            Uploading...
          {:else}
            <UploadIcon class="size-4" />
            Upload {files.length}
            {files.length === 1 ? "file" : "files"}
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    {@render emptyState()}
  {/if}
</Card.Root>
