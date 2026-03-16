import { create } from "zustand";
import { emit, on } from "./storeEvents";
import { registerProjectRoot, unregisterProjectRoot } from "@/utils/ipc";
import { saveSession, clearSession } from "@/utils/sessionPersist";

export interface DirectoryEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: DirectoryEntry[];
}

interface ProjectState {
  /** Root path of the currently open asset pack */
  projectPath: string | null;
  /** Flat list of all asset file paths in the pack */
  assetFiles: string[];
  /** Directory tree for the sidebar */
  directoryTree: DirectoryEntry[];
  /** Currently open file path */
  currentFile: string | null;
  /** Whether the current file has unsaved changes */
  isDirty: boolean;
  /** Last error message from an IPC operation */
  lastError: string | null;

  // Actions
  setProjectPath: (path: string | null) => void;
  setAssetFiles: (files: string[]) => void;
  setDirectoryTree: (tree: DirectoryEntry[]) => void;
  setCurrentFile: (file: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setLastError: (error: string | null) => void;
  reset: () => void;
  closeProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  assetFiles: [],
  directoryTree: [],
  currentFile: null,
  isDirty: false,
  lastError: null,

  setProjectPath: (path) => {
    const prev = useProjectStore.getState().projectPath;
    if (prev) unregisterProjectRoot(prev).catch(() => {});
    if (path) registerProjectRoot(path).catch(() => {});
    set({ projectPath: path });
    saveSession({ projectPath: path });
  },
  setAssetFiles: (files) => set({ assetFiles: files }),
  setDirectoryTree: (tree) => set({ directoryTree: tree }),
  setCurrentFile: (file) => {
    set({ currentFile: file });
    saveSession({ currentFile: file });
  },
  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastError: (error) => set({ lastError: error }),
  reset: () => {
    set({
      projectPath: null,
      assetFiles: [],
      directoryTree: [],
      currentFile: null,
      isDirty: false,
      lastError: null,
    });
    clearSession();
  },
  closeProject: () => {
    const prev = useProjectStore.getState().projectPath;
    if (prev) unregisterProjectRoot(prev).catch(() => {});
    set({
      projectPath: null,
      assetFiles: [],
      directoryTree: [],
      currentFile: null,
      isDirty: false,
      lastError: null,
    });
    clearSession();
    emit("project:close");
  },
}));

// Subscribe to editor:dirty events to mark project as dirty
on("editor:dirty", () => {
  useProjectStore.getState().setDirty(true);
});
