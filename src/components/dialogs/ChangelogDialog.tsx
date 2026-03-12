import { useState, useEffect, useCallback } from "react";

interface VersionEntry {
  version: string;
  date: string;
  sections: { title: string; items: string[] }[];
}

const VERSIONS: VersionEntry[] = [
  {
    version: "0.1.5 QoL2",
    date: "2026-03",
    sections: [
      {
        title: "Hytale asset accuracy",
        items: [
          "DensityDelimited TintProvider delimiters now include Range (-1 to 1 in thirds) matching real Hytale biomes",
          "Tint.Type: \"Constant\" written on every delimiter to match V2 format exactly",
          "Default Density node (SimplexNoise2D: Seed tints, Scale 100, Octaves 3) injected when missing from DensityDelimited TintProvider",
          "Clickable env/weather file path rows in Atmosphere tab Weather section open the file in the editor",
          "Biome Browser search filter — filters by name when more than 4 biomes are listed",
          "Biome Browser template entries show biome Name + display name/source on two lines",
          "Weather section now shows all resolve warnings, not just the first",
          "Weather section shows resolved environment and weather file paths as metadata rows",
        ],
      },
      {
        title: "Code quality",
        items: [
          "applyBiomeTintBand, buildDelimiterTypeOptions, getAdvancedDelimiterTypeDetails extracted to biomeTintUtils.ts — fixes Vite Fast Refresh HMR warning",
          "6 new unit tests covering Range, Tint.Type, and Density injection in applyBiomeTintBand",
        ],
      },
    ],
  },
  {
    version: "0.1.5 QoL1",
    date: "2026-03",
    sections: [
      {
        title: "New features",
        items: [
          "Block/material autocomplete — 193 Hytale material IDs suggested in Material, Solid, Fluid, BlockType fields",
          "Legacy node auto-fix — 74 deprecated V2 types flagged; 18 have 1:1 replacements applicable in one click",
          "Validation one-click fixes — biome name, tint provider, and field constraint errors all have Fix buttons",
          "Reveal in Explorer — right-click any Asset Tree item to open it highlighted in Windows Explorer",
          "Biome Browser — Hytale Templates tab with real reference biomes (Salt Flats, Hive World, The Underworld, etc.)",
          "What's New dialog on first launch with full changelog and startup toggle",
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
          "Knife tool — cut wires with Ctrl+Shift+LMB drag",
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
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-2">
          {VERSIONS.map((v) => {
            const isOpen = expanded === v.version;
            return (
              <div key={v.version} className="border-b border-tn-border/50 last:border-0">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? "" : v.version)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold">v{v.version}</span>
                    <span className="text-[11px] text-tn-text-muted">{v.date}</span>
                    {v.version === VERSIONS[0].version && (
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
                    {v.sections.map((section) => (
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

        {/* Footer */}
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
