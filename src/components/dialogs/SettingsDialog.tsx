import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import {
  DEFAULT_HYTALE_COMMON_ASSETS_PATH,
  DEFAULT_HYTALE_PRERELEASE_ASSETS_PATH,
  DEFAULT_HYTALE_RELEASE_ASSETS_PATH,
  useSettingsStore,
} from "@/stores/settingsStore";
import { useUpdateStore } from "@/stores/updateStore";
import { checkForUpdates, downloadAndInstall, restartToUpdate } from "@/utils/updater";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { FlowDirection } from "@/constants";
import { checkHytaleAssetStaleness, getHytaleAssetCacheRoot, showInFolder, syncHytaleAssets, type AssetStalenessInfo } from "@/utils/ipc";
import { useToastStore } from "@/stores/toastStore";
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

function formatSyncedAt(syncedAt: string): string {
  // syncedAt is YYYY-MM-DDTHH:MM:SSZ
  const secs = Date.parse(syncedAt) / 1000;
  if (Number.isNaN(secs)) return syncedAt;
  const nowSecs = Date.now() / 1000;
  const diff = Math.floor(nowSecs - secs);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "1 day ago" : `${days} days ago`;
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
  const hytaleAssetSyncEnabled = useSettingsStore((s) => s.hytaleAssetSyncEnabled);
  const setHytaleAssetSyncEnabled = useSettingsStore((s) => s.setHytaleAssetSyncEnabled);
  const hytaleAssetSourceChannel = useSettingsStore((s) => s.hytaleAssetSourceChannel);
  const setHytaleAssetSourceChannel = useSettingsStore((s) => s.setHytaleAssetSourceChannel);
  const hytalePreReleaseAssetsPath = useSettingsStore((s) => s.hytalePreReleaseAssetsPath);
  const setHytalePreReleaseAssetsPath = useSettingsStore((s) => s.setHytalePreReleaseAssetsPath);
  const hytaleReleaseAssetsPath = useSettingsStore((s) => s.hytaleReleaseAssetsPath);
  const setHytaleReleaseAssetsPath = useSettingsStore((s) => s.setHytaleReleaseAssetsPath);
  const hytaleCommonAssetsEnabled = useSettingsStore((s) => s.hytaleCommonAssetsEnabled);
  const setHytaleCommonAssetsEnabled = useSettingsStore((s) => s.setHytaleCommonAssetsEnabled);
  const hytaleCommonAssetsPath = useSettingsStore((s) => s.hytaleCommonAssetsPath);
  const setHytaleCommonAssetsPath = useSettingsStore((s) => s.setHytaleCommonAssetsPath);
  const addToast = useToastStore((s) => s.addToast);

  const updateStatus = useUpdateStore((s) => s.status);
  const updateVersion = useUpdateStore((s) => s.version);
  const updateProgress = useUpdateStore((s) => s.progress);

  const [appVersion, setAppVersion] = useState("");
  const [whatsNewSuppressed, setWhatsNewSuppressedState] = useState(getWhatsNewSuppressed);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [hytaleAssetCacheRoot, setHytaleAssetCacheRoot] = useState("");
  const [syncingHytaleAssets, setSyncingHytaleAssets] = useState(false);
  const [stalenessInfo, setStalenessInfo] = useState<AssetStalenessInfo | null>(null);
  const [checkingStaleness, setCheckingStaleness] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (!open) return;
    void getHytaleAssetCacheRoot()
      .then(setHytaleAssetCacheRoot)
      .catch(() => setHytaleAssetCacheRoot(""));
  }, [open]);

  function handleToggleWhatsNew(value: boolean) {
    setWhatsNewSuppressedState(value);
    setWhatsNewSuppressed(value);
  }

  async function handleBrowseExportPath() {
    const selected = await openDialog({ directory: true, defaultPath: exportPath ?? undefined });
    if (selected) setExportPath(selected);
  }

  const activeHytaleSourcePath = hytaleAssetSourceChannel === "pre-release"
    ? hytalePreReleaseAssetsPath
    : hytaleReleaseAssetsPath;

  useEffect(() => {
    if (!open || !activeHytaleSourcePath.trim()) return;
    setCheckingStaleness(true);
    void checkHytaleAssetStaleness(activeHytaleSourcePath)
      .then(setStalenessInfo)
      .catch(() => setStalenessInfo(null))
      .finally(() => setCheckingStaleness(false));
  }, [open, activeHytaleSourcePath]);

  function setActiveHytaleSourcePath(path: string) {
    if (hytaleAssetSourceChannel === "pre-release") {
      setHytalePreReleaseAssetsPath(path);
      return;
    }
    setHytaleReleaseAssetsPath(path);
  }

  async function handleBrowseHytaleAssetSource() {
    const selected = await openDialog(
      hytaleAssetSourceChannel === "pre-release"
        ? {
            directory: false,
            defaultPath: activeHytaleSourcePath,
            filters: [{ name: "Zip", extensions: ["zip"] }],
          }
        : {
            directory: true,
            defaultPath: activeHytaleSourcePath,
          },
    );

    if (typeof selected === "string") {
      setActiveHytaleSourcePath(selected);
    }
  }

  async function handleBrowseCommonAssetsSource() {
    const selected = await openDialog({
      directory: true,
      defaultPath: hytaleCommonAssetsPath,
    });

    if (typeof selected === "string") {
      setHytaleCommonAssetsPath(selected);
    }
  }

  async function handleSyncHytaleAssets() {
    if (!hytaleAssetSyncEnabled) {
      addToast("Enable managed Hytale assets in Settings before syncing.", "warning");
      return;
    }

    if (!activeHytaleSourcePath.trim()) {
      addToast("Choose a Hytale asset source path first.", "warning");
      return;
    }

    if (hytaleCommonAssetsEnabled && !hytaleCommonAssetsPath.trim()) {
      addToast("Choose a Common asset overlay path or turn it off.", "warning");
      return;
    }

    setSyncingHytaleAssets(true);
    try {
      const result = await syncHytaleAssets(
        activeHytaleSourcePath,
        hytaleCommonAssetsEnabled ? hytaleCommonAssetsPath : null,
      );
      setHytaleAssetCacheRoot(result.cacheRoot);
      // Refresh staleness after a successful sync so the indicator clears immediately.
      void checkHytaleAssetStaleness(activeHytaleSourcePath)
        .then(setStalenessInfo)
        .catch(() => setStalenessInfo(null));
      const overlaySummary = result.commonOverlayFilesWritten > 0
        ? ` plus ${result.commonOverlayFilesWritten} Common overlay file${result.commonOverlayFilesWritten === 1 ? "" : "s"}`
        : "";
      addToast(
        `Synced ${result.filesWritten} Hytale asset file${result.filesWritten === 1 ? "" : "s"}${overlaySummary} into the TerraNova cache.`,
        "success",
      );
    } catch (error) {
      addToast(`Failed to sync Hytale assets: ${error}`, "error");
    } finally {
      setSyncingHytaleAssets(false);
    }
  }

  async function handleOpenHytaleAssetCache() {
    if (!hytaleAssetCacheRoot) return;
    try {
      await showInFolder(hytaleAssetCacheRoot);
    } catch (error) {
      addToast(`Could not open the Hytale asset cache: ${error}`, "error");
    }
  }

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[680px] max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4"
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

        <div className="flex flex-col gap-2">
          <label className="text-xs text-tn-text-muted">Hytale Asset Cache</label>
          <button
            onClick={() => setHytaleAssetSyncEnabled(!hytaleAssetSyncEnabled)}
            className={`text-left px-3 py-2 rounded border text-sm ${
              hytaleAssetSyncEnabled
                ? "border-tn-accent bg-tn-accent/10"
                : "border-tn-border bg-tn-bg hover:bg-tn-surface"
            }`}
          >
            <span className="font-medium">Managed Hytale asset cache</span>
            <span className="ml-2 text-[10px] font-medium text-tn-text-muted">
              {hytaleAssetSyncEnabled ? "On" : "Off"}
            </span>
            <p className="mt-0.5 text-xs text-tn-text-muted">
              Sync release or pre-release Hytale assets into TerraNova&apos;s local `hytale-assets` cache instead of shipping them with the app.
            </p>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHytaleAssetSourceChannel("pre-release")}
              className={`text-left px-3 py-2 rounded border text-sm ${
                hytaleAssetSourceChannel === "pre-release"
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Pre-release</span>
              <p className="mt-0.5 text-xs text-tn-text-muted">Read directly from `Assets.zip`.</p>
            </button>
            <button
              onClick={() => setHytaleAssetSourceChannel("release")}
              className={`text-left px-3 py-2 rounded border text-sm ${
                hytaleAssetSourceChannel === "release"
                  ? "border-tn-accent bg-tn-accent/10"
                  : "border-tn-border bg-tn-bg hover:bg-tn-surface"
              }`}
            >
              <span className="font-medium">Release</span>
              <p className="mt-0.5 text-xs text-tn-text-muted">Use `Assets.zip` inside the release `latest` folder when present.</p>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">
              {hytaleAssetSourceChannel === "pre-release" ? "Pre-release asset source" : "Release asset source"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={activeHytaleSourcePath}
                onChange={(event) => setActiveHytaleSourcePath(event.target.value)}
                className="flex-1 rounded border border-tn-border bg-tn-bg px-3 py-1.5 text-sm text-tn-text"
              />
              <button
                onClick={handleBrowseHytaleAssetSource}
                className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface whitespace-nowrap"
              >
                Browse...
              </button>
              <button
                onClick={() => setActiveHytaleSourcePath(
                  hytaleAssetSourceChannel === "pre-release"
                    ? DEFAULT_HYTALE_PRERELEASE_ASSETS_PATH
                    : DEFAULT_HYTALE_RELEASE_ASSETS_PATH,
                )}
                className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface text-tn-text-muted whitespace-nowrap"
              >
                Default
              </button>
            </div>
            <p className="text-xs text-tn-text-muted">
              Pre-release can point straight at `Assets.zip`. Release can point at the `latest` folder or a zip file inside it.
            </p>
          </div>

          <button
            onClick={() => setHytaleCommonAssetsEnabled(!hytaleCommonAssetsEnabled)}
            className={`text-left px-3 py-2 rounded border text-sm ${
              hytaleCommonAssetsEnabled
                ? "border-tn-accent bg-tn-accent/10"
                : "border-tn-border bg-tn-bg hover:bg-tn-surface"
            }`}
          >
            <span className="font-medium">Include external Common assets</span>
            <span className="ml-2 text-[10px] font-medium text-tn-text-muted">
              {hytaleCommonAssetsEnabled ? "On" : "Off"}
            </span>
            <p className="mt-0.5 text-xs text-tn-text-muted">
              Layer an extra `Common` source over the synced cache for block textures, material PNGs, sky art, and other TerraNova references.
            </p>
          </button>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">External Common asset source</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hytaleCommonAssetsPath}
                onChange={(event) => setHytaleCommonAssetsPath(event.target.value)}
                disabled={!hytaleCommonAssetsEnabled}
                className="flex-1 rounded border border-tn-border bg-tn-bg px-3 py-1.5 text-sm text-tn-text disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                onClick={handleBrowseCommonAssetsSource}
                disabled={!hytaleCommonAssetsEnabled}
                className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                Browse...
              </button>
              <button
                onClick={() => setHytaleCommonAssetsPath(DEFAULT_HYTALE_COMMON_ASSETS_PATH)}
                disabled={!hytaleCommonAssetsEnabled}
                className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface text-tn-text-muted whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              >
                Default
              </button>
            </div>
            <p className="text-xs text-tn-text-muted">
              Point this at `Common` directly, or a parent folder that contains `Common`. Your block/material PNGs in `Blocks`, `BlockTextures`, and related folders will be merged into the cache after the selected release channel sync.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">TerraNova cache folder</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={hytaleAssetCacheRoot || "Loading cache path..."}
                className="flex-1 rounded border border-tn-border bg-tn-bg px-3 py-1.5 text-sm text-tn-text-muted"
              />
              <button
                onClick={() => { void handleOpenHytaleAssetCache(); }}
                className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface whitespace-nowrap"
                disabled={!hytaleAssetCacheRoot}
              >
                Open Cache
              </button>
              <button
                onClick={() => { void handleSyncHytaleAssets(); }}
                className="px-3 py-1.5 text-sm rounded border border-tn-accent text-tn-accent hover:bg-tn-accent/10 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                disabled={syncingHytaleAssets}
              >
                {syncingHytaleAssets ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {activeHytaleSourcePath.trim() && (
            <div className={`flex items-center gap-2 rounded border px-3 py-2 text-[11px] ${
              checkingStaleness
                ? "border-tn-border/50 text-tn-text-muted"
                : stalenessInfo?.isStale
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : stalenessInfo?.syncedAt
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-tn-border/50 text-tn-text-muted"
            }`}>
              <span className="shrink-0 text-base leading-none">
                {checkingStaleness ? "⏳" : stalenessInfo?.isStale ? "⚠️" : stalenessInfo?.syncedAt ? "✓" : "–"}
              </span>
              <span>
                {checkingStaleness
                  ? "Checking source for updates…"
                  : stalenessInfo?.isStale
                    ? <>Source has files newer than your cache — <button onClick={() => { void handleSyncHytaleAssets(); }} className="underline hover:no-underline">Sync Now</button></>
                    : stalenessInfo?.syncedAt
                      ? `Cache is up to date · Last synced ${formatSyncedAt(stalenessInfo.syncedAt)}`
                      : "Not synced yet — press Sync Now to build the cache"}
              </span>
            </div>
          )}

          <div className="rounded border border-tn-border/60 bg-tn-bg/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
              Manual Setup
            </p>
            <div className="mt-2 flex flex-col gap-2 text-[11px] leading-relaxed text-tn-text-muted">
              <p>
                If you want to load Hytale assets manually, just point TerraNova at the asset source already on your computer and press <span className="font-medium text-tn-text">Sync Now</span>.
              </p>
              <p>
                <span className="font-medium text-tn-text">Pre-release:</span> target the `Assets.zip` file directly.
              </p>
              <p className="rounded border border-tn-border/40 bg-tn-panel/40 px-2 py-1 font-mono text-[10px] text-tn-text">
                C:\Users\wolft\AppData\Roaming\Hytale\install\pre-release\package\game\latest\Assets.zip
              </p>
              <p>
                <span className="font-medium text-tn-text">Release:</span> target the `latest` folder or its `Assets.zip`.
              </p>
              <p className="rounded border border-tn-border/40 bg-tn-panel/40 px-2 py-1 font-mono text-[10px] text-tn-text">
                C:\Users\wolft\AppData\Roaming\Hytale\install\release\package\game\latest
              </p>
              <p>
                <span className="font-medium text-tn-text">Extra Common textures/materials:</span> point the external Common source at `Common` directly, or a parent folder containing `Common`, if you want block PNGs, sky textures, and related material art merged into the cache.
              </p>
            </div>
          </div>
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
