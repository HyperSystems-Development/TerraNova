import { useEffect, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useToastStore } from "@/stores/toastStore";

export default function SyncProgressModal() {
  const [open, setOpen] = useState(false);
  const [filesWritten, setFilesWritten] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const unlistenFns: UnlistenFn[] = [];

    (async () => {
      try {
        const ev = await import("@tauri-apps/api/event");

        // Start
        unlistenFns.push(
          await ev.listen("hytale-sync-start", (e: any) => {
            const payload = e.payload ?? {};
            const total = payload.totalFiles ?? payload.total_files ?? null;
            setTotalFiles(total ?? null);
            setFilesWritten(0);
            setCurrentFile(null);
            setPercent(null);
            setInProgress(true);
            setOpen(true);
          }),
        );

        // Progress
        unlistenFns.push(
          await ev.listen("hytale-sync-progress", (e: any) => {
            const payload = e.payload ?? {};
            const files = payload.filesWritten ?? payload.files_written ?? 0;
            const total = payload.totalFiles ?? payload.total_files ?? null;
            const cur = payload.currentFile ?? payload.current_file ?? null;
            const p = payload.percent ?? null;
            setFilesWritten(files);
            if (total != null) setTotalFiles(total);
            setCurrentFile(cur);
            if (typeof p === "number") setPercent(p);
            else if (total != null && total > 0) setPercent((files / total) * 100);
          }),
        );

        // Complete
        unlistenFns.push(
          await ev.listen("hytale-sync-complete", (e: any) => {
            const payload = e.payload ?? {};
            const files = payload.filesWritten ?? payload.files_written ?? payload.files ?? 0;
            addToast(`Hytale assets synced (${files} files)`, "success");
            setInProgress(false);
            setOpen(false);
          }),
        );

        // Cancelled (optional)
        unlistenFns.push(
          await ev.listen("hytale-sync-cancelled", (e: any) => {
            const payload = e.payload ?? {};
            const files = payload.filesWritten ?? payload.files_written ?? 0;
            addToast(`Hytale asset sync cancelled (${files} files written)`, "info");
            setInProgress(false);
            setOpen(false);
          }),
        );
      } catch {
        // Not in a Tauri environment — nothing to do.
      }
    })();

    return () => {
      for (const u of unlistenFns) {
        try {
          u && u();
        } catch {}
      }
    };
  }, [addToast]);

  async function handleCancel() {
    try {
      await invoke("cancel_hytale_assets_sync");
      addToast("Cancellation requested", "info");
    } catch (err) {
      addToast("Failed to request cancellation", "error");
    }
  }

  if (!open) return null;

  const pct = percent != null ? Math.max(0, Math.min(100, Math.round(percent * 10) / 10)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div className="pointer-events-auto w-11/12 max-w-xl p-4 bg-tn-card border border-tn-border rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Syncing Hytale assets</div>
          <div className="text-sm text-tn-muted">{inProgress ? "In progress" : "Idle"}</div>
        </div>

        <div className="h-3 bg-tn-progress-bg rounded overflow-hidden mb-2">
          <div
            id="sync-modal-progress"
            className="h-full bg-tn-accent transition-all"
            style={{ width: pct != null ? `${pct}%` : `${Math.min(100, (filesWritten % 10) * 10)}%` }}
          />
        </div>

        <div className="text-sm text-tn-muted mb-3">
          {pct != null ? `${pct}% — ` : ""}
          {filesWritten} files{totalFiles != null ? ` of ${totalFiles}` : ""}
          {currentFile ? ` — ${currentFile}` : ""}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-tn-border bg-tn-button hover:bg-tn-button-hover"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
