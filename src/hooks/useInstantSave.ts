import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveRef } from "@/utils/saveRef";

/**
 * When Instant Save is enabled, watches the project store's isDirty flag
 * and debounce-saves the current file to disk. Subscribes to isDirty via
 * zustand rather than the "editor:dirty" event because some mutation paths
 * (e.g. useFieldChange config edits) call setDirty(true) directly without
 * emitting the event. Uses saveRef (set by Toolbar) so this hook works
 * anywhere inside or outside ReactFlowProvider.
 */
export function useInstantSave() {
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleSave() {
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
        if (!useSettingsStore.getState().instantSaveEnabled) return;

        savingRef.current = true;
        try {
          await saveRef.current();
        } finally {
          savingRef.current = false;
          // If edits arrived while saving, schedule another save
          if (
            useProjectStore.getState().isDirty &&
            useSettingsStore.getState().instantSaveEnabled &&
            useProjectStore.getState().currentFile
          ) {
            scheduleSave();
          }
        }
      }, instantSaveDebounceMs);
    }

    // Subscribe to isDirty transitions: false → true triggers a save.
    // This catches ALL dirty paths (graph mutations, config field edits,
    // clipboard ops, biome section changes).
    const unsub = useProjectStore.subscribe(
      (state, prev) => {
        if (state.isDirty && !prev.isDirty) {
          scheduleSave();
        }
        // Cancel pending save if file changed while debounce is pending
        if (state.currentFile !== prev.currentFile && timerRef.current !== null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
    );

    return () => {
      unsub();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
}
