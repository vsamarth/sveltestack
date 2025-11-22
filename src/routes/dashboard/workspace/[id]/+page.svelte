<script lang="ts">
  import FileInput from "$lib/components/file-input.svelte";
  import Uppy, { type UppyFile, type Meta } from "@uppy/core";
  import { UppyContextProvider } from "@uppy/svelte";
  import AwsS3 from "@uppy/aws-s3";

  type FileWithProgress = UppyFile<Meta, Record<string, never>> & {
    progress?: {
      percentage: number;
      bytesUploaded: number;
      bytesTotal: number;
    };
  };

  const uppy = new Uppy({
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();

      return {
        method: data.method,
        url: data.url,
        headers: data.headers,
      };
    },
  });

  let files = $state<FileWithProgress[]>([]);
  let isUploading = $state(false);

  // File added to queue
  uppy.on("file-added", (file) => {
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

  // File removed from queue
  uppy.on("file-removed", (file) => {
    if (file) {
      files = files.filter((f) => f.id !== file.id);
    }
  });

  // Upload started
  uppy.on("upload", () => {
    isUploading = true;
  });

  // Track upload progress for each file
  uppy.on("upload-progress", (file, progress) => {
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

  // File uploaded successfully
  uppy.on("upload-success", (file) => {
    if (file) {
      // Keep file in list with 100% progress briefly, then remove
      setTimeout(() => {
        files = files.filter((f) => f.id !== file.id);
      }, 1000);
    }
  });

  // File upload failed
  uppy.on("upload-error", (file, error) => {
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

  // All uploads complete
  uppy.on("complete", () => {
    isUploading = false;
  });

  // Handle restriction failures (file too large, too many files, etc.)
  uppy.on("restriction-failed", (file, error) => {
    if (file) {
      files = files.map((f) =>
        f.id === file?.id
          ? ({ ...f, error: error.message } as FileWithProgress)
          : f,
      );
    }
  });

  function handleStartUpload() {
    uppy.upload();
  }

  function handleCancelAll() {
    uppy.cancelAll();
    isUploading = false;
  }

  function handleRemoveFile(fileId: string) {
    uppy.removeFile(fileId);
  }
</script>

<div class="grid place-items-center h-full p-6">
  <UppyContextProvider {uppy}>
    <FileInput
      {files}
      {isUploading}
      onRemove={handleRemoveFile}
      onStartUpload={handleStartUpload}
      onCancelAll={handleCancelAll}
    />
  </UppyContextProvider>
</div>
