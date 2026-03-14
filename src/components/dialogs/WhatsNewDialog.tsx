import { useCallback, useEffect, useState } from "react";
import { ChangelogDialog } from "./ChangelogDialog";

const CURRENT_VERSION = "1.5.9";
const CURRENT_VERSION_LABEL = "1.5.9 McCal's QoL";
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
          "DensityDelimited TintProvider bands now keep real Hytale-style ranges, Tint.Type: Constant, and a valid default density node when needed.",
      },
      {
        label: "Weather files in a dedicated editor",
        description:
          "Open a JSON file from Server\\Weathers to get a real scene preview, quick controls, collapsible track summaries, and direct save support instead of a raw JSON fallback.",
      },
      {
        label: "Environment files in a dedicated editor",
        description:
          "Open a JSON file from Server\\Environments to inspect hourly forecasts, edit a primary weather for the current hour, and open linked weather files directly.",
      },
      {
        label: "Simple Controls vs In-Depth Controls",
        description:
          "Both editors now default to a simpler control layer for fast edits, while the in-depth mode keeps the full weather tracks, tags, and raw-field tooling out of the way until you need them.",
      },
      {
        label: "Preview drawers you can expand on demand",
        description:
          "The weather preview stack is now broken into collapsible sections for the 24h strip, track previews, sampled values, and asset breakdown so the scene card stays visible.",
      },
      {
        label: "Issue log and tips panels",
        description:
          "In in-depth mode, both editors expose issue logs and tips behind a compact detail-panel selector instead of keeping those callouts permanently expanded.",
      },
      {
        label: "Clickable asset file paths",
        description:
          "Environment and weather file references in the Atmosphere workflow now open directly in the editor so you can move from biome setup into the dedicated file editors quickly.",
      },
      {
        label: "Biome browser and validation QoL",
        description:
          "Biome search, richer template entries, material autocomplete, legacy node fixes, and one-click validation fixes are all still part of this combined QoL pass.",
      },
      {
        label: "Cleaner editor chrome",
        description:
          "Section headers, simple control cards, and header actions now share the same stronger styling and icon treatment so the weather and environment editors read more clearly.",
      },
    ],
  },
  {
    title: "Known limitations",
    items: [
      {
        label: "Weather/environment graph routes remain disabled",
        description:
          "The dedicated file editors are active, but graph mode for weather, environment, and tint stays disabled until the true Hytale-native provider graph work is ready.",
      },
    ],
  },
];

const FULL_CHANGELOG: Section[] = [
  {
    title: "Hytale asset accuracy",
    items: [
      {
        label: "DensityDelimited tint Range fields",
        description: "Tint delimiters now preserve Hytale-accurate Range values and keep Tint.Type set to Constant during export.",
      },
      {
        label: "Default tint density injection",
        description: "When a DensityDelimited TintProvider is missing Density, TerraNova injects the canonical SimplexNoise2D node with the Hytale-aligned Octaves value.",
      },
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
