import { useEffect, useState, useRef } from "react";
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
  const [visible, setVisible] = useState(false); // for fade animation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const lastUpdateAtRef = useRef<number | null>(null);

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
            // show with animation
            setTimeout(() => setVisible(true), 10);
            startedAtRef.current = Date.now();
            lastUpdateAtRef.current = Date.now();
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
            lastUpdateAtRef.current = Date.now();
          }),
        );

        // Complete
        unlistenFns.push(
          await ev.listen("hytale-sync-complete", (e: any) => {
            const payload = e.payload ?? {};
            const files = payload.filesWritten ?? payload.files_written ?? payload.files ?? 0;
            addToast(`Hytale assets synced (${files} files)`, "success");
            setInProgress(false);
            // animate out
            setVisible(false);
            setTimeout(() => {
              setOpen(false);
              startedAtRef.current = null;
              lastUpdateAtRef.current = null;
            }, 260);
          }),
        );

        // Cancelled (optional)
        unlistenFns.push(
          await ev.listen("hytale-sync-cancelled", (e: any) => {
            const payload = e.payload ?? {};
            const files = payload.filesWritten ?? payload.files_written ?? 0;
            addToast(`Hytale asset sync cancelled (${files} files written)`, "info");
            setInProgress(false);
            setVisible(false);
            setTimeout(() => setOpen(false), 260);
            startedAtRef.current = null;
            lastUpdateAtRef.current = null;
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
      setShowCancelConfirm(false);
    } catch (err) {
      addToast("Failed to request cancellation", "error");
    }
  }

  if (!open) return null;

  const pct = percent != null ? Math.max(0, Math.min(100, Math.round(percent * 10) / 10)) : null;

  // Estimate remaining time
  let etaText: string | null = null;
  if (totalFiles != null && startedAtRef.current && filesWritten > 0) {
    const elapsed = Math.max(0.001, (Date.now() - startedAtRef.current) / 1000);
    const rate = filesWritten / elapsed; // files per second
    if (rate > 0 && totalFiles > filesWritten) {
      const remaining = Math.max(0, totalFiles - filesWritten);
      const secs = Math.round(remaining / rate);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      etaText = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
    }
  }

  const modalClass = `pointer-events-auto w-11/12 max-w-xl p-4 bg-tn-card border border-tn-border rounded-lg shadow-lg transform transition-all duration-200 ${
    visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
  }`;

  const truncatedFile = currentFile ? (currentFile.length > 80 ? `...${currentFile.slice(-77)}` : currentFile) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      onKeyDown={(e) => {
        if (e.key === "Escape" && inProgress) setShowCancelConfirm(true);
      }}
      tabIndex={-1}
    >
      {/* Backdrop (click to request cancel) */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (inProgress) setShowCancelConfirm(true);
        }}
      />

      <div className={modalClass} role="dialog" aria-modal="true" aria-label="Hytale asset sync">
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

        <div className="text-sm text-tn-muted mb-2">
          {pct != null ? <span className="font-medium">{pct}%</span> : <span className="font-medium">Working…</span>}
          <span className="ml-2">{filesWritten} files{totalFiles != null ? ` of ${totalFiles}` : ""}</span>
          {etaText ? <span className="ml-2">• ETA {etaText}</span> : null}
        </div>

        {truncatedFile ? <div className="text-xs text-tn-muted mb-3 truncate">{truncatedFile}</div> : null}

        <div className="flex justify-end gap-2">
          {!showCancelConfirm ? (
            <button
              className="px-3 py-1 rounded border border-tn-border bg-tn-button hover:bg-tn-button-hover"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-sm text-tn-muted">Cancel sync?</div>
              <button
                className="px-3 py-1 rounded border border-tn-border bg-tn-button hover:bg-tn-button-hover"
                onClick={handleCancel}
              >
                Yes
              </button>
              <button
                className="px-3 py-1 rounded border border-tn-border bg-tn-card hover:bg-tn-card-hover"
                onClick={() => setShowCancelConfirm(false)}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
