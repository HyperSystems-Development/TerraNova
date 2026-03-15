import { useState } from "react";
import { loadingTips } from "../../utils/loadingTips";

export function LoadingDialog({ open, message }: { open: boolean; message?: string }) {
  const [randomTip] = useState(() => loadingTips[Math.floor(Math.random() * loadingTips.length)]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-tn-panel border border-tn-border rounded-lg shadow-lg p-6 flex flex-col items-center">
        <svg className="animate-spin h-8 w-8 text-tn-accent mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-lg font-semibold text-tn-text mb-2">{message || "Loading..."}</span>
        <span className="text-sm text-tn-text-muted mt-2">{randomTip}</span>
      </div>
    </div>
  );
}
