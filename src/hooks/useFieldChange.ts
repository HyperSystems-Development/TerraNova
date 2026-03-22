import { useCallback, useRef, useEffect } from "react";

/**
 * Reusable debounced change handler for config-level fields.
 * Batches rapid edits into a single undo/redo snapshot.
 *
 * commitState and setDirty are stored in refs so the debounce timer always
 * calls the latest version, avoiding stale-closure bugs when the parent
 * re-renders between a change and the debounce firing.
 */
export function useFieldChange(
  commitState: (label: string) => void,
  setDirty: (dirty: boolean) => void,
  debounceMs = 300,
) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingRef = useRef(false);
  const lastLabelRef = useRef("");

  // Keep refs current so the debounce timer always uses the latest callbacks
  const commitStateRef = useRef(commitState);
  const setDirtyRef = useRef(setDirty);
  useEffect(() => { commitStateRef.current = commitState; }, [commitState]);
  useEffect(() => { setDirtyRef.current = setDirty; }, [setDirty]);

  const debouncedChange = useCallback(
    (label: string, applyFn: () => void) => {
      applyFn();
      setDirtyRef.current(true);
      hasPendingRef.current = true;
      lastLabelRef.current = label;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        commitStateRef.current(lastLabelRef.current);
        hasPendingRef.current = false;
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [debounceMs],
  );

  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasPendingRef.current) {
      commitStateRef.current(lastLabelRef.current);
      hasPendingRef.current = false;
    }
  }, []);

  return { debouncedChange, flush };
}
