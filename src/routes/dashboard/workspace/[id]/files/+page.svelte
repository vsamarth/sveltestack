<script lang="ts">
  import Uppy from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";
  import type { PageData } from "./$types";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { X } from "@lucide/svelte";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import FileTable from "$lib/components/file-table.svelte";
  import { siteConfig } from "$lib/config";
  import DropzoneWrapper from "$lib/components/dropzone-wrapper.svelte";
  import {
    getPresignedUploadUrlRemote,
    confirmUpload,
    deleteFile,
    renameFile,
    getFilePreviewUrl,
    getFileDownloadUrl,
  } from "$lib/remote/actions.remote";
  import {
    FileManager,
    type StoredFile,
  } from "$lib/components/file-manager.svelte";

  let { data }: { data: PageData } = $props();

  // Centralized state manager for file operations
  const fileManager = new FileManager(data.files);

  // Keep manager in sync with server data
  $effect(() => {
    fileManager.setFiles(data.files);
  });

  // Reset optimistic state when workspace changes
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = data.workspace.id;
    return () => {
      fileManager.clearState();
    };
  });

  function createUppyInstance() {
    const instance = new Uppy({
      autoProceed: true,
      restrictions: {
        maxFileSize: data.maxFileSize,
        maxNumberOfFiles: 5,
      },
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        try {
          const dropTimestamp = Date.now();

          const responseData = await getPresignedUploadUrlRemote({
            filename: file.name,
            contentType: file.type,
            workspaceId: data.workspace.id,
            size: typeof file.size === "number" ? file.size : undefined,
            dropTimestamp,
          });

          file.meta.fileId = responseData.fileId;

          return {
            method: "PUT",
            url: responseData.url,
            headers: responseData.headers,
          };
        } catch (error) {
          console.error("Failed to get upload URL:", error);

          let errorMessage = "Failed to get upload URL";

          if (error && typeof error === "object") {
            if ("body" in error) {
              const body = (error as { body?: unknown }).body;
              if (body && typeof body === "object" && "message" in body) {
                errorMessage = String((body as { message: unknown }).message);
              } else if (typeof body === "string") {
                errorMessage = body;
              }
            } else if ("message" in error) {
              errorMessage = String((error as { message: unknown }).message);
            }
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          if (file) {
            fileManager.updateUpload(file.id, {
              status: "error",
              error: errorMessage,
            });
            toast.error("Upload failed", {
              description: errorMessage,
            });
          }

          throw new Error(errorMessage);
        }
      },
    });

    instance.on("file-added", (file) => {
      fileManager.addUpload({
        id: file.id,
        filename: file.name || "Unknown file",
        size: typeof file.size === "number" ? file.size : 0,
        contentType: file.type || null,
        progress: 0,
        status: "uploading",
      });
    });

    instance.on("upload-progress", (file, progress) => {
      if (file && progress.bytesTotal) {
        const percentage = (progress.bytesUploaded / progress.bytesTotal) * 100;
        fileManager.updateUpload(file.id, { progress: percentage });
      }
    });

    instance.on("upload-success", async (file) => {
      if (file && file.meta.fileId && typeof file.meta.fileId === "string") {
        try {
          await confirmUpload({
            fileId: file.meta.fileId,
          });

          fileManager.updateUpload(file.id, {
            serverFileId: file.meta.fileId as string,
          });

          await invalidateAll();

          toast.success("File uploaded", {
            description: file.name,
          });
        } catch (error) {
          console.error("Failed to confirm upload:", error);
          fileManager.updateUpload(file.id, {
            status: "error",
            error: "Failed to confirm upload",
          });
          toast.error("Failed to confirm upload");
        }
      }
    });

    instance.on("upload-error", (file, error) => {
      if (file) {
        fileManager.updateUpload(file.id, {
          status: "error",
          error: error?.message || "Upload failed",
        });
        toast.error("Upload failed", {
          description: file.name,
        });
      }
    });

    instance.on("file-removed", (file) => {
      fileManager.removeUpload(file.id);
    });

    instance.on("restriction-failed", (file, error) => {
      toast.error("Upload restriction", {
        description: error.message,
      });
    });

    return instance;
  }

  let uppy = $state.raw(createUppyInstance());
  let inputElement = $state<HTMLInputElement | null>(null);

  function handleCancelUpload(fileId: string) {
    uppy.removeFile(fileId);
  }

  function handleRetryUpload(fileId: string) {
    uppy.retryUpload(fileId);
    fileManager.updateUpload(fileId, {
      status: "uploading",
      progress: 0,
      error: undefined,
    });
  }

  function isImageFile(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType.startsWith("image/");
  }

  function isPdfFile(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType === "application/pdf";
  }

  async function handleFileClick(file: StoredFile) {
    const isImage = isImageFile(file.contentType);
    const isPdf = isPdfFile(file.contentType);

    if (!isImage && !isPdf) return;

    try {
      const { url } = await getFilePreviewUrl(file.id);

      if (isPdf) {
        window.open(url, "_blank");
      } else if (isImage) {
        fileManager.promptPreview(file.id, file.filename, url);
      }
    } catch (error) {
      console.error("Failed to load file preview:", error);
    }
  }

  async function handleDownloadFile(fileId: string, filename: string) {
    try {
      const { url } = await getFileDownloadUrl(fileId);
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

  async function confirmDeleteFile() {
    if (fileManager.dialogState.type !== "delete") return;

    const fileName = fileManager.dialogState.filename;

    try {
      await fileManager.executeDelete(async (fileId) => {
        await deleteFile(fileId);
        await invalidateAll();
        toast.success("File deleted", { description: fileName });
      });
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    }
  }

  async function confirmRenameFile() {
    if (fileManager.dialogState.type !== "rename") return;

    const oldName = fileManager.dialogState.filename;
    const targetName = fileManager.dialogState.newName.trim();

    try {
      await fileManager.executeRename(async ({ fileId, newName }) => {
        await renameFile({ fileId, newFilename: newName });
        await invalidateAll();
        toast.success("File renamed", {
          description: `"${oldName}" → "${targetName}"`,
        });
      });
    } catch (error) {
      console.error("Failed to rename file:", error);
      toast.error("Failed to rename file");
    }
  }

  $effect(() => {
    return () => {
      uppy.cancelAll();
      uppy.clear();
    };
  });
</script>

<svelte:head>
  <title>Files - {data.workspace.name} | {siteConfig.name}</title>
  <meta
    name="description"
    content="Securely manage files and uploads in the {data.workspace
      .name} workspace."
  />
</svelte:head>

{#key data.workspace.id}
  <div class="flex flex-col items-center h-full p-6 gap-8">
    <UppyContextProvider {uppy}>
      <DropzoneWrapper>
        <div class="w-full max-w-6xl mx-auto">
          <input
            bind:this={inputElement}
            type="file"
            multiple
            class="hidden"
            onchange={(e) => {
              const files = e.currentTarget.files;
              if (files) {
                Array.from(files).forEach((file) => {
                  uppy.addFile({
                    name: file.name,
                    type: file.type,
                    data: file,
                  });
                });
              }
            }}
          />

          <!-- Files table -->
          <FileTable
            files={fileManager.allFiles}
            onDelete={(id, name) => fileManager.promptDelete(id, name)}
            onDownload={handleDownloadFile}
            onPreview={handleFileClick}
            onRename={(id, name) => fileManager.promptRename(id, name)}
            onCancelUpload={handleCancelUpload}
            onRetryUpload={handleRetryUpload}
          />
        </div>
      </DropzoneWrapper>
    </UppyContextProvider>

    <!-- Image Preview Dialog -->
    <Dialog.Root
      open={fileManager.dialogState.type === "preview"}
      onOpenChange={(open) => !open && fileManager.closeDialog()}
    >
      <Dialog.Content class="max-w-4xl max-h-[90vh] p-0">
        <Dialog.Header class="p-6 pb-4">
          <Dialog.Title class="text-xl font-semibold">
            {#if fileManager.dialogState.type === "preview"}
              {fileManager.dialogState.filename}
            {:else}
              Image Preview
            {/if}
          </Dialog.Title>
        </Dialog.Header>

        {#if fileManager.dialogState.type === "preview"}
          <div class="relative w-full overflow-auto px-6 pb-6">
            <img
              src={fileManager.dialogState.url}
              alt={fileManager.dialogState.filename}
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
    <Dialog.Root
      open={fileManager.dialogState.type === "delete"}
      onOpenChange={(open) => !open && fileManager.closeDialog()}
    >
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Delete File</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete
            <span class="font-semibold">
              {#if fileManager.dialogState.type === "delete"}
                {fileManager.dialogState.filename}
              {/if}
            </span>? This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="gap-2">
          <Button variant="outline" onclick={() => fileManager.closeDialog()}>
            Cancel
          </Button>
          <Button variant="destructive" onclick={confirmDeleteFile}>
            Delete File
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Rename File Dialog -->
    <Dialog.Root
      open={fileManager.dialogState.type === "rename"}
      onOpenChange={(open) => !open && fileManager.closeDialog()}
    >
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Rename File</Dialog.Title>
          <Dialog.Description>
            Enter a new name for
            <span class="font-semibold">
              {#if fileManager.dialogState.type === "rename"}
                {fileManager.dialogState.filename}
              {/if}
            </span>
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4">
          <Input
            value={fileManager.dialogState.type === "rename"
              ? fileManager.dialogState.newName
              : ""}
            placeholder="Enter new filename"
            class="w-full"
            oninput={(e) =>
              fileManager.updateRenameInput(e.currentTarget.value)}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmRenameFile();
              }
            }}
          />
        </div>
        <Dialog.Footer class="gap-2">
          <Button variant="outline" onclick={() => fileManager.closeDialog()}>
            Cancel
          </Button>
          <Button
            onclick={confirmRenameFile}
            disabled={fileManager.dialogState.type === "rename" &&
              (!fileManager.dialogState.newName.trim() ||
                fileManager.dialogState.newName.trim() ===
                  fileManager.dialogState.filename)}
          >
            Rename
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>
{/key}
