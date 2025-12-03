import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import type { File } from "$lib/server/db/schema";

export type StoredFile = Pick<
  File,
  "id" | "filename" | "size" | "contentType" | "createdAt"
>;

export type UploadingFile = {
  id: string;
  serverFileId?: string;
  filename: string;
  size: number;
  contentType: string | null;
  progress: number;
  status: "uploading" | "error";
  error?: string;
};

export type PendingOperation =
  | { type: "delete" }
  | { type: "rename"; newName: string };

export type DialogState =
  | { type: "idle" }
  | { type: "delete"; fileId: string; filename: string }
  | { type: "rename"; fileId: string; filename: string; newName: string }
  | { type: "preview"; fileId: string; url: string; filename: string };

export type FileViewModel = {
  id: string;
  name: string;
  size: number;
  type: string | null;
  createdAt?: Date;
  status: "stable" | "uploading" | "deleting" | "renaming" | "error";
  progress?: number;
  error?: string;
  original?: StoredFile;
};

export class FileManager {
  serverFiles = $state<StoredFile[]>([]);
  uploads = $state<UploadingFile[]>([]);
  pendingOperations = new SvelteMap<string, PendingOperation>();
  dialogState = $state<DialogState>({ type: "idle" });

  constructor(initialFiles: StoredFile[] = []) {
    this.serverFiles = initialFiles;
  }

  setFiles(files: StoredFile[]) {
    this.serverFiles = files;
  }

  clearState() {
    this.uploads = [];
    this.pendingOperations.clear();
    this.dialogState = { type: "idle" };
  }

  addUpload(file: UploadingFile) {
    this.uploads = [...this.uploads, file];
  }

  updateUpload(id: string, patch: Partial<UploadingFile>) {
    this.uploads = this.uploads.map((u) =>
      u.id === id ? { ...u, ...patch } : u,
    );
  }

  removeUpload(id: string) {
    this.uploads = this.uploads.filter((u) => u.id !== id);
  }

  promptDelete(fileId: string, filename: string) {
    this.dialogState = { type: "delete", fileId, filename };
  }

  promptRename(fileId: string, filename: string) {
    this.dialogState = { type: "rename", fileId, filename, newName: filename };
  }

  promptPreview(fileId: string, filename: string, url: string) {
    this.dialogState = { type: "preview", fileId, filename, url };
  }

  updateRenameInput(value: string) {
    if (this.dialogState.type === "rename") {
      this.dialogState.newName = value;
    }
  }

  closeDialog() {
    this.dialogState = { type: "idle" };
  }

  async executeDelete(apiCall: (id: string) => Promise<void>) {
    if (this.dialogState.type !== "delete") return;

    const { fileId } = this.dialogState;

    this.closeDialog();
    this.pendingOperations.set(fileId, { type: "delete" });

    try {
      await apiCall(fileId);
    } catch (error) {
      this.pendingOperations.delete(fileId);
      throw error;
    }
    this.cleanupStaleOperations();
  }

  async executeRename(
    apiCall: (payload: { fileId: string; newName: string }) => Promise<void>,
  ) {
    if (this.dialogState.type !== "rename") return;

    const { fileId, newName } = this.dialogState;

    this.closeDialog();
    this.pendingOperations.set(fileId, { type: "rename", newName });

    try {
      await apiCall({ fileId, newName });
    } catch (error) {
      this.pendingOperations.delete(fileId);
      throw error;
    } finally {
      this.cleanupStaleOperations();
    }
  }

  cleanupStaleOperations() {
    const serverIds = new SvelteSet(this.serverFiles.map((f) => f.id));
    for (const [id, op] of this.pendingOperations) {
      if (op.type === "delete" && !serverIds.has(id)) {
        this.pendingOperations.delete(id);
      }
      if (op.type === "rename") {
        this.pendingOperations.delete(id);
      }
    }
  }

  allFiles = $derived.by<FileViewModel[]>(() => {
    const serverIds = new SvelteSet(this.serverFiles.map((f) => f.id));

    const mappedServerFiles: FileViewModel[] = this.serverFiles.map((f) => {
      const operation = this.pendingOperations.get(f.id);

      let name = f.filename;
      let status: FileViewModel["status"] = "stable";

      if (operation) {
        if (operation.type === "delete") {
          status = "deleting";
        } else if (operation.type === "rename") {
          status = "renaming";
          name = operation.newName;
        }
      }

      return {
        id: f.id,
        name,
        size: parseInt(f.size || "0"),
        type: f.contentType,
        createdAt: f.createdAt,
        status,
        progress: 100,
        original: f,
      };
    });

    const mappedUploads: FileViewModel[] = this.uploads
      .filter((u) => !u.serverFileId || !serverIds.has(u.serverFileId))
      .map((u) => ({
        id: u.id,
        name: u.filename,
        size: u.size,
        type: u.contentType,
        createdAt: new SvelteDate(),
        status: u.status,
        progress: u.progress,
        error: u.error,
      }));

    return [...mappedServerFiles, ...mappedUploads];
  });
}
