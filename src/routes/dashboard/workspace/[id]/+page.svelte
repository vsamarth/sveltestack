<script lang="ts">
  import FileInput from "$lib/components/file-input.svelte";
  import Uppy, { type UppyFile, type Meta } from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";
  import type { PageData } from "./$types";
  import type { File } from "$lib/server/db/schema";

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

          // Reload files list
          await loadFiles();
        } catch (error) {
          console.error("Failed to confirm upload:", error);
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
  let storedFiles = $state<StoredFile[]>([]);

  // Load files from database
  async function loadFiles() {
    try {
      const response = await fetch(`/api/workspace/${data.workspace.id}/files`);
      if (response.ok) {
        const responseData = await response.json();
        storedFiles = responseData.files;
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  }

  // Delete file
  async function handleDeleteFile(fileId: string) {
    try {
      const response = await fetch(
        `/api/workspace/${data.workspace.id}/files`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        },
      );

      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  }

  // Load files and cleanup when workspace changes
  $effect(() => {
    void data.workspace.id; // Track workspace changes
    loadFiles();

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
</script>

{#key data.workspace.id}
  <div class="flex flex-col items-center h-full p-6 gap-8">
    {#if storedFiles.length === 0}
      <UppyContextProvider {uppy}>
        <FileInput
          {files}
          {isUploading}
          onRemove={handleRemoveFile}
          onStartUpload={handleStartUpload}
        />
      </UppyContextProvider>
    {:else}
      <div class="w-full max-w-2xl">
        <h3 class="text-lg font-semibold mb-4">Uploaded Files</h3>
        <div class="space-y-2">
          {#each storedFiles as file (file.id)}
            <div class="flex items-center justify-between p-3 border rounded">
              <div>
                <div class="font-medium">{file.filename}</div>
                <div class="text-sm text-muted-foreground">
                  {file.size ? (parseInt(file.size) / 1024).toFixed(2) : "0"} KB
                </div>
              </div>
              <button
                onclick={() => handleDeleteFile(file.id)}
                class="text-destructive hover:text-destructive/80 px-3 py-1 rounded border border-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/key}
