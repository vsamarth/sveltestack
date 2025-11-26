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
    enableDropzone?: boolean;
  }

  let {
    files,
    onRemove,
    onStartUpload,
    isUploading,
    openFileDialog,
    enableDropzone = true,
  }: Props = $props();

  let isDragging = $state(false);
  let inputElement: HTMLInputElement;

  const hasFiles = $derived(files.length > 0);
  const gridCols = $derived(files.length === 1 ? "grid-cols-1" : "grid-cols-2");
  const totalSize = $derived(
    files.reduce((acc, file) => acc + (file.size ?? 0), 0),
  );

  const { getRootProps, getInputProps } = useDropzone({
    noClick: true,
    onDragOver: () => {
      if (enableDropzone) isDragging = true;
    },
    onDragLeave: () => {
      if (enableDropzone) isDragging = false;
    },
    onDrop: () => {
      if (enableDropzone) isDragging = false;
    },
  });

  function handleCardClick() {
    if (!hasFiles && inputElement) {
      inputElement.click();
    }
  }

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

  $effect(() => {
    if (openFileDialog && inputElement) {
      openFileDialog(() => inputElement.click());
    }
  });
</script>

{#snippet emptyState()}
  <div class="flex flex-col items-center gap-2 text-center">
    <div class={emptyMediaVariants({ variant: "icon" })}>
      <CloudIcon />
    </div>
    <div class="text-lg font-medium tracking-tight">
      {isDragging ? "Drop files here" : "Nothing here yet"}
    </div>
    <div class="text-muted-foreground text-sm/relaxed">
      {isDragging
        ? "Release to add files to this workspace"
        : "Drag and drop files here or click to browse"}
    </div>
  </div>
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
  class="transition-colors shadow-none w-full {isDragging
    ? 'border-dashed border-2 border-primary'
    : hasFiles
      ? 'border-transparent'
      : 'border-transparent'} {hasFiles
    ? 'p-6 max-w-lg'
    : 'p-12 h-full flex items-center justify-center'} {!hasFiles
    ? 'cursor-pointer hover:bg-muted/20'
    : ''}"
  {...enableDropzone ? getRootProps() : {}}
  onclick={handleCardClick}
  role={hasFiles ? undefined : "button"}
  tabindex={hasFiles ? undefined : 0}
  onkeydown={(e) => {
    if (!hasFiles && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleCardClick();
    }
  }}
>
  <input
    bind:this={inputElement}
    {...enableDropzone ? getInputProps() : {}}
    class="hidden sr-only"
  />

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
