<script lang="ts">
  import Uppy from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";
  import type { PageData } from "./$types";
  import type { File } from "$lib/server/db/schema";
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
  } from "$lib/remote/upload.remote";
  import {
    deleteFile,
    renameFile,
    getFilePreviewUrl,
    getFileDownloadUrl,
  } from "$lib/remote/file.remote";

  let { data }: { data: PageData } = $props();

  type StoredFile = Pick<
    File,
    "id" | "filename" | "size" | "contentType" | "createdAt"
  >;

  function createUppyInstance() {
    const instance = new Uppy({
      autoProceed: true,
      restrictions: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxNumberOfFiles: 5,
      },
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        try {
          const responseData = await getPresignedUploadUrlRemote({
            filename: file.name,
            contentType: file.type,
            workspaceId: data.workspace.id,
            size: typeof file.size === "number" ? file.size : undefined,
          });

          // Store fileId for confirmation
          file.meta.fileId = responseData.fileId;

          console.log(
            "Upload parameters received for file:",
            file.name,
            responseData,
          );
          // Ensure the returned object matches AwsS3UploadParameters
          return {
            method: "PUT",
            url: responseData.url,
            headers: responseData.headers,
            // 'fields' and 'expires' are optional, not needed for simple PUT
          };
        } catch (error) {
          console.error("Failed to get upload URL:", error);
          throw new Error("Failed to get upload URL");
        }
      },
    });

    // Setup event listeners

    instance.on("upload-success", async (file) => {
      if (file && file.meta.fileId && typeof file.meta.fileId === "string") {
        try {
          // Confirm upload in database
          await confirmUpload({
            fileId: file.meta.fileId,
          });
          await invalidateAll();

          toast.success("File uploaded", {
            description: file.name,
          });
        } catch (error) {
          console.error("Failed to confirm upload:", error);
          toast.error("Failed to confirm upload");
        }
      }
    });

    instance.on("upload-error", (file) => {
      if (file) {
        toast.error("Upload failed", {
          description: file.name,
        });
      }
    });

    instance.on("restriction-failed", (file, error) => {
      toast.error("Upload restriction", {
        description: error.message,
      });
    });

    return instance;
  }

  let uppy = $state.raw(createUppyInstance());
  let storedFiles = $derived(data.files);
  let isDialogOpen = $state(false);
  let selectedImage = $state<{ url: string; filename: string } | null>(null);

  let inputElement = $state<HTMLInputElement | null>(null);

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
      const { url } = await getFilePreviewUrl(file.id);

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
      const { url } = await getFileDownloadUrl(fileId);

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

  let deleteDialogOpen = $state(false);
  let fileToDelete = $state<{ id: string; name: string } | null>(null);

  let renameDialogOpen = $state(false);
  let fileToRename = $state<{ id: string; name: string } | null>(null);
  let newFilename = $state("");

  // Open delete confirmation dialog
  function openDeleteDialog(fileId: string, filename: string) {
    fileToDelete = { id: fileId, name: filename };
    deleteDialogOpen = true;
  }

  // Delete file after confirmation
  async function confirmDeleteFile() {
    if (!fileToDelete) return;

    try {
      await deleteFile(fileToDelete.id);
      await invalidateAll();
      toast.success("File deleted", {
        description: fileToDelete.name,
      });
      deleteDialogOpen = false;
      fileToDelete = null;
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    }
  }

  // Open rename dialog
  function openRenameDialog(fileId: string, currentName: string) {
    fileToRename = { id: fileId, name: currentName };
    newFilename = currentName;
    renameDialogOpen = true;
  }

  // Rename file after confirmation
  async function confirmRenameFile() {
    if (!fileToRename || !newFilename.trim()) return;

    try {
      await renameFile({
        fileId: fileToRename.id,
        newFilename: newFilename.trim(),
      });
      await invalidateAll();
      toast.success("File renamed", {
        description: `"${fileToRename.name}" → "${newFilename.trim()}"`,
      });
      renameDialogOpen = false;
      fileToRename = null;
      newFilename = "";
    } catch (error) {
      console.error("Failed to rename file:", error);
      toast.error("Failed to rename file");
    }
  }

  // Cleanup on workspace change or component unmount
  $effect(() => {
    return () => {
      uppy.cancelAll();
      uppy.clear();
      const allFiles = uppy.getFiles();
      allFiles.forEach((file) => uppy.removeFile(file.id));
    };
  });
</script>

<svelte:head>
  <title>{data.workspace.name} | {siteConfig.name}</title>
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
          <!-- Hidden file input -->
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
            files={storedFiles}
            onDelete={openDeleteDialog}
            onDownload={handleDownloadFile}
            onPreview={handleFileClick}
            onRename={openRenameDialog}
          />
        </div>
      </DropzoneWrapper>
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

    <!-- Rename File Dialog -->
    <Dialog.Root bind:open={renameDialogOpen}>
      <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Rename File</Dialog.Title>
          <Dialog.Description>
            Enter a new name for
            <span class="font-semibold">{fileToRename?.name}</span>
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4">
          <Input
            bind:value={newFilename}
            placeholder="Enter new filename"
            class="w-full"
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmRenameFile();
              }
            }}
          />
        </div>
        <Dialog.Footer class="gap-2">
          <Button
            variant="outline"
            onclick={() => {
              renameDialogOpen = false;
              fileToRename = null;
              newFilename = "";
            }}
          >
            Cancel
          </Button>
          <Button
            onclick={confirmRenameFile}
            disabled={!newFilename.trim() ||
              newFilename.trim() === fileToRename?.name}
          >
            Rename
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </div>
{/key}
