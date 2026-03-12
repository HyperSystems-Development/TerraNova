import { useState, useEffect, useCallback } from "react";
import { ChangelogDialog } from "./ChangelogDialog";

// Bump this string whenever you want the dialog to reappear for existing users.
const CURRENT_VERSION = "0.1.5-qol2";
const STORAGE_KEY = "terranova:whats-new-seen";
const SUPPRESS_KEY = "terranova:whats-new-suppress";

export function useWhatsNew() {
  let seen = false;
  let suppressed = false;
  try {
    seen = localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION;
    suppressed = localStorage.getItem(SUPPRESS_KEY) === "true";
  } catch {
    // localStorage unavailable
  }
  function dismiss(suppress: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      if (suppress) {
        localStorage.setItem(SUPPRESS_KEY, "true");
      } else {
        localStorage.removeItem(SUPPRESS_KEY);
      }
    } catch {
      // ignore
    }
  }
  return { shouldShow: !seen && !suppressed, dismiss };
}

// ── Content ─────────────────────────────────────────────────────────────────

interface ChangeItem {
  label: string;
  description: string;
}

interface Section {
  title: string;
  items: ChangeItem[];
}

const HIGHLIGHTS: Section[] = [
  {
    title: "What to try",
    items: [
      {
        label: "Hytale-accurate tint bands",
        description:
          "DensityDelimited TintProvider bands now match real Hytale biomes exactly — Range (-1 to 1 in thirds), Tint.Type: Constant, and a default SimplexNoise2D Density node are all written automatically when you edit tint colors.",
      },
      {
        label: "Weather file paths — click to open",
        description:
          "In the Atmosphere tab's Weather section, the resolved environment and weather file path rows are now clickable. Click to open the file directly in the editor.",
      },
      {
        label: "Biome browser search",
        description:
          "Type in the search box above the Biome Browser list (visible when you have more than 4 biomes) to instantly filter by biome name.",
      },
      {
        label: "Biome Browser — Hytale templates",
        description:
          "Open a biome's Atmosphere tab → Biome Browser → 'Hytale Templates'. Browse and open real Hytale reference biomes (Salt Flats, Hive World, The Underworld, etc.) and template packs as a starting point.",
      },
      {
        label: "Block/material autocomplete",
        description:
          "Select any node with a Material, Solid, Fluid, BlockType, or BlockTypes field. Start typing — a dropdown of all 193 Hytale material IDs appears.",
      },
      {
        label: "Legacy node auto-fix",
        description:
          "Open the Validation panel. Legacy nodes removed from the V2 API are flagged in amber. Click 'Replace' on one node or 'Remove all N legacy nodes' to bulk-clean a graph.",
      },
      {
        label: "One-click validation fixes",
        description:
          "Validation errors for missing biome names, missing tint providers, and out-of-range field values each have a Fix button that applies the correction instantly.",
      },
      {
        label: "Reveal in Explorer",
        description:
          "Right-click any file or folder in the Asset Tree sidebar to open it highlighted in Windows Explorer.",
      },
    ],
  },
  {
    title: "Known limitations",
    items: [
      {
        label: "Legacy nodes without a replacement",
        description:
          "Some legacy types (SumSelf, BeardDensity, Scanner variants) have no 1:1 modern equivalent — they can only be removed, not swapped.",
      },
    ],
  },
];

