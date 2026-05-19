import { useEffect, useRef, useMemo } from "react";
import { useEditorStore } from "@/stores/editorStore";

export function HistoryPanel() {
  const globalHistory = useEditorStore((s) => s.history);
  const globalHistoryIndex = useEditorStore((s) => s.historyIndex);
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);
  const jumpToHistory = useEditorStore((s) => s.jumpToHistory);
  const listRef = useRef<HTMLDivElement>(null);

  // Derive history from section or global state
  const { displayHistory, displayIndex } = useMemo(() => {
    if (biomeSections && activeBiomeSection) {
      const section = biomeSections[activeBiomeSection];
      if (section) {
        return {
          displayHistory: section.history.map((e) => ({ label: e.label })),
          displayIndex: section.historyIndex,
        };
      }
    }
    return {
      displayHistory: globalHistory.map((e) => ({ label: e.label })),
      displayIndex: globalHistoryIndex,
    };
  }, [biomeSections, activeBiomeSection, globalHistory, globalHistoryIndex]);

  // Auto-scroll to current entry
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[displayIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [displayIndex]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-tn-border shrink-0">
        <svg className="w-3.5 h-3.5 text-tn-text-muted" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 3.5a.5.5 0 0 0-1 0V8a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 7.71V3.5z" />
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
        </svg>
        <span className="text-xs font-medium text-tn-text">History</span>
        {biomeSections && activeBiomeSection && (
          <span className="text-[10px] text-tn-accent truncate max-w-[80px]">{activeBiomeSection}</span>
        )}
        <span className="text-[10px] text-tn-text-muted ml-auto" aria-label={`${displayHistory.length} history entries`}>{displayHistory.length}</span>
      </div>

      {/* Entry list */}
      <div ref={listRef} className="flex-1 overflow-y-auto" role="list" aria-label="History entries">
        {displayHistory.map((entry, i) => {
          const isCurrent = i === displayIndex;
          const isFuture = i > displayIndex;

          return (
            <button
              key={i}
              className={`w-full text-left px-2 py-1 text-[11px] flex items-center gap-2 ${
                isCurrent
                  ? "bg-tn-accent/20 border-l-2 border-tn-accent"
                  : isFuture
                    ? "opacity-40 hover:opacity-60 pl-[10px] cursor-not-allowed"
                    : "hover:bg-white/5 pl-[10px]"
              }`}
              onClick={() => jumpToHistory(i)}
              disabled={isFuture}
              role="listitem"
              aria-current={isCurrent ? "true" : undefined}
              aria-disabled={isFuture ? "true" : undefined}
              aria-label={`History entry ${i}: ${entry.label ?? "Edit"}${isCurrent ? " (current)" : isFuture ? " (future)" : ""}`}
            >
              <span className="text-tn-text-muted w-4 text-right shrink-0 text-[10px]" aria-hidden="true">
                {i}
              </span>
              <span className={`truncate ${isCurrent ? "text-tn-text" : "text-tn-text-muted"}`}>
                {entry.label ?? "Edit"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
