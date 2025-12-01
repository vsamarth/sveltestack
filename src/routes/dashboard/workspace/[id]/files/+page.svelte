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
  import FileTable, { type UploadingFile } from "$lib/components/file-table.svelte";
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

  let { data }: { data: PageData } = $props();

  type StoredFile = Pick<
    File,
    "id" | "filename" | "size" | "contentType" | "createdAt"
  >;

  // Track files currently being uploaded
  let uploadingFiles = $state<UploadingFile[]>([]);

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
          // Get drop timestamp - use the current time (all files in a batch will be close together)
          const dropTimestamp = Date.now();
          
          const responseData = await getPresignedUploadUrlRemote({
            filename: file.name,
            contentType: file.type,
            workspaceId: data.workspace.id,
            size: typeof file.size === "number" ? file.size : undefined,
            dropTimestamp,
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

    // When a file is added, show it in the uploading list immediately
    instance.on("file-added", (file) => {
      uploadingFiles = [
        ...uploadingFiles,
        {
          id: file.id,
          filename: file.name || "Unknown file",
          size: typeof file.size === "number" ? file.size : 0,
          contentType: file.type || null,
          progress: 0,
          status: "uploading",
        },
      ];
    });

    // Track upload progress
    instance.on("upload-progress", (file, progress) => {
      if (file && progress.bytesTotal) {
        const percentage = (progress.bytesUploaded / progress.bytesTotal) * 100;
        uploadingFiles = uploadingFiles.map((f) =>
          f.id === file.id ? { ...f, progress: percentage } : f
        );
      }
    });

    instance.on("upload-success", async (file) => {
      if (file && file.meta.fileId && typeof file.meta.fileId === "string") {
        try {
          // Confirm upload in database
          await confirmUpload({
            fileId: file.meta.fileId,
          });

          // Store serverFileId for deduplication - row will auto-hide when server data loads
          uploadingFiles = uploadingFiles.map((f) =>
            f.id === file.id 
              ? { ...f, serverFileId: file.meta.fileId as string } 
              : f
          );

          // Refresh data - deduplication filter will hide this row when server data loads
          await invalidateAll();

          toast.success("File uploaded", {
            description: file.name,
          });

          // Don't remove from uploadingFiles - let deduplication filter handle it
          // The visibleUploadingFiles filter will automatically hide it when server data includes the file
        } catch (error) {
          console.error("Failed to confirm upload:", error);
          // Mark as error
          uploadingFiles = uploadingFiles.map((f) =>
            f.id === file.id
              ? { ...f, status: "error" as const, error: "Failed to confirm upload" }
              : f
          );
          toast.error("Failed to confirm upload");
        }
      }
    });

    instance.on("upload-error", (file, error) => {
      if (file) {
        uploadingFiles = uploadingFiles.map((f) =>
          f.id === file.id
            ? { ...f, status: "error" as const, error: error?.message || "Upload failed" }
            : f
        );
        toast.error("Upload failed", {
          description: file.name,
        });
      }
    });

    // When a file is removed (cancelled or dismissed), remove from uploading list
    instance.on("file-removed", (file) => {
      uploadingFiles = uploadingFiles.filter((f) => f.id !== file.id);
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

  // Cleanup uploadingFiles when server data confirms the files exist
  // This runs reactively when storedFiles or uploadingFiles change
  $effect(() => {
    const serverFileIds = new Set(storedFiles.map((f) => f.id));
    // Remove uploads that have been confirmed in server data
    const hasServerMatches = uploadingFiles.some(
      (uf) => uf.serverFileId && serverFileIds.has(uf.serverFileId)
    );
    
    if (hasServerMatches) {
      // Server data has loaded - clean up matching uploads
      uploadingFiles = uploadingFiles.filter(
        (uf) => !uf.serverFileId || !serverFileIds.has(uf.serverFileId)
      );
    }
  });

  // Cancel an upload
  function handleCancelUpload(fileId: string) {
    uppy.removeFile(fileId);
  }

  // Retry a failed upload
  function handleRetryUpload(fileId: string) {
    uppy.retryUpload(fileId);
    // Reset status to uploading
    uploadingFiles = uploadingFiles.map((f) =>
      f.id === fileId ? { ...f, status: "uploading" as const, progress: 0, error: undefined } : f
    );
  }

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
  let deletingFileIds = $state<Set<string>>(new Set());

  let renameDialogOpen = $state(false);
  let fileToRename = $state<{ id: string; name: string } | null>(null);
  let newFilename = $state("");
  let renamingFileIds = $state<Map<string, string>>(new Map()); // fileId -> new name (for optimistic display)

  // Open delete confirmation dialog
  function openDeleteDialog(fileId: string, filename: string) {
    fileToDelete = { id: fileId, name: filename };
    deleteDialogOpen = true;
  }

  // Delete file after confirmation
  async function confirmDeleteFile() {
    if (!fileToDelete) return;

    const fileId = fileToDelete.id;
    const fileName = fileToDelete.name;

    // Close dialog immediately and show deleting state
    deleteDialogOpen = false;
    deletingFileIds = new Set([...deletingFileIds, fileId]);

    try {
      await deleteFile(fileId);
      await invalidateAll();
      toast.success("File deleted", {
        description: fileName,
      });
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    } finally {
      // Remove from deleting set
      deletingFileIds = new Set([...deletingFileIds].filter(id => id !== fileId));
      fileToDelete = null;
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

    const fileId = fileToRename.id;
    const oldName = fileToRename.name;
    const targetName = newFilename.trim();

    // Close dialog immediately and show renaming state with optimistic name
    renameDialogOpen = false;
    renamingFileIds = new Map([...renamingFileIds, [fileId, targetName]]);

    try {
      await renameFile({
        fileId,
        newFilename: targetName,
      });
      await invalidateAll();
      toast.success("File renamed", {
        description: `"${oldName}" → "${targetName}"`,
      });
    } catch (error) {
      console.error("Failed to rename file:", error);
      toast.error("Failed to rename file");
    } finally {
      // Clean up renaming state
      renamingFileIds = new Map([...renamingFileIds].filter(([id]) => id !== fileId));
      fileToRename = null;
      newFilename = "";
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
            {uploadingFiles}
            {deletingFileIds}
            {renamingFileIds}
            onDelete={openDeleteDialog}
            onDownload={handleDownloadFile}
            onPreview={handleFileClick}
            onRename={openRenameDialog}
            onCancelUpload={handleCancelUpload}
            onRetryUpload={handleRetryUpload}
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
