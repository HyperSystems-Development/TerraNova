import { memo } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import type { ViewMode, SplitDirection } from "@/stores/previewStore";

interface Preset {
  id: string;
  label: string;
  icon: React.ReactNode;
  activate: (
    setViewMode: (vm: ViewMode) => void,
    setSplitDirection: (dir: SplitDirection) => void,
  ) => void;
  isActive: (vm: ViewMode, dir: SplitDirection) => boolean;
}

const PRESETS: Preset[] = [
  {
    id: "graph",
    label: "Graph",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Full pane with node dots + edges */}
        <rect x="2" y="1" width="20" height="16" rx="2" />
        <circle cx="7" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="17" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <line x1="8.3" y1="6.6" x2="11" y2="12" />
        <line x1="15.7" y1="6.6" x2="13" y2="12" />
      </svg>
    ),
    activate: (setViewMode) => setViewMode("graph"),
    isActive: (vm) => vm === "graph",
  },
  {
    id: "preview",
    label: "Preview",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Full pane with gradient/contour lines */}
        <rect x="2" y="1" width="20" height="16" rx="2" />
        <path d="M2 6 C6 4, 10 8, 14 5 C18 2, 20 7, 22 6" />
        <path d="M2 10 C6 8, 10 12, 14 9 C18 6, 20 11, 22 10" />
        <path d="M2 14 C6 12, 10 16, 14 13 C18 10, 20 15, 22 14" />
      </svg>
    ),
    activate: (setViewMode) => setViewMode("preview"),
    isActive: (vm) => vm === "preview",
  },
  {
    id: "split-h",
    label: "Split Horizontal",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Top=graph, bottom=preview, horizontal divider */}
        <rect x="2" y="1" width="20" height="16" rx="2" />
        <line x1="2" y1="9" x2="22" y2="9" />
        <circle cx="8" cy="5" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="5" r="1" fill="currentColor" stroke="none" />
        <line x1="9" y1="5.3" x2="15" y2="5.3" />
        <line x1="4" y1="13" x2="20" y2="13" strokeDasharray="2 2" />
      </svg>
    ),
    activate: (setViewMode, setSplitDirection) => {
      setViewMode("split");
      setSplitDirection("horizontal");
    },
    isActive: (vm, dir) => vm === "split" && dir === "horizontal",
  },
  {
    id: "split-v",
    label: "Split Vertical",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Left=graph, right=preview, vertical divider */}
        <rect x="2" y="1" width="20" height="16" rx="2" />
        <line x1="12" y1="1" x2="12" y2="17" />
        <circle cx="7" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
        <line x1="7" y1="7" x2="7" y2="11" />
        <line x1="14" y1="9" x2="20" y2="9" strokeDasharray="2 2" />
      </svg>
    ),
    activate: (setViewMode, setSplitDirection) => {
      setViewMode("split");
      setSplitDirection("vertical");
    },
    isActive: (vm, dir) => vm === "split" && dir === "vertical",
  },
  {
    id: "compare",
    label: "Compare",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Two panels with A/B labels */}
        <rect x="2" y="1" width="20" height="16" rx="2" />
        <line x1="12" y1="1" x2="12" y2="17" />
        <text x="7" y="11" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontWeight="bold">A</text>
        <text x="17" y="11" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontWeight="bold">B</text>
      </svg>
    ),
    activate: (setViewMode) => setViewMode("compare"),
    isActive: (vm) => vm === "compare",
  },
  {
    id: "json",
    label: "JSON",
    icon: (
      <svg viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        {/* Curly brace glyph */}
        <text x="12" y="13" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" fontWeight="bold">{"{ }"}</text>
      </svg>
    ),
    activate: (setViewMode) => setViewMode("json"),
    isActive: (vm) => vm === "json",
  },
];

export const LayoutPresetPicker = memo(function LayoutPresetPicker() {
  const viewMode = usePreviewStore((s) => s.viewMode);
  const setViewMode = usePreviewStore((s) => s.setViewMode);
  const splitDirection = usePreviewStore((s) => s.splitDirection);
  const setSplitDirection = usePreviewStore((s) => s.setSplitDirection);

  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 bg-tn-surface/80 backdrop-blur-sm border border-tn-border/60 rounded-lg shadow-lg px-1 py-1">
      {PRESETS.map((preset) => {
        const active = preset.isActive(viewMode, splitDirection);
        return (
          <button
            key={preset.id}
            title={preset.label}
            onClick={() => preset.activate(setViewMode, setSplitDirection)}
            className={`w-9 h-[26px] flex items-center justify-center rounded transition-colors ${
              active
                ? "bg-tn-accent/20 text-tn-accent"
                : "text-tn-text-muted hover:text-tn-text hover:bg-white/5"
            }`}
          >
            <span className="w-6 h-[18px] block">{preset.icon}</span>
          </button>
        );
      })}
    </div>
  );
});
