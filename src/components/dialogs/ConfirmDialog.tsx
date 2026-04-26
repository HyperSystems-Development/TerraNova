import { useEffect, useCallback, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  cancelLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  secondaryLabel,
  onSecondary,
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || loading) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    },
    [open, loading, onClose, onConfirm],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (open) {
      confirmButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[440px] p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-sm font-semibold">{title}</h2>
        <p className="text-[13px] text-tn-text-muted leading-relaxed">{message}</p>

        <div className="flex justify-end items-center gap-2 pt-3 border-t border-tn-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded border border-tn-border hover:bg-tn-surface disabled:opacity-50 whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded border border-red-800/60 text-red-400 hover:bg-red-900/20 disabled:opacity-50 whitespace-nowrap"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded bg-tn-accent text-tn-bg font-medium disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
          >
            {loading ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
