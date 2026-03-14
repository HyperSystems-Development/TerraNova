import { useCallback, useEffect, useState } from "react";

interface VersionEntry {
  version: string;
  date: string;
  highlights?: { label: string; description: string }[];
  sections: { title: string; items: string[] }[];
}

const VERSIONS: VersionEntry[] = [
  {
    version: "1.5.9 McCal's QoL",
    date: "2026-03",
    highlights: [
      {
        label: "Hytale-accurate tint band workflow",
        description: "DensityDelimited tint bands now keep Hytale-accurate ranges, Constant tint typing, and valid default density export behavior.",
      },
      {
        label: "Weather file editor with a real preview",
        description: "Open files from Server\\Weathers and edit them through a dedicated preview-driven editor instead of falling back to raw JSON.",
      },
      {
        label: "Environment file editor with forecast tools",
        description: "Open files from Server\\Environments to edit hourly forecasts, inspect active weights, and jump straight into linked weather files.",
      },
      {
        label: "Simple Controls and In-Depth Controls",
        description: "Both editors now start with a simpler default control layer and keep the heavier track, tag, and raw-field tooling behind an explicit in-depth toggle.",
      },
      {
        label: "Collapsible preview drawers",
        description: "The weather editor preview stack now collapses into 24h strip, track preview, sampled values, and asset breakdown drawers so the scene card stays readable.",
      },
      {
        label: "Issue log and tips toggles",
        description: "Issue logs and tips can now be shown or hidden from a compact detail-panel selector in the weather and environment editors.",
      },
      {
        label: "Cleaner editor chrome",
        description: "Simple control blocks, collapsible sections, and header actions now use the same stronger icon-forward styling.",
      },
      {
        label: "Biome browser and validation QoL",
        description: "Biome search, richer template entries, material autocomplete, clickable weather paths, and one-click validation fixes stay bundled into the same combined release.",
      },
    ],
    sections: [
      {
        title: "Hytale asset accuracy",
        items: [
          "DensityDelimited tint delimiters now preserve real Hytale-style ranges",
          "Tint.Type: \"Constant\" is written consistently on exported tint delimiters",
          "Default tint density injection uses the Hytale-aligned SimplexNoise2D setup",
          "Tint band editor in PropertyPanel supports color, min/max range, and add/remove controls",
          "Tint export path now generates stable delimiter IDs for edited bands",
        ],
      },
      {
        title: "Editors",
        items: [
          "Dedicated weather editor for Server\\Weathers files with preview, save, and sampled track summaries",
          "Dedicated environment editor for Server\\Environments files with hourly forecast editing and linked weather open actions",
          "Weather and environment asset lookup now resolves directly from the real Server folders",
          "Environment files that inherit parent forecasts are no longer treated like broken files",
        ],
      },
      {
        title: "UI and workflow",
        items: [
          "Simple Controls and In-Depth Controls split across both editors",
          "Collapsible weather preview drawers for 24h strip, track preview, sampled values, and asset breakdown",
          "Issue log and tips panels moved behind compact detail controls",
          "Simple control cards, collapsible sections, and header actions now share one visual language",
        ],
      },
      {
        title: "Stability and QA",
        items: [
          "AssetGraphCanvasBridge guarded against maximum update depth loops",
          "Weather and environment editors keep hook order stable when loading from empty state",
          "Real-asset QA pass run against the actual Server\\Weathers and Server\\Environments folders",
          "Editor regression tests added and TypeScript build kept green",
        ],
      },
      {
        title: "Workflow and diagnostics",
        items: [
          "Clickable env/weather file path rows in Atmosphere tab Weather section",
          "Biome Browser search filter and richer two-line template entries",
          "Biome Browser with Hytale Templates tab",
          "Material autocomplete for 193 Hytale material IDs",
          "Legacy node auto-fix and validation one-click fixes",
          "Environment export to named Env_* JSON file",
          "Weather resolution from server assets with metadata panel",
          "Weather section now shows all resolve warnings",
          "Environment delimiter validation with issue flagging",
          "Asset reference candidate pills on relevant fields",
          "Reveal in Explorer from the Asset Tree context menu",
          "Improved 3D preview lighting",
          "HMR fix by extracting utility functions from PropertyPanel to biomeTintUtils.ts",
        ],
      },
    ],
  },
  {
    version: "0.1.5",
    date: "2025",
    sections: [
      {
        title: "Fixes",
        items: [
          "Remove unused variables in CurvePointList",
          "Replace setTimeout with double rAF for handle position updates (graph flow direction connections)",
          "Correct hardware detection for RAM cap, GPU name, and VRAM",
        ],
      },
      {
        title: "Features",
        items: [
          "Interactive sliders for Manual Curve point In/Out values",
          "Manual Curve preview bounds are now static and user-configurable",
          "Angle density node evaluator",
          "FieldFunction MaterialProvider delimiters displayed as proper nodes",
          "Import Manual curves correctly for PositionsCellNoise nodes",
        ],
      },
    ],
  },
  {
    version: "0.1.4",
    date: "2025",
    sections: [
      {
        title: "Features",
        items: [
          "Compound inputs, backward wire dragging, and smart label hiding",
          "Knife tool - cut wires with Ctrl+Shift+LMB drag",
          "SVG export for node graphs",
          "Configuration dialog with granular hardware resource allocation",
          "Adaptive voxel preview with auto-fit Y bounds, fit-to-content, and graph-aware defaults",
          "Major evaluator overhaul: schema-driven nodes and connection intelligence",
          "Undo history cleanup and optional accordion sidebar",
        ],
      },
      {
        title: "Fixes",
        items: [
          "Compound inputs evaluator producing incorrect density preview",
          "Preview worker compatibility for Windows/production builds",
          "Auto-layout on file open disabled by default",
          "SVG 1.1 compliance issues in export",
          "Auto-updater relaunch with platform-specific logic and loop prevention",
        ],
      },
    ],
  },
  {
    version: "0.1.3",
    date: "2025",
    sections: [
      {
        title: "Features",
        items: [
          "Tauri v2 auto-updater with GitHub Releases backend",
          "Updates section in Settings dialog with auto-check toggle",
          "Feedback toast on manual update checks",
        ],
      },
      {
        title: "Fixes",
        items: [
          "SimplexNoise2D settings not taking effect",
          "BiomeRangeEditor redesign",
          "Material tab crash on blank/void template projects",
          "Auto-updater never restarting app after download on macOS",
          "App version synced from git tag in CI release builds",
        ],
      },
    ],
  },
  {
    version: "0.1.2",
    date: "2025",
    sections: [
      {
        title: "Fixes",
        items: [
          "Prevent React error #31 when node fields contain object values",
          "Stringify object field values in NoiseNodeBody to prevent render crash",
        ],
      },
    ],
  },
  {
    version: "0.1.1",
    date: "2025",
    sections: [
      {
        title: "Fixes",
        items: [
          "Resolve Windows gray screen when opening biome files",
          "Scaffold minimal HytaleGenerator structure for blank projects",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2025",
    sections: [
      {
        title: "Initial release",
        items: [
          "Node graph editor for Hytale World Generation V2 biome files",
          "ReactFlow-based canvas with Density, Terrain, Material, Curve, and Environment node types",
          "3D voxel preview with real-time density evaluation",
          "Asset tree sidebar, property panel, and validation system",
          "New project wizard with blank and template project creation",
        ],
      },
    ],
  },
];

interface ChangelogDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangelogDialog({ open, onClose }: ChangelogDialogProps) {
  const [expanded, setExpanded] = useState<string>(VERSIONS[0].version);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[560px] max-h-[80vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-tn-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Changelog</h2>
            <p className="text-[11px] text-tn-text-muted mt-0.5">All TerraNova releases</p>
          </div>
          <button
            onClick={onClose}
            className="text-tn-text-muted hover:text-tn-text transition-colors text-lg leading-none px-1"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="overflow-y-auto flex-1 py-2">
          {VERSIONS.map((versionEntry) => {
            const isOpen = expanded === versionEntry.version;
            return (
              <div key={versionEntry.version} className="border-b border-tn-border/50 last:border-0">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? "" : versionEntry.version)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold">v{versionEntry.version}</span>
                    <span className="text-[11px] text-tn-text-muted">{versionEntry.date}</span>
                    {versionEntry.version === VERSIONS[0].version && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-tn-accent/20 text-tn-accent font-medium">
                        Latest
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-3 h-3 text-tn-text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6 3l5 5-5 5V3z" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-3">
                    {versionEntry.highlights && versionEntry.highlights.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-accent mb-1.5">
                          What to try
                        </p>
                        <ul className="space-y-2">
                          {versionEntry.highlights.map((highlight) => (
                            <li key={highlight.label} className="flex gap-2.5">
                              <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-accent" />
                              <div>
                                <p className="text-[12px] font-medium leading-snug">{highlight.label}</p>
                                <p className="text-[11px] text-tn-text-muted leading-relaxed mt-0.5">
                                  {highlight.description}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {versionEntry.sections.map((section) => (
                      <div key={section.title}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted mb-1.5">
                          {section.title}
                        </p>
                        <ul className="space-y-1.5">
                          {section.items.map((item) => (
                            <li key={item} className="flex gap-2.5 text-[12px] text-tn-text leading-snug">
                              <span className="mt-[5px] shrink-0 w-1 h-1 rounded-full bg-tn-text-muted/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-tn-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded border border-tn-border hover:bg-tn-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
