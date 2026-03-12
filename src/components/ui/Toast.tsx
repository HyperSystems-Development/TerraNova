import { useToastStore } from "@/stores/toastStore";

export function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-2 rounded shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2 ${
            t.type === "error"
              ? "bg-red-900/90 text-red-100 border border-red-700/50"
              : t.type === "warning"
              ? "bg-amber-900/90 text-amber-100 border border-amber-700/50"
              : t.type === "success"
              ? "bg-emerald-900/90 text-emerald-100 border border-emerald-700/50"
              : "bg-tn-panel text-tn-text border border-tn-border"
          }`}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
