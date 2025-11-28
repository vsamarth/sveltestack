<script lang="ts">
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {
    FileIcon,
    Download,
    Trash2,
    Eye,
    FileText,
    Image as ImageIcon,
    FileCode,
    FileArchive,
    Music,
    Video,
    MoreHorizontal,
    Pencil,
    Upload,
  } from "@lucide/svelte";
  import prettyBytes from "pretty-bytes";
  import type { File } from "$lib/server/db/schema";
  import { useFileInput } from "@uppy/svelte";
  import FilesEmptyState from "$lib/components/files-empty-state.svelte";

  type StoredFile = Pick<
    File,
    "id" | "filename" | "size" | "contentType" | "createdAt"
  >;

  let {
    files,
    onDelete,
    onDownload,
    onPreview,
    onRename,
    disabled = false,
    disabledMessage,
  }: {
    files: StoredFile[];
    onDelete: (id: string, name: string) => void;
    onDownload: (id: string, name: string) => void;
    onPreview: (file: StoredFile) => void;
    onRename: (id: string, currentName: string) => void;
    disabled?: boolean;
    disabledMessage?: string;
  } = $props();

  function getFileIcon(contentType: string | null) {
    if (!contentType) return FileIcon;
    if (contentType.startsWith("image/")) return ImageIcon;
    if (contentType.startsWith("video/")) return Video;
    if (contentType.startsWith("audio/")) return Music;
    if (contentType === "application/pdf") return FileText;
    if (
      contentType.includes("zip") ||
      contentType.includes("tar") ||
      contentType.includes("rar")
    )
      return FileArchive;
    if (
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("javascript") ||
      contentType.includes("html") ||
      contentType.includes("css")
    )
      return FileCode;
    return FileIcon;
  }

  function getFileTypeLabel(contentType: string | null) {
    if (!contentType) return "Unknown";
    if (contentType.startsWith("image/")) return "Image";
    if (contentType === "application/pdf") return "PDF";
    if (contentType.startsWith("video/")) return "Video";
    if (contentType.startsWith("audio/")) return "Audio";
    if (contentType.includes("zip")) return "ZIP";
    if (contentType.includes("rar")) return "RAR";
    if (contentType.includes("tar")) return "TAR";
    if (contentType.includes("json")) return "JSON";
    if (contentType.includes("javascript")) return "JS";
    if (contentType.includes("html")) return "HTML";
    if (contentType.includes("css")) return "CSS";
    if (contentType.includes("xml")) return "XML";
    if (contentType.includes("text")) return "Text";
    if (contentType.includes("document")) return "Document";
    return "File";
  }

  function isPreviewable(contentType: string | null) {
    if (!contentType) return false;
    return (
      contentType.startsWith("image/") || contentType === "application/pdf"
    );
  }

  const { getButtonProps, getInputProps } = useFileInput({
    multiple: true,
  });
</script>

<div class="space-y-4">
  <!-- Heading and Action Button -->
  <div class="flex items-end justify-between">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight mb-2">Files</h2>
      <p class="text-muted-foreground">
        Organize and manage files for this workspace.
      </p>
    </div>
    <input class="hidden" data-testid="add-files-input" {...getInputProps()} />
    <Button variant="outline" size="sm" {...getButtonProps()}>
      <Upload class="h-4 w-4 mr-2" />
      Add Files
    </Button>
  </div>

  {#if files.length === 0}
    <!-- Empty State -->
    <FilesEmptyState {disabled} {disabledMessage} />
  {:else}
    <!-- Table -->
    <div class="w-full overflow-hidden rounded-lg border bg-card">
      <Table.Root class="table-fixed w-full">
        <Table.Header>
          <Table.Row class="hover:bg-transparent border-b-0 bg-muted/20">
            <Table.Head class="w-12 pl-4 h-10"></Table.Head>
            <Table.Head class="font-normal text-xs text-muted-foreground h-10"
              >Name</Table.Head
            >
            <Table.Head
              class="font-normal text-xs text-muted-foreground w-32 h-10"
              >Type</Table.Head
            >
            <Table.Head
              class="font-normal text-xs text-muted-foreground w-28 h-10"
              >Size</Table.Head
            >
            <Table.Head
              class="text-right font-normal text-xs text-muted-foreground pr-4 w-24 h-10"
              >Actions</Table.Head
            >
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each files as file (file.id)}
            {@const Icon = getFileIcon(file.contentType)}
            {@const canPreview = isPreviewable(file.contentType)}
            <Table.Row class="group hover:bg-muted/40 border-b last:border-b-0">
              <Table.Cell class="py-3 pl-4 w-12">
                <Icon class="h-4 w-4 text-muted-foreground shrink-0" />
              </Table.Cell>
              <Table.Cell class="py-3 min-w-0 whitespace-normal">
                <span
                  class="text-sm font-normal text-foreground truncate block"
                >
                  {file.filename}
                </span>
              </Table.Cell>
              <Table.Cell class="py-3 w-32">
                <Badge variant="secondary" class="text-xs tracking-wide">
                  {getFileTypeLabel(file.contentType)}
                </Badge>
              </Table.Cell>
              <Table.Cell class="py-3 w-28">
                <span
                  class="text-sm text-muted-foreground font-mono whitespace-nowrap"
                >
                  {prettyBytes(parseInt(file.size || "0"))}
                </span>
              </Table.Cell>
              <Table.Cell class="py-3 pr-4 text-right w-24">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <Button
                        {...props}
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onclick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal class="h-4 w-4" />
                        <span class="sr-only">Actions</span>
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="w-40">
                    {#if canPreview}
                      <DropdownMenu.Item
                        onclick={(e) => {
                          e.stopPropagation();
                          onPreview(file);
                        }}
                        class="cursor-pointer text-sm"
                      >
                        <Eye class="mr-2 h-4 w-4" />
                        <span>Preview</span>
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Item
                      onclick={(e) => {
                        e.stopPropagation();
                        onDownload(file.id, file.filename);
                      }}
                      class="cursor-pointer text-sm"
                    >
                      <Download class="mr-2 h-4 w-4" />
                      <span>Download</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onclick={(e) => {
                        e.stopPropagation();
                        onRename(file.id, file.filename);
                      }}
                      class="cursor-pointer text-sm"
                    >
                      <Pencil class="mr-2 h-4 w-4" />
                      <span>Rename</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onclick={(e) => {
                        e.stopPropagation();
                        onDelete(file.id, file.filename);
                      }}
                      class="cursor-pointer text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 class="mr-2 h-4 w-4 text-destructive" />
                      <span>Delete</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
</div>
