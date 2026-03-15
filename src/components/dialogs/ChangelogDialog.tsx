import { useCallback, useEffect, useState } from "react";
import { fetchReleases, type ReleaseData } from "@/utils/fetchReleases";

interface ChangelogDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangelogDialog({ open, onClose }: ChangelogDialogProps) {
  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchReleases()
      .then((data) => {
        setReleases(data);
        if (data.length > 0) setExpanded(data[0].version);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [open]);

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
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-tn-text-muted animate-pulse">Loading releases...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-sm text-tn-text-muted">Could not load releases</p>
              <p className="text-[11px] text-tn-text-muted/60">{error}</p>
            </div>
          )}

          {!loading && !error && releases.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-tn-text-muted">No releases found</span>
            </div>
          )}

          {!loading && !error && releases.map((release) => {
            const isOpen = expanded === release.version;
            return (
              <div key={release.version} className="border-b border-tn-border/50 last:border-0">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? "" : release.version)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold">v{release.version}</span>
                    <span className="text-[11px] text-tn-text-muted">{release.date}</span>
                    {release.version === releases[0].version && (
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
                    {release.sections.map((section) => (
                      <div key={section.title}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted mb-1.5">
                          {section.title}
                        </p>
                        <ul className="space-y-1.5">
                          {section.items.map((item) => (
                            <li key={item.label} className="flex gap-2.5 text-[12px] text-tn-text leading-snug">
                              <span className="mt-[5px] shrink-0 w-1 h-1 rounded-full bg-tn-text-muted/60" />
                              <span>
                                {item.description ? (
                                  <>
                                    <span className="font-medium">{item.label}</span>
                                    <span className="text-tn-text-muted"> — {item.description}</span>
                                  </>
                                ) : (
                                  item.label
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {release.sections.length === 0 && (
                      <p className="text-[12px] text-tn-text-muted italic">No release notes available.</p>
                    )}
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
