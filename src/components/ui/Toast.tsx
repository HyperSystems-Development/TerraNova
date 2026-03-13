import { useToastStore } from "@/stores/toastStore";
import type { ToastType } from "@/stores/toastStore";

const ICONS: Record<ToastType, string> = {
  error: "✖",
  warning: "⚠",
  info: "ℹ",
  success: "✔",
};

const STYLES: Record<ToastType, { bar: string; icon: string; text: string; border: string; bg: string }> = {
  error: {
    bar: "bg-red-500",
    icon: "text-red-400",
    text: "text-red-100",
    border: "border-red-700/50",
    bg: "bg-[#1a0a0a]",
  },
  warning: {
    bar: "bg-amber-400",
    icon: "text-amber-300",
    text: "text-amber-100",
    border: "border-amber-700/50",
    bg: "bg-[#1a1200]",
  },
  success: {
    bar: "bg-emerald-500",
    icon: "text-emerald-400",
    text: "text-emerald-100",
    border: "border-emerald-700/50",
    bg: "bg-[#071310]",
  },
  info: {
    bar: "bg-sky-500",
    icon: "text-sky-300",
    text: "text-tn-text",
    border: "border-tn-border",
    bg: "bg-tn-surface",
  },
};

export function Toast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto relative overflow-hidden rounded border ${s.border} ${s.bg} shadow-2xl text-left animate-in fade-in slide-in-from-bottom-2 duration-200 w-full`}
          >
            {/* Left accent bar */}
            <div className={`absolute inset-y-0 left-0 w-0.5 ${s.bar}`} />
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 pl-4">
              <span className={`mt-px shrink-0 text-[13px] ${s.icon}`}>{ICONS[t.type]}</span>
              <p className={`text-[12px] leading-relaxed ${s.text}`}>{t.message}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
