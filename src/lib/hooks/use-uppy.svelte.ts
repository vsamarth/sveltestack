import Uppy, { type UppyFile, type Meta } from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

export type FileWithProgress = UppyFile<Meta, Record<string, never>> & {
  progress?: {
    percentage: number;
    bytesUploaded: number;
    bytesTotal: number;
  };
  error?: string;
};

export interface UseUppyOptions {
  workspaceId: string;
  maxFileSize?: number;
  maxNumberOfFiles?: number;
  onUploadSuccess?: () => void | Promise<void>;
}

export function useUppy(options: UseUppyOptions) {
  const {
    workspaceId,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    maxNumberOfFiles = 5,
    onUploadSuccess,
  } = options;

  let files = $state<FileWithProgress[]>([]);
  let isUploading = $state(false);
  let uppyInstance: Uppy | null = null;

  function createUppyInstance(wsId: string) {
    const instance = new Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
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
            workspaceId: wsId,
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

          // Call success callback if provided
          if (onUploadSuccess) {
            await onUploadSuccess();
          }
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

  function resetUppyInstance(wsId: string) {
    // Clean up existing instance
    if (uppyInstance) {
      uppyInstance.cancelAll();
      uppyInstance.clear();
      const allFiles = uppyInstance.getFiles();
      allFiles.forEach((file) => uppyInstance?.removeFile(file.id));
    }

    // Reset state
    files = [];
    isUploading = false;

    // Create new instance with new workspace ID
    uppyInstance = createUppyInstance(wsId);
  }

  // Initialize with current workspace ID
  let previousWorkspaceId = workspaceId;
  resetUppyInstance(workspaceId);

  // React to workspace ID changes
  $effect(() => {
    // Track workspace ID changes and reset when it changes
    if (workspaceId !== previousWorkspaceId) {
      resetUppyInstance(workspaceId);
      previousWorkspaceId = workspaceId;
    }
    
    return () => {
      // Cleanup when effect is destroyed
      if (uppyInstance) {
        uppyInstance.cancelAll();
        uppyInstance.clear();
      }
    };
  });

  function startUpload() {
    if (uppyInstance) {
      uppyInstance.upload();
    }
  }

  function removeFile(fileId: string) {
    if (uppyInstance) {
      uppyInstance.removeFile(fileId);
    }
  }

  function cleanup() {
    if (uppyInstance) {
      uppyInstance.cancelAll();
      uppyInstance.clear();
      const allFiles = uppyInstance.getFiles();
      allFiles.forEach((file) => uppyInstance?.removeFile(file.id));
    }
  }

  return {
    get uppy() {
      return uppyInstance;
    },
    get files() {
      return files;
    },
    get isUploading() {
      return isUploading;
    },
    startUpload,
    removeFile,
    cleanup,
  };
}
