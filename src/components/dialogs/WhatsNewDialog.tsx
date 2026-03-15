import { useCallback, useEffect, useState } from "react";
import { ChangelogDialog } from "./ChangelogDialog";
import { fetchReleases, getAppVersion, type ReleaseData, type ReleaseSection } from "@/utils/fetchReleases";

const STORAGE_KEY = "terranova:whats-new-seen";
const SUPPRESS_KEY = "terranova:whats-new-suppress";

export function useWhatsNew() {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  const seen =
    appVersion !== null &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem(STORAGE_KEY) === appVersion;

  const suppressed =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(SUPPRESS_KEY) === "true";

  return {
    shouldShow: appVersion !== null && !seen && !suppressed,
    dismiss(suppress: boolean) {
      try {
        if (appVersion) localStorage.setItem(STORAGE_KEY, appVersion);
        if (suppress) localStorage.setItem(SUPPRESS_KEY, "true");
        else localStorage.removeItem(SUPPRESS_KEY);
      } catch {}
    },
  };
}

interface WhatsNewDialogProps {
  open: boolean;
  onClose: (suppress: boolean) => void;
}

export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
  const [view, setView] = useState<"highlights" | "changelog">("highlights");
  const [suppress, setSuppress] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [appVersion, setAppVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchReleases(), getAppVersion()])
      .then(([data, ver]) => {
        setReleases(data);
        setAppVersion(ver);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [open]);

  const latest = releases[0] ?? null;

  // "What's New" section serves as highlights; fall back to first section
  const highlights: ReleaseSection[] = latest
    ? (() => {
        const whatsNew = latest.sections.find(
          (s) => s.title.toLowerCase() === "what's new",
        );
        return whatsNew ? [whatsNew] : latest.sections.slice(0, 1);
      })()
    : [];

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
                  v{appVersion}
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
            {loading && (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-tn-text-muted animate-pulse">Loading release notes...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-sm text-tn-text-muted">Could not load release notes</p>
                <p className="text-[11px] text-tn-text-muted/60">{error}</p>
              </div>
            )}

            {!loading && !error && view === "highlights" && (
              <>
                {highlights.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">
                      {section.title}
                    </h3>
                    <ul className="space-y-3">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-accent" />
                          <div>
                            <p className="text-[13px] font-medium leading-snug">{item.label}</p>
                            {item.description && (
                              <p className="text-[12px] text-tn-text-muted leading-relaxed mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}

            {!loading && !error && view === "changelog" && latest && (
              <div className="space-y-5">
                {latest.sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted mb-2">
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-tn-border" />
                          <div>
                            <p className="text-[12px] font-medium leading-snug">{item.label}</p>
                            {item.description && (
                              <p className="text-[11px] text-tn-text-muted leading-relaxed mt-0.5">
                                {item.description}
                              </p>
                            )}
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
