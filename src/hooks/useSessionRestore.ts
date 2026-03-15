/**
 * Restore navigation session on app mount.
 *
 * Phase 1 (useSessionRestore): Restores projectPath so ProjectEditor renders.
 * Phase 2 (useSessionRestoreFile): Once inside ReactFlowProvider, opens the
 * previously active file and biome section.
 */

import { useEffect, useRef } from "react";
import { loadSession, clearSession } from "@/utils/sessionPersist";
import { useProjectStore } from "@/stores/projectStore";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";
import { useEditorStore } from "@/stores/editorStore";
import { listDirectory } from "@/utils/ipc";
import mapDirEntry from "@/utils/mapDirEntry";

/**
 * Phase 1: Call in App component. Restores projectPath + directory tree
 * so the editor mounts instead of the home screen.
 */
export function useSessionRestore(): void {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Only attempt restore when starting fresh (no project already loaded)
    if (useProjectStore.getState().projectPath !== null) return;

    const session = loadSession();
    if (!session.projectPath) return;

    (async () => {
      try {
        useProjectStore.getState().setProjectPath(session.projectPath);
        const entries = await listDirectory(session.projectPath!);
        useProjectStore.getState().setDirectoryTree(entries.map(mapDirEntry));
        useRecentProjectsStore.getState().addProject(session.projectPath!);
      } catch {
        // Project path no longer valid — clear and stay on home screen
        clearSession();
        useProjectStore.getState().reset();
      }
    })();
  }, []);
}

/**
 * Phase 2: Call inside ProjectEditor (within ReactFlowProvider).
 * Opens the previously active file using the provided openFile callback.
 *
 * Uses a ref for the callback so we always invoke the latest version,
 * and waits for the directory tree to be populated (indicating Phase 1 finished).
 */
export function useSessionRestoreFile(
  openFile: (filePath: string) => Promise<void>,
): void {
  const openFileRef = useRef(openFile);
  openFileRef.current = openFile;

  const ranRef = useRef(false);

  // Watch for directory tree to become available (Phase 1 completion signal)
  const directoryTree = useProjectStore((s) => s.directoryTree);

  useEffect(() => {
    if (ranRef.current) return;
    // Wait until Phase 1 has populated the directory tree
    if (directoryTree.length === 0) return;

    ranRef.current = true;

    const session = loadSession();
    if (!session.currentFile) return;

    // Use a brief delay to ensure React has flushed all store updates
    const timer = setTimeout(async () => {
      try {
        await openFileRef.current(session.currentFile!);

        // Restore biome section if applicable
        if (session.activeBiomeSection) {
          const { biomeSections, switchBiomeSection } = useEditorStore.getState();
          if (biomeSections && session.activeBiomeSection in biomeSections) {
            switchBiomeSection(session.activeBiomeSection);
          }
        }
      } catch {
        // File no longer exists — user can manually pick a new one
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [directoryTree]);
}
