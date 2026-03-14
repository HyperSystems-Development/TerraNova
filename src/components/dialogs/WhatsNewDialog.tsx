import { useCallback, useEffect, useState } from "react";
import { ChangelogDialog } from "./ChangelogDialog";

const CURRENT_VERSION = "1.5.9";
const CURRENT_VERSION_LABEL = "1.5.9 McCal's QoL";
const STORAGE_KEY = "terranova:whats-new-seen";
const SUPPRESS_KEY = "terranova:whats-new-suppress";

export function useWhatsNew() {
  let seen = false;
  const FULL_CHANGELOG: Section[] = [
    {
      title: "Features",
      items: [
        {
          label: "Hytale-accurate tint workflow",
          description: "DensityDelimited tint bands now preserve Hytale-style Range values and export with Tint.Type set to Constant. Default density injection ensures valid exports when missing.",
        },
        {
          label: "Dedicated weather file editor",
          description: "Weather JSON files open into a preview-driven editor with save support, sampled track summaries, cloud breakdowns, and direct sampling at the selected hour.",
        },
        {
          label: "Dedicated environment file editor",
          description: "Environment JSON files open into a forecast-focused editor with current-hour controls, hourly weather entries, and direct links into the matching weather file.",
        },
        {
          label: "Simple Controls and In-Depth Controls",
          description: "Both editors default to a simpler control layer for fast edits while keeping the full track/tag/raw-field tooling behind an explicit in-depth toggle.",
        },
        {
          label: "Collapsible preview drawers",
          description: "The preview stack is broken into collapsible sections (24h strip, track previews, sampled values, asset breakdown) to keep the scene card visible.",
        },
      ],
    },
    {
      title: "Quality of life",
      items: [
        {
          label: "Clickable asset file paths",
          description: "Environment and weather file references in the Atmosphere workflow now open directly in the editor for faster navigation.",
        },
        {
          label: "Biome browser and validation",
          description: "Searchable biome browser, richer template entries, material autocomplete, and one-click validation fixes improve day-to-day editing workflows.",
        },
        {
          label: "Cleaner editor chrome",
          description: "Section headers, simple control cards, and header actions share a stronger styling and icon treatment for better readability.",
        },
        {
          label: "Issue log and tips panels",
          description: "Issue logs and tips are now available behind a compact detail-panel selector instead of being permanently expanded.",
        },
      ],
    },
    {
      title: "Bug fixes",
      items: [
        {
          label: "Environment inheritance handling",
          description: "Files that inherit forecasts from parents no longer appear broken when local WeatherForecasts are absent.",
        },
        {
          label: "Update-depth guard in asset graph bridge",
          description: "Graph bridge no longer pushes state back into the editor store on every render, preventing maximum update depth loops.",
        },
        {
          label: "Stable hook order on empty load states",
          description: "Editors keep hook order stable when opening from an empty state, avoiding render crash scenarios.",
        },
        {
          label: "Tint export stability",
          description: "Edited tint bands now round-trip correctly with stable delimiter IDs and consistent exported fields.",
        },
      ],
    },
    {
      title: "Potential bugs / known limitations",
      items: [
        {
          label: "Graph mode disabled",
          description: "Weather/environment graph routes remain disabled until the Hytale-native provider graph work is ready.",
        },
        {
          label: "Dev HMR adjustments",
          description: "React Fast Refresh was temporarily disabled in development to avoid HMR issues; dev hot-reload behavior may differ until a full refactor is applied.",
        },
        {
          label: "Large asset cache",
          description: "The Hytale asset cache can reach multiple gigabytes; ensure disk space before syncing and monitor progress in the Sync modal.",
        },
        {
          label: "TypeScript / dev warnings",
          description: "Some dev-only TypeScript warnings and minor edge cases remain — run the full typecheck (pnpm exec tsc --noEmit) as part of release validation.",
        },
      ],
    },
  ];
      {
        label: "Tint band editing in the property panel",
        description: "DensityDelimited tint bands can be edited inline with color pickers, range inputs, and add/remove controls.",
      },
      {
        label: "Tint export stability",
        description: "Delimiter node IDs and related tint export fields are now generated consistently so edited bands round-trip back to Hytale-shaped JSON safely.",
      },
    ],
  },
  {
    title: "Weather and environment editors",
    items: [
      {
        label: "Dedicated weather file editor",
        description: "Weather JSON files now open into a preview-driven editor with save support, track summaries, cloud breakdowns, and direct sampling at the selected hour.",
      },
      {
        label: "Dedicated environment file editor",
        description: "Environment JSON files now open into a forecast-focused editor with current-hour controls, hourly weather entries, and direct links into the matching weather file.",
      },
      {
        label: "Real asset lookup paths",
        description: "Weather IDs and file references resolve directly against Server\\Weathers and Server\\Environments rather than guessing inside HytaleGenerator.",
      },
      {
        label: "Parent-environment awareness",
        description: "Environment files that inherit forecasts from a parent are no longer treated like broken files just because they do not define local WeatherForecasts.",
      },
    ],
  },
  {
    title: "Preview and control cleanup",
    items: [
      {
        label: "Simple Controls and In-Depth Controls split",
        description: "Both editors now default to quick edits first, with detailed controls kept behind an explicit in-depth toggle.",
      },
      {
        label: "Collapsible weather preview drawers",
        description: "The 24h strip, track previews, sampled values, and asset breakdown can be expanded only when needed, which keeps the main scene preview visible.",
      },
      {
        label: "Issue log and tips toggles",
        description: "Weather and environment editors now expose issue logs and tips through compact detail-panel controls instead of forcing those callouts open all the time.",
      },
      {
        label: "Unified section styling",
        description: "Simple controls, collapsible sections, and header action buttons now share a consistent icon-forward visual language.",
      },
    ],
  },
  {
    title: "Stability and QA",
    items: [
      {
        label: "Update-depth guard in asset graph bridge",
        description: "Weather and environment graph bridges no longer push state back into the editor store on every render, preventing the maximum update depth crash.",
      },
      {
        label: "Stable hook order on empty load states",
        description: "Both editors now keep hook order stable when opening from an empty state into a loaded file, preventing the rendered-more-hooks crash.",
      },
      {
        label: "Real asset QA pass",
        description: "The new editors were checked against the actual Server\\Weathers and Server\\Environments folders to verify parsing, forecast references, and asset coverage.",
      },
      {
        label: "Regression coverage and green typecheck",
        description: "Editor-specific tests now cover the weather/environment views and the shared graph bridge, and the TypeScript build stays green after the cleanup.",
      },
    ],
  },
  {
    title: "Biome browser, validation, and workflow",
    items: [
      {
        label: "Biome browser search and richer entries",
        description: "Biome Browser search, richer two-line template entries, and Hytale template packs remain part of the QoL release set.",
      },
      {
        label: "Clickable weather file paths",
        description: "Resolved environment and weather file path rows in the Atmosphere tab can open the file directly in the editor.",
      },
      {
        label: "Material autocomplete and validation fixes",
        description: "Material autocomplete, legacy node replacement hints, and one-click validation fixes are included in the combined QoL entry.",
      },
      {
        label: "Environment export and weather resolution",
        description: "Environment export, weather resolution from server assets, and the expanded weather warning display are all part of this combined release.",
      },
    ],
  },
];

interface WhatsNewDialogProps {
  open: boolean;
  onClose: (suppress: boolean) => void;
}

export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
  const [view, setView] = useState<"highlights" | "changelog">("highlights");
  const [suppress, setSuppress] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
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
          onClick={(event) => event.stopPropagation()}
        >
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
                  v{CURRENT_VERSION_LABEL}
                </p>
              </div>
            </div>
            <button
              onClick={() => onClose(suppress)}
              className="text-tn-text-muted hover:text-tn-text transition-colors text-lg leading-none px-1"
              aria-label="Close"
            >
              x
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {view === "highlights" && (
              <>
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
              </>
            )}

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

          <div className="flex items-center justify-between px-5 py-3 border-t border-tn-border shrink-0">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={suppress}
                  onChange={(event) => setSuppress(event.target.checked)}
                  className="w-3.5 h-3.5 accent-tn-accent"
                />
                <span className="text-[11px] text-tn-text-muted">Don't show on startup</span>
              </label>
              {view === "highlights" && (
                <button
                  onClick={() => setView("changelog")}
                  className="text-[11px] text-tn-accent hover:opacity-80 transition-opacity"
                >
                  Full changelog -&gt;
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