const FULL_CHANGELOG: Section[] = [
  {
    title: "Hytale asset accuracy (QoL 2)",
    items: [
      {
        label: "DensityDelimited tint Range fields",
        description: "Each Delimiter in a DensityDelimited TintProvider now includes the correct Range (MinInclusive/MaxExclusive) matching real Hytale biomes — thirds across -1 to 1.",
      },
      {
        label: "Tint.Type: Constant on all delimiters",
        description: "Every tint delimiter now correctly sets Tint.Type: \"Constant\" in exported biome JSON, matching the Hytale V2 format.",
      },
      {
        label: "Default Density node injected automatically",
        description: "If a DensityDelimited TintProvider has no Density field, the editor now injects the canonical SimplexNoise2D node (Seed: tints, Scale: 100, Octaves: 3) so exports are always valid.",
      },
      {
        label: "Clickable weather file paths",
        description: "The resolved environment and weather file path rows in the Atmosphere tab Weather section are now clickable and open the file in the editor.",
      },
      {
        label: "Biome browser search filter",
        description: "A search input appears above the Biome Browser list when more than 4 biomes are present, letting you filter by biome name instantly.",
      },
      {
        label: "Biome browser richer template entries",
        description: "Template biome entries now show two lines: the biome Name and a subtitle with the display name and template source.",
      },
      {
        label: "Weather section shows all warnings",
        description: "Previously only the first warning was shown in the Weather metadata section. All resolve warnings are now listed.",
      },
      {
        label: "Weather section shows env and weather paths",
        description: "The resolved environment file path and weather file path are now displayed as rows in the Weather metadata panel.",
      },
      {
        label: "HMR fix — utility functions extracted",
        description: "applyBiomeTintBand, buildDelimiterTypeOptions, and getAdvancedDelimiterTypeDetails moved to biomeTintUtils.ts, fixing the Vite Fast Refresh HMR warning for PropertyPanel.",
      },
    ],
  },
  {
    title: "Atmosphere & weather (QoL 1)",
    items: [
      {
        label: "Time-of-day animation",
        description: "Animate and scrub through hour-by-hour weather changes in the Atmosphere tab with adjustable speed.",
      },
      {
        label: "Sun angle control",
        description: "Manually set or animate sun angle (0–360°) to preview lighting at any time of day.",
      },
      {
        label: "Environment export",
        description: "Export a named Env_* JSON environment file and automatically point the biome's EnvironmentProvider at it.",
      },
      {
        label: "Fog controls",
        description: "Fog near/far distance and color are now editable in the Atmosphere tab and feed directly into the 3D preview.",
      },
      {
        label: "Weather resolution",
        description: "The tab resolves the active environment and weather ID from your server assets and shows them in a metadata panel.",
      },
    ],
  },
  {
    title: "Validation & diagnostics (QoL 1)",
    items: [
      {
        label: "Environment delimiter validation",
        description: "Validates Imported/Exported environment delimiter nodes and flags missing, unsupported, or misconfigured environments.",
      },
      {
        label: "Asset reference candidate pills",
        description: "Potential asset paths are shown as clickable pills on relevant fields, indexed across the open project.",
      },
      {
        label: "Field constraint enforcement",
        description: "Fields with min/max/required constraints are flagged and can be clamped or filled in one click.",
      },
      {
        label: "Biome name and tint validation",
        description: "Missing biome names and absent TintProvider configurations are now flagged with one-click fixes.",
      },
      {
        label: "Legacy node detection",
        description: "74 legacy V2 node types are flagged. 18 of them have 1:1 replacements that can be applied in one click.",
      },
    ],
  },
  {
    title: "Editor & UI (QoL 1)",
    items: [
      {
        label: "Tint provider support",
        description: "TintProvider bands are editable as a gradient preview with three color pickers (cool/mid/warm).",
      },
      {
        label: "EnvironmentProvider graph section",
        description: "The EnvironmentProvider can now be opened and edited as a node graph section.",
      },
      {
        label: "Hytale template biomes",
        description: "The Biome Browser now includes bundled Hytale reference biomes and template packs.",
      },
      {
        label: "Material autocomplete",
        description: "All 193 Hytale material IDs are available as autocomplete suggestions in material-related fields.",
      },
      {
        label: "Reveal in Explorer",
        description: "Right-click context menu on any Asset Tree item opens Windows Explorer with the file/folder selected.",
      },
      {
        label: "Improved 3D preview lighting",
        description: "VoxelPreview3D now has better ambient and directional lighting parameters.",
      },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

interface WhatsNewDialogProps {
  open: boolean;
  onClose: (suppress: boolean) => void;
}

export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
  const [view, setView] = useState<"highlights" | "changelog">("highlights");
  const [suppress, setSuppress] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose(suppress);
      }
    },
    [open, onClose, suppress],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => onClose(suppress)}
    >
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[580px] max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tn-border shrink-0">
          <div className="flex items-center gap-2">
            {view === "changelog" && (
              <button
                onClick={() => setView("highlights")}
                className="text-tn-text-muted hover:text-tn-text transition-colors text-sm leading-none pr-2 flex items-center gap-1"
                aria-label="Back"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10 3L5 8l5 5V3z" />
                </svg>
                Back
              </button>
            )}
            <div>
              <h2 className="text-sm font-semibold">
                {view === "changelog" ? "Full Changelog" : "What's new in TerraNova"}
              </h2>
              <p className="text-[11px] text-tn-text-muted mt-0.5">
                Quality-of-life update — v{CURRENT_VERSION.replace("qol", "QoL ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(suppress)}
            className="text-tn-text-muted hover:text-tn-text transition-colors text-lg leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {view === "highlights" && (<>
          {/* Highlights */}
          {HIGHLIGHTS.map((section) => (
            <div key={section.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-accent" />
                    <div>
                      <p className="text-[13px] font-medium leading-snug">{item.label}</p>
                      <p className="text-[12px] text-tn-text-muted leading-relaxed mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </>)}

          {/* Full changelog view */}
          {view === "changelog" && (
            <div className="space-y-5">
              {FULL_CHANGELOG.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.label} className="flex gap-3">
                        <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-border" />
                        <div>
                          <p className="text-[12px] font-medium leading-snug">{item.label}</p>
                          <p className="text-[11px] text-tn-text-muted leading-relaxed mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-tn-border shrink-0">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={suppress}
                onChange={(e) => setSuppress(e.target.checked)}
                className="w-3.5 h-3.5 accent-tn-accent"
              />
              <span className="text-[11px] text-tn-text-muted">Don't show on startup</span>
            </label>
            {view === "highlights" && (
              <button
                onClick={() => setView("changelog")}
                className="text-[11px] text-tn-accent hover:opacity-80 transition-opacity"
              >
                Full changelog →
              </button>
            )}
            <button
              onClick={() => setShowAllVersions(true)}
              className="text-[11px] text-tn-text-muted hover:text-tn-text transition-colors"
            >
              Past versions
            </button>
          </div>
          <button
            onClick={() => onClose(suppress)}
            className="px-4 py-1.5 text-xs rounded bg-tn-accent text-tn-bg font-medium hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
    <ChangelogDialog open={showAllVersions} onClose={() => setShowAllVersions(false)} />
    </>
  );
}
