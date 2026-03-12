import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdateStore } from "@/stores/updateStore";
import { checkForUpdates, downloadAndInstall, restartToUpdate } from "@/utils/updater";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { FlowDirection } from "@/constants";
import { WhatsNewDialog } from "./WhatsNewDialog";
import { ChangelogDialog } from "./ChangelogDialog";

const WHATS_NEW_SUPPRESS_KEY = "terranova:whats-new-suppress";

function getWhatsNewSuppressed(): boolean {
  try { return localStorage.getItem(WHATS_NEW_SUPPRESS_KEY) === "true"; } catch { return false; }
}
function setWhatsNewSuppressed(value: boolean) {
  try {
    if (value) localStorage.setItem(WHATS_NEW_SUPPRESS_KEY, "true");
    else localStorage.removeItem(WHATS_NEW_SUPPRESS_KEY);
  } catch { /* ignore */ }
}

const FLOW_DIRECTIONS: { id: FlowDirection; label: string; description: string }[] = [
  { id: "LR", label: "Left to Right", description: "Inputs on left, output on right (TerraNova default)" },
  { id: "RL", label: "Right to Left", description: "Output on left, inputs on right (Hytale native)" },
];

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const flowDirection = useSettingsStore((s) => s.flowDirection);
  const setFlowDirection = useSettingsStore((s) => s.setFlowDirection);
  const autoLayoutOnOpen = useSettingsStore((s) => s.autoLayoutOnOpen);
  const setAutoLayoutOnOpen = useSettingsStore((s) => s.setAutoLayoutOnOpen);
  const exportPath = useSettingsStore((s) => s.exportPath);
  const setExportPath = useSettingsStore((s) => s.setExportPath);
  const autoCheckUpdates = useSettingsStore((s) => s.autoCheckUpdates);
  const setAutoCheckUpdates = useSettingsStore((s) => s.setAutoCheckUpdates);

  const updateStatus = useUpdateStore((s) => s.status);
  const updateVersion = useUpdateStore((s) => s.version);
  const updateProgress = useUpdateStore((s) => s.progress);

  const [appVersion, setAppVersion] = useState("");
  const [whatsNewSuppressed, setWhatsNewSuppressedState] = useState(getWhatsNewSuppressed);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  function handleToggleWhatsNew(value: boolean) {
    setWhatsNewSuppressedState(value);
    setWhatsNewSuppressed(value);
  }

  async function handleBrowseExportPath() {
    const selected = await openDialog({ directory: true, defaultPath: exportPath ?? undefined });
    if (selected) setExportPath(selected);
  }

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[440px] p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">Settings</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted">Graph Flow Direction</label>
          <div className="flex flex-col gap-2">
            {FLOW_DIRECTIONS.map(({ id, label, description }) => (
              <button
                key={id}
                onClick={() => setFlowDirection(id)}
                className={`text-left px-3 py-2 rounded border text-sm ${
                  flowDirection === id
                    ? "border-tn-accent bg-tn-accent/10"
                    : "border-tn-border bg-tn-bg hover:bg-tn-surface"
                }`}
              >
                <span className="font-medium">{label}</span>
                {id === "LR" && (
                  <span className="ml-2 text-[10px] text-tn-accent font-medium">Default</span>
                )}
                <p className="text-xs text-tn-text-muted mt-0.5">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted">Auto-Layout on File Open</label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setAutoLayoutOnOpen(true)}
              className={`text-left px-3 py-2 rounded border text-sm ${
                autoLayoutOnOpen
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Enabled</span>
              <p className="text-xs text-tn-text-muted mt-0.5">Automatically arrange nodes when opening a file</p>
            </button>
            <button
              onClick={() => setAutoLayoutOnOpen(false)}
              className={`text-left px-3 py-2 rounded border text-sm ${
                !autoLayoutOnOpen
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Disabled</span>
              <span className="ml-2 text-[10px] text-tn-accent font-medium">Default</span>
              <p className="text-xs text-tn-text-muted mt-0.5">Preserve original node positions from the JSON file</p>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted">Default Export Path</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={exportPath ?? "Not set"}
              className="flex-1 px-3 py-1.5 rounded border border-tn-border bg-tn-bg text-sm text-tn-text-muted truncate"
            />
            <button
              onClick={handleBrowseExportPath}
              className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface whitespace-nowrap"
            >
              Browse...
            </button>
            <button
              onClick={() => setExportPath(null)}
              className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface text-tn-text-muted"
              disabled={!exportPath}
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-tn-text-muted">Default target directory for File &gt; Export operations</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted">Startup</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleToggleWhatsNew(!whatsNewSuppressed)}
              className={`flex-1 text-left px-3 py-2 rounded border text-sm ${
                !whatsNewSuppressed
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Show What's New on startup</span>
              <span className="ml-2 text-[10px] font-medium text-tn-text-muted">
                {whatsNewSuppressed ? "Off" : "On"}
              </span>
              <p className="text-xs text-tn-text-muted mt-0.5">Show the changelog dialog when a new version is first launched</p>
            </button>
            <div className="flex flex-col gap-2 self-start">
              <button
                onClick={() => setShowWhatsNew(true)}
                className="px-3 py-2 rounded border border-tn-border bg-tn-bg hover:bg-tn-surface text-sm whitespace-nowrap"
              >
                View What's New
              </button>
              <button
                onClick={() => setShowChangelog(true)}
                className="px-3 py-2 rounded border border-tn-border bg-tn-bg hover:bg-tn-surface text-sm whitespace-nowrap"
              >
                Changelogs
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted">Updates</label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 py-2 rounded border border-tn-border bg-tn-bg">
              <div>
                <span className="text-sm font-medium">Current version</span>
                <p className="text-xs text-tn-text-muted">v{appVersion}</p>
              </div>
              {updateStatus === "available" ? (
                <button
                  onClick={downloadAndInstall}
                  className="px-3 py-1.5 text-sm rounded border border-tn-accent text-tn-accent hover:bg-tn-accent/10"
                >
                  Download v{updateVersion}
                </button>
              ) : updateStatus === "downloading" ? (
                <span className="text-sm text-amber-400">Downloading {updateProgress}%</span>
              ) : updateStatus === "restarting" ? (
                <span className="text-sm text-amber-400">Restarting...</span>
              ) : updateStatus === "ready" ? (
                <button
                  onClick={restartToUpdate}
                  className="px-3 py-1.5 text-sm rounded border border-emerald-400 text-emerald-400 hover:bg-emerald-400/10"
                >
                  Restart to update
                </button>
              ) : updateStatus === "checking" ? (
                <span className="text-sm text-tn-text-muted">Checking...</span>
              ) : (
                <button
                  onClick={() => checkForUpdates(true)}
                  className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface"
                >
                  Check for updates
                </button>
              )}
            </div>
            <button
              onClick={() => setAutoCheckUpdates(!autoCheckUpdates)}
              className={`text-left px-3 py-2 rounded border text-sm ${
                autoCheckUpdates
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Auto-check for updates</span>
              <span className="ml-2 text-[10px] font-medium text-tn-text-muted">
                {autoCheckUpdates ? "On" : "Off"}
              </span>
              <p className="text-xs text-tn-text-muted mt-0.5">Automatically check for new versions on launch</p>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-tn-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    <WhatsNewDialog open={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
    <ChangelogDialog open={showChangelog} onClose={() => setShowChangelog(false)} />
    </>
  );
}
