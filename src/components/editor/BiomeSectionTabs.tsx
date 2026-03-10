import { useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { getSectionSummary } from "@/utils/biomeSectionUtils";

const TAB_COLORS: Record<string, string> = {
  Terrain: "#5B8DBF",
  MaterialProvider: "#C87D3A",
  EnvironmentProvider: "#7DB350",
  TintProvider: "#76A26A",
};

function getTabColor(key: string): string {
  if (key in TAB_COLORS) return TAB_COLORS[key];
  if (key.startsWith("Props[")) return "#C76B6B";
  return "#8C8878";
}

function getTabLabel(key: string): string {
  if (key === "MaterialProvider") return "Materials";
  if (key === "EnvironmentProvider") return "Atmosphere";
  if (key === "TintProvider") return "Tint";
  if (key.startsWith("Props[")) {
    const match = /\[(\d+)\]/.exec(key);
    return match ? `Prop ${match[1]}` : key;
  }
  return key;
}

/** Inline SVG icons — abstract representations of section types */
function TabIcon({ sectionKey }: { sectionKey: string }) {
  const cls = "w-3.5 h-3.5 mr-1.5 shrink-0";

  if (sectionKey === "Terrain") {
    // Waveform — represents density function
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 8c1.5-4 3-4 4.5 0S8 12 9.5 8s3-4 4.5 0" />
      </svg>
    );
  }

  if (sectionKey === "MaterialProvider") {
    // Stacked layers — represents material layering
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l6 3 6-3" />
        <path d="M2 7l6 3 6-3" />
        <path d="M2 4l6 3 6-3L8 1 2 4z" />
      </svg>
    );
  }

  if (sectionKey === "EnvironmentProvider") {
    // Sun + horizon line -> atmosphere/environment section
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 11h12" />
        <path d="M5 9a3 3 0 0 1 6 0" />
        <path d="M8 3v2" />
      </svg>
    );
  }

  if (sectionKey === "TintProvider") {
    // Color ramp markers -> tint section
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10h12" />
        <circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="8" cy="6" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="12" cy="6" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (sectionKey.startsWith("Props[")) {
    // Cube — represents a generic placeable object
    return (
      <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M8 1L2 4.5v7L8 15l6-3.5v-7L8 1z" />
        <path d="M8 8v7" />
        <path d="M8 8L2 4.5" />
        <path d="M8 8l6-3.5" />
      </svg>
    );
  }

  // Fallback: circle
  return (
    <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

export function BiomeSectionTabs() {
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);
  const addPropSection = useEditorStore((s) => s.addPropSection);
  const suppressPropDeleteConfirm = useUIStore((s) => s.suppressPropDeleteConfirm);

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  if (!biomeSections) return null;

  const keys = Object.keys(biomeSections);

  const pendingSection = pendingDelete ? biomeSections[pendingDelete] : null;
  const pendingNodeCount = pendingSection?.nodes.length ?? 0;

  function handleDeleteClick(key: string) {
    const section = biomeSections![key];
    const hasNodes = section && section.nodes.length > 0;
    if (!hasNodes || suppressPropDeleteConfirm) {
      // Call store directly — avoids closure/hook reference issues
      useEditorStore.getState().removePropSection(key);
      return;
    }
    setPendingDelete(key);
    setDontAskAgain(false);
  }

  function confirmDelete() {
    const key = pendingDelete;
    if (!key) return;
    // Close dialog first so the portal unmounts cleanly
    setPendingDelete(null);
    if (dontAskAgain) {
      useUIStore.getState().setSuppressPropDeleteConfirm(true);
    }
    // Call store directly via getState() — portal event handling can
    // cause stale closure references when using hook-derived actions
    useEditorStore.getState().removePropSection(key);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  return (
    <div className="relative flex items-center gap-1 px-3 py-1.5">
      {keys.map((key) => {
        const isActive = key === activeBiomeSection;
        const color = getTabColor(key);
        const section = biomeSections[key];
        const summary = section ? getSectionSummary(key, section) : null;
        const nodeCount = summary?.nodeCount ?? 0;
        const tooltip = summary?.rootTypeChain || getTabLabel(key);
        const isPropsTab = key.startsWith("Props[");

        return (
          <button
            key={key}
            onClick={() => switchBiomeSection(key)}
            title={tooltip}
            className={`group flex items-center px-3 py-1 text-xs font-medium rounded-t transition-all duration-150 whitespace-nowrap ${
              isActive
                ? "text-white border-b-2"
                : "text-tn-text-muted hover:text-tn-text hover:bg-white/5"
            }`}
            style={{
              borderBottomColor: isActive ? color : "transparent",
              backgroundColor: isActive ? `${color}20` : undefined,
            }}
          >
            <TabIcon sectionKey={key} />
            {getTabLabel(key)}
            {nodeCount > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-[10px] leading-none rounded-full font-semibold"
                style={{
                  backgroundColor: isActive ? `${color}40` : "rgba(255,255,255,0.08)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              >
                {nodeCount}
              </span>
            )}
            {isPropsTab && (
              <span
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hover:text-red-400"
                title="Remove prop section"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(key);
                }}
              >
                x
              </span>
            )}
          </button>
        );
      })}
      {/* Add Props section button */}
      <button
        onClick={addPropSection}
        title="Add new Props section"
        className="flex items-center justify-center w-6 h-6 ml-1 text-xs text-tn-text-muted hover:text-white hover:bg-white/10 rounded transition-colors"
      >
        +
      </button>

      {/* Confirmation modal — rendered via portal to escape overflow clipping */}
      {pendingDelete && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) cancelDelete(); }}
        >
          <div
            className="bg-tn-panel border border-tn-border rounded-xl shadow-2xl p-5 min-w-[280px] max-w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-tn-text mb-1">Remove Prop Section</h3>
            <p className="text-xs text-tn-text-muted mb-4">
              Are you sure you want to remove &ldquo;{getTabLabel(pendingDelete)}&rdquo;?
              It has <span className="text-tn-text font-medium">{pendingNodeCount}</span> node(s).
              This cannot be undone.
            </p>
            <label className="flex items-center gap-2 text-[11px] text-tn-text-muted mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="rounded border-tn-border bg-tn-surface w-3.5 h-3.5 accent-tn-accent"
              />
              Don&apos;t ask again
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-3 py-1.5 text-xs text-tn-text-muted hover:text-tn-text bg-white/5 hover:bg-white/10 rounded-lg border border-tn-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
