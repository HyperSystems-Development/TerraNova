import { useEffect, useRef } from "react";
import { on, off } from "@/stores/storeEvents";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveRef } from "@/utils/saveRef";

/**
 * When Instant Save is enabled, listens for "editor:dirty" events and
 * debounce-saves the current file to disk. Uses saveRef (set by Toolbar)
 * so this hook works anywhere inside or outside ReactFlowProvider.
 */
export function useInstantSave() {
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFileRef = useRef<string | null>(null);

  // Track file changes to cancel stale debounces
  const currentFile = useProjectStore((s) => s.currentFile);
  useEffect(() => {
    if (currentFileRef.current !== currentFile && timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    function handleDirty() {
      const { instantSaveEnabled, instantSaveDebounceMs } = useSettingsStore.getState();
      if (!instantSaveEnabled) return;
      if (!useProjectStore.getState().currentFile) return;
      if (!saveRef.current) return;

      // Reset debounce timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        timerRef.current = null;
        if (savingRef.current) return;
        if (!saveRef.current) return;
        if (!useProjectStore.getState().currentFile) return;
        // Re-check in case it was toggled off during debounce
        if (!useSettingsStore.getState().instantSaveEnabled) return;

        savingRef.current = true;
        try {
          await saveRef.current();
        } finally {
          savingRef.current = false;
        }
      }, instantSaveDebounceMs);
    }

    on("editor:dirty", handleDirty);
    return () => {
      off("editor:dirty", handleDirty);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
