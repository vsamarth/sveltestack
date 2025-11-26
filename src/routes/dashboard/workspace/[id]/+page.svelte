<script lang="ts">
  import FileInput from "$lib/components/file-input.svelte";
  import Uppy, { type UppyFile, type Meta } from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";
  import type { PageData } from "./$types";
  import type { File } from "$lib/server/db/schema";
  import * as Table from "$lib/components/ui/table";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Trash2, Download, FileIcon, Upload, X } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import { enhance } from "$app/forms";
  import prettyBytes from "pretty-bytes";
  import { toast } from "svelte-sonner";

  let { data }: { data: PageData } = $props();

  type FileWithProgress = UppyFile<Meta, Record<string, never>> & {
    progress?: {
      percentage: number;
      bytesUploaded: number;
      bytesTotal: number;
    };
  };

  type StoredFile = Pick<
    File,
    "id" | "filename" | "size" | "contentType" | "createdAt"
  >;

  function createUppyInstance() {
    const instance = new Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxNumberOfFiles: 5,
      },
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        const response = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            workspaceId: data.workspace.id,
            size: file.size,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const responseData = await response.json();

        // Store fileId for confirmation
        file.meta.fileId = responseData.fileId;

        console.log(
          "Upload parameters received for file:",
          file.name,
          responseData,
        );
        return {
          method: responseData.method,
          url: responseData.url,
          headers: responseData.headers,
        };
      },
    });

    // Setup event listeners
    instance.on("file-added", (file) => {
      files = [
        ...files,
        {
          ...file,
          progress: {
            percentage: 0,
            bytesUploaded: 0,
            bytesTotal: file.size ?? 0,
          },
        } as FileWithProgress,
      ];
    });

    instance.on("file-removed", (file) => {
      if (file) {
        files = files.filter((f) => f.id !== file.id);
      }
    });

    instance.on("upload", () => {
      isUploading = true;
    });

    instance.on("upload-progress", (file, progress) => {
      if (file) {
        files = files.map((f) =>
          f.id === file.id
            ? ({
                ...f,
                progress: {
                  percentage: progress.percentage || 0,
                  bytesUploaded: progress.bytesUploaded,
                  bytesTotal: progress.bytesTotal,
                },
              } as FileWithProgress)
            : f,
        );
      }
    });

    instance.on("upload-success", async (file) => {
      if (file && file.meta.fileId) {
        try {
          // Confirm upload in database
          await fetch("/api/upload/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: file.meta.fileId }),
          });

          // Reload files list from server
          await invalidateAll();

          toast.success("File uploaded", {
            description: file.name,
          });
        } catch (error) {
          console.error("Failed to confirm upload:", error);
          toast.error("Failed to confirm upload");
        }

        // Keep file in list with 100% progress briefly, then remove
        setTimeout(() => {
          files = files.filter((f) => f.id !== file.id);
        }, 1000);
      }
    });

    instance.on("upload-error", (file, error) => {
      if (file) {
        files = files.map((f) =>
          f.id === file.id
            ? ({
                ...f,
                error: error.message || "Upload failed",
              } as FileWithProgress)
            : f,
        );
      }
    });

    instance.on("complete", () => {
      isUploading = false;
    });

    instance.on("restriction-failed", (file, error) => {
      if (file) {
        files = files.map((f) =>
          f.id === file?.id
            ? ({ ...f, error: error.message } as FileWithProgress)
            : f,
        );
      }
    });

    return instance;
  }

  let uppy = $state.raw(createUppyInstance());
  let files = $state<FileWithProgress[]>([]);
  let isUploading = $state(false);
  let storedFiles = $state<StoredFile[]>(data.files);
  let isDialogOpen = $state(false);
  let selectedImage = $state<{ url: string; filename: string } | null>(null);

  let triggerFileSelect: (() => void) | null = null;

  // Check if file is an image
  function isImageFile(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType.startsWith("image/");
  }

  // Check if file is a PDF
  function isPdfFile(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType === "application/pdf";
  }

  // Handle file click (for image preview or PDF opening)
  async function handleFileClick(file: StoredFile) {
    const isImage = isImageFile(file.contentType);
    const isPdf = isPdfFile(file.contentType);

    if (!isImage && !isPdf) return;

    try {
      const response = await fetch(
        `/api/workspace/${data.workspace.id}/files/${file.id}/preview`,
      );

      if (!response.ok) {
        console.error("Failed to get preview URL");
        return;
      }

      const { url } = await response.json();

      if (isPdf) {
        // Open PDF in new tab
        window.open(url, "_blank");
      } else if (isImage) {
        // Show image in dialog
        selectedImage = { url, filename: file.filename };
        isDialogOpen = true;
      }
    } catch (error) {
      console.error("Failed to load file preview:", error);
    }
  }

  // Download file
  async function handleDownloadFile(fileId: string, filename: string) {
    try {
      const response = await fetch(
        `/api/workspace/${data.workspace.id}/files/${fileId}/download`,
      );

      if (!response.ok) {
        console.error("Failed to get download URL");
        return;
      }

      const { url } = await response.json();

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  }

  let deleteForm = $state.raw<HTMLFormElement | null>(null);
  let fileIdInput = $state.raw<HTMLInputElement | null>(null);
  let deleteDialogOpen = $state(false);
  let fileToDelete = $state<{ id: string; name: string } | null>(null);

  // Open delete confirmation dialog
  function openDeleteDialog(fileId: string, filename: string) {
    fileToDelete = { id: fileId, name: filename };
    deleteDialogOpen = true;
  }

  // Delete file after confirmation
  function confirmDeleteFile() {
    if (fileToDelete && fileIdInput) {
      fileIdInput.value = fileToDelete.id;
      deleteForm?.requestSubmit();
      toast.success("File deleted", {
        description: fileToDelete.name,
      });
      deleteDialogOpen = false;
      fileToDelete = null;
    }
  }

  // Sync files with server data and cleanup
  $effect(() => {
    storedFiles = data.files;

    return () => {
      // Cleanup on workspace change or component unmount
      uppy.cancelAll();
      uppy.clear();
      const allFiles = uppy.getFiles();
      allFiles.forEach((file) => uppy.removeFile(file.id));
    };
  });

  function handleStartUpload() {
    uppy.upload();
  }

  function handleRemoveFile(fileId: string) {
    uppy.removeFile(fileId);
  }

  function handleSelectFiles() {
    triggerFileSelect?.();
  }
</script>

{#key data.workspace.id}
  <div class="flex flex-col items-center h-full p-6 gap-8">
    <UppyContextProvider {uppy}>
      {#if storedFiles.length === 0}
        <!-- Empty state - centered with no header -->
        <FileInput
          {files}
          {isUploading}
          onRemove={handleRemoveFile}
          onStartUpload={handleStartUpload}
          openFileDialog={(fn) => (triggerFileSelect = fn)}
        />
      {:else}
        <div class="w-full max-w-6xl mx-auto">
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold tracking-tight mb-2">
                Uploaded Files
              </h2>
              <p class="text-muted-foreground">
                Manage your uploaded files for this workspace
              </p>
            </div>
          </div>

          <!-- File upload section -->
          {#if files.length > 0}
            <div class="mb-6">
              <FileInput
                {files}
                {isUploading}
                onRemove={handleRemoveFile}
                onStartUpload={handleStartUpload}
                openFileDialog={(fn) => (triggerFileSelect = fn)}
              />
            </div>
          {:else}
            <!-- Hidden FileInput for file selection -->
            <div class="hidden">
              <FileInput
                {files}
                {isUploading}
                onRemove={handleRemoveFile}
                onStartUpload={handleStartUpload}
                openFileDialog={(fn) => (triggerFileSelect = fn)}
              />
            </div>
          {/if}
          <!-- Compact upload trigger above table -->
          {#if files.length === 0}
            <div
              class="mb-6 flex items-center justify-between p-4 border rounded-lg border-dashed"
            >
              <div>
                <p class="font-medium">Upload more files</p>
                <p class="text-sm text-muted-foreground">
                  Add additional files to this workspace
                </p>
              </div>
              <Button onclick={handleSelectFiles}>
                <Upload class="h-4 w-4 mr-2" />
                Select Files
              </Button>
            </div>
          {/if}

          <!-- Files table -->
          <div class="rounded-lg border bg-card">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="w-12"></Table.Head>
                  <Table.Head class="font-semibold">Name</Table.Head>
                  <Table.Head class="font-semibold">Type</Table.Head>
                  <Table.Head class="font-semibold">Size</Table.Head>
                  <Table.Head class="font-semibold">Uploaded</Table.Head>
                  <Table.Head class="text-right font-semibold"
                    >Actions</Table.Head
                  >
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each storedFiles as file (file.id)}
                  <Table.Row
                    class="hover:bg-muted/50 {isImageFile(file.contentType) ||
                    isPdfFile(file.contentType)
                      ? 'cursor-pointer'
                      : ''}"
                    onclick={(e) => {
                      // Only open preview if clicking on the row, not buttons
                      if (!(e.target as HTMLElement).closest("button")) {
                        handleFileClick(file);
                      }
                    }}
                  >
                    <Table.Cell class="py-3">
                      <div
                        class="flex items-center justify-center w-8 h-8 rounded bg-muted"
                      >
                        <FileIcon class="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Table.Cell>
                    <Table.Cell class="font-medium">
                      {file.filename}
                    </Table.Cell>
                    <Table.Cell>
                      <span class="text-sm text-muted-foreground">
                        {file.contentType || "Unknown"}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span class="text-sm text-muted-foreground">
                        {prettyBytes(parseInt(file.size || "0"))}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span class="text-sm text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </Table.Cell>
                    <Table.Cell class="text-right">
                      <div class="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8"
                          onclick={() =>
                            handleDownloadFile(file.id, file.filename)}
                        >
                          <Download class="h-4 w-4" />
                          <span class="sr-only">Download {file.filename}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8"
                          onclick={() =>
                            openDeleteDialog(file.id, file.filename)}
                        >
                          <Trash2 class="h-4 w-4" />
                          <span class="sr-only">Delete {file.filename}</span>
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      {/if}
    </UppyContextProvider>

    <!-- Image Preview Dialog -->
    <Dialog.Root bind:open={isDialogOpen}>
      <Dialog.Content class="max-w-4xl max-h-[90vh] p-0">
        <Dialog.Header class="p-6 pb-4">
          <Dialog.Title class="text-xl font-semibold">
            {selectedImage?.filename || "Image Preview"}
          </Dialog.Title>
        </Dialog.Header>

        {#if selectedImage}
          <div class="relative w-full overflow-auto px-6 pb-6">
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              class="w-full h-auto rounded-md"
              style="max-height: calc(90vh - 120px); object-fit: contain;"
            />
          </div>
        {/if}

        <Dialog.Close
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Delete File Confirmation Dialog -->
    <Dialog.Root bind:open={deleteDialogOpen}>
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Delete File</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete
            <span class="font-semibold">{fileToDelete?.name}</span>? This action
            cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="gap-2">
          <Button
            variant="outline"
            onclick={() => {
              deleteDialogOpen = false;
              fileToDelete = null;
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onclick={confirmDeleteFile}>
            Delete File
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Hidden form for delete action -->
    <form
      bind:this={deleteForm}
      method="POST"
      action="?/deleteFile"
      use:enhance
      class="hidden"
    >
      <input bind:this={fileIdInput} type="hidden" name="fileId" />
    </form>
  </div>
{/key}
