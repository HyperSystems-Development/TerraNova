import { useState, useRef, useEffect, useCallback } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { ReactFlowProvider } from "@xyflow/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { useProjectStore } from "@/stores/projectStore";
import { SimpleTitleBar } from "@/components/layout/TitleBar";
import { ProjectTitleBar } from "@/components/layout/ProjectTitleBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { PanelLayout } from "@/components/layout/PanelLayout";
import { DragGhost } from "@/components/editor/DragGhost";
import { HomeScreen } from "@/components/home/HomeScreen";
import { Toast } from "@/components/ui/Toast";
import { LoadingDialog } from "@/components/ui/LoadingDialog";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import SyncProgressModal from "@/components/ui/SyncProgressModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { KeyboardShortcutsDialog } from "@/components/dialogs/KeyboardShortcutsDialog";
import { ConfigurationDialog } from "@/components/dialogs/ConfigurationDialog";
import { ExportSvgDialog } from "@/components/dialogs/ExportSvgDialog";
import { saveRef } from "@/utils/saveRef";
import { isMac } from "@/utils/platform";
import { checkForUpdates } from "@/utils/updater";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import type { SvgExportOptions } from "@/utils/exportSvg";
import { useReactFlow } from "@xyflow/react";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";

type PendingAction = "window-close" | "close-project";

export default function App() {
  // Animate and update the initial splash overlay until the app is ready.
  useEffect(() => {
    const progressEl = document.getElementById("splash-progress") as HTMLElement | null;
    const statusEl = document.getElementById("splash-status") as HTMLElement | null;

    const messages = [
      "Getting it together...",
      "Hoping that Simon notices me...",
      "Plastic is Fantastic, just dont consume on a daily basis",
      "Good luck in the Modding Contest!",
      "Loading assets...",
      "Warming up the map...",
      "Assembling blocks...",
      "Summoning terrain spirits...",
      "Polishing the sky...",
      "Feeding the pixel dragons...",
      "Tuning the grass color...",
      "Checking for missing cookies...",
    ];

    let msgIdx = 0;
    let isReady = false;
    let unlistenFn: UnlistenFn | null = null;

    const setStatus = (text: string) => {
      if (statusEl) statusEl.textContent = text;
    };

    // Initialize progress from DOM or default.
    let progress = 14;
    if (progressEl) {
      const w = parseFloat(progressEl.style.width || "");
      if (!Number.isNaN(w)) progress = w;
    }

    // Progress tick: advance slowly toward 92% until ready, then finish.
    const tickInterval = 140;
    const tick = () => {
      if (!progressEl) return;
      const targetMax = isReady ? 100 : 92;
      const remaining = Math.max(0, targetMax - progress);
      // smaller steps as we approach the target
      const step = Math.max(0.2, Math.random() * (0.6 + remaining / 150));
      progress = Math.min(progress + step, targetMax);
      progressEl.style.width = `${Math.round(progress * 10) / 10}%`;
    };

    const tickId = window.setInterval(tick, tickInterval);

    // Rotate playful status messages.
    setStatus(messages[0]);
    const msgId = window.setInterval(() => {
      setStatus(messages[msgIdx % messages.length]);
      msgIdx += 1;
    }, 2400);

    const removeSplash = (fast = false) => {
      const el = document.getElementById("initial-splash");
      if (!el) return;
      try {
        if (progressEl) progressEl.style.width = "100%";
        el.classList.add("fade-out");
        window.setTimeout(() => el.remove(), fast ? 180 : 320);
      } catch {
        try { el.remove(); } catch {}
      }
    };

    // Listen for Tauri ready. In web dev mode this will throw and we fall back.
    (async () => {
      try {
        const evt = await import("@tauri-apps/api/event");
        unlistenFn = await evt.listen("tauri://ready", () => {
          isReady = true;
          setStatus("Ready — launching...");
          if (progressEl) progressEl.style.width = "100%";
          setTimeout(() => removeSplash(true), 120);
          if (unlistenFn) unlistenFn();
        });
      } catch (e) {
        // Not in a Tauri environment — finalize after a short delay so the
        // user sees the animated progress on web/dev runs.
        setTimeout(() => {
          isReady = true;
          setStatus("Ready — launching...");
          removeSplash();
        }, 800);
      }
    })();

    // Safety fallback: ensure the splash is removed eventually.
    const safety = window.setTimeout(() => {
      isReady = true;
      setStatus("Finalizing...");
      removeSplash();
    }, 5000);

    return () => {
      clearInterval(tickId);
      clearInterval(msgId);
      clearTimeout(safety);
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const projectPath = useProjectStore((s) => s.projectPath);

  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<PendingAction>("close-project");

  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showExportSvg, setShowExportSvg] = useState(false);

  // Bypass flag: when true the onCloseRequested handler lets the close through.
  const forceCloseRef = useRef(false);

  // Tracks whether the dialog is visible. Updated SYNCHRONOUSLY (not via
  // useEffect) so the onCloseRequested handler always reads a fresh value —
  // Cmd+W fires both our keydown handler and Tauri's native close event in
  // the same tick, and a useEffect would still be false at that point.
  const dialogOpenRef = useRef(false);

  /** Show the confirmation dialog (updates both state and ref synchronously). */
  const openDialog = useCallback((action: PendingAction) => {
    pendingRef.current = action;
    dialogOpenRef.current = true;
    setShowDialog(true);
  }, []);

  /** Hide the confirmation dialog. */
  const closeDialog = useCallback(() => {
    dialogOpenRef.current = false;
    setShowDialog(false);
  }, []);

  // ---- Disable native decorations on non-macOS (macOS keeps native traffic lights) ----
  useEffect(() => {
    if (!isMac) {
      getCurrentWindow().setDecorations(false);
    }
  }, []);

  // ---- Post-update verification + auto-check for updates ----
  useEffect(() => {
    const updateTarget = localStorage.getItem("tn-update-target");
    if (updateTarget) {
      localStorage.removeItem("tn-update-target");
      getVersion().then((currentVersion) => {
        if (currentVersion === updateTarget) {
          useToastStore.getState().addToast(`Updated to v${currentVersion}`, "success");
        } else {
          useToastStore.getState().addToast(
            `Update to v${updateTarget} may not have applied (running v${currentVersion})`,
            "error",
          );
        }
      });
      return; // Skip auto-update check this launch
    }

    if (!useSettingsStore.getState().autoCheckUpdates) return;
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ---- Intercept OS window close (X button / Cmd+W native) ----
  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested((event) => {
      // If we set the force-close flag, allow the window to close.
      if (forceCloseRef.current) return;

      // If the dialog is already showing (e.g. keyboard handler got there
      // first via Cmd+W), just prevent the close without touching pendingRef.
      if (dialogOpenRef.current) {
        event.preventDefault();
        return;
      }

      if (useProjectStore.getState().isDirty) {
        event.preventDefault();
        openDialog("window-close");
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openDialog]);

  // ---- Toolbar: File > Close Project / Ctrl+W ----
  const requestCloseProject = useCallback(() => {
    if (useProjectStore.getState().isDirty) {
      openDialog("close-project");
    } else {
      useProjectStore.getState().closeProject();
    }
  }, [openDialog]);

  // ---- Dialog actions ----
  function executeClose() {
    closeDialog();
    setLoading(false);

    if (pendingRef.current === "window-close") {
      forceCloseRef.current = true;
      getCurrentWindow().close();
    } else {
      useProjectStore.getState().closeProject();
    }
  }

  async function handleSaveAndClose() {
    if (!saveRef.current) {
      executeClose();
      return;
    }
    setLoading(true);
    try {
      await saveRef.current();
      if (!useProjectStore.getState().isDirty) {
        executeClose();
      }
      // If still dirty, save failed — dialog stays open
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    if (!loading) closeDialog();
  }

  // ---- Render ----
  const dialog = (
    <ConfirmDialog
      open={showDialog}
      onClose={dismiss}
      title="Unsaved Changes"
      message="You have unsaved changes. What would you like to do?"
      confirmLabel="Save & Close"
      onConfirm={handleSaveAndClose}
      secondaryLabel="Discard"
      onSecondary={executeClose}
      loading={loading}
    />
  );

  if (projectPath === null) {
    return (
      <div className="flex flex-col h-screen bg-tn-bg text-tn-text">
        <SimpleTitleBar />
        <HomeScreen />
        {dialog}
        <LoadingDialog open={loading} message="Loading, please wait..." />
        <GlobalLoader />
        <SyncProgressModal />
        <Toast />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <ProjectEditor
        requestCloseProject={requestCloseProject}
        showNewProject={showNewProject}
        setShowNewProject={setShowNewProject}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showShortcuts={showShortcuts}
        setShowShortcuts={setShowShortcuts}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        showExportSvg={showExportSvg}
        setShowExportSvg={setShowExportSvg}
        dialog={dialog}
      />
      <LoadingDialog open={loading} message="Loading, please wait..." />
      <GlobalLoader />
      <SyncProgressModal />
    </ReactFlowProvider>
  );
}

function ProjectEditor({
  requestCloseProject,
  showNewProject,
  setShowNewProject,
  showSettings,
  setShowSettings,
  showShortcuts,
  setShowShortcuts,
  showConfig,
  setShowConfig,
  showExportSvg,
  setShowExportSvg,
  dialog,
}: {
  requestCloseProject: () => void;
  showNewProject: boolean;
  setShowNewProject: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  showExportSvg: boolean;
  setShowExportSvg: (show: boolean) => void;
  dialog: React.ReactNode;
}) {
  // Wire up global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onCloseProject: requestCloseProject,
    onNewProject: () => setShowNewProject(true),
    onSettings: () => setShowSettings(true),
    onExportSvg: () => setShowExportSvg(true),
  });

  return (
    <>
      <div className="flex flex-col h-screen bg-tn-bg text-tn-text">
        <ProjectTitleBar
          onCloseProject={requestCloseProject}
          onNewProject={() => setShowNewProject(true)}
          onSettings={() => setShowSettings(true)}
          onShortcuts={() => setShowShortcuts(true)}
          onConfig={() => setShowConfig(true)}
          onExportSvg={() => setShowExportSvg(true)}
        />
        <ErrorBoundary>
          <PanelLayout />
        </ErrorBoundary>
        <StatusBar />
      </div>
      <DragGhost />
      <Toast />
      {dialog}
      <NewProjectDialog open={showNewProject} onClose={() => setShowNewProject(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ConfigurationDialog open={showConfig} onClose={() => setShowConfig(false)} />
      <ExportSvgDialogWrapper open={showExportSvg} onClose={() => setShowExportSvg(false)} />
    </>
  );
}

function ExportSvgDialogWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reactFlow = useReactFlow();

  async function handleExportSvg(options: SvgExportOptions) {
    try {
      const { generateSvg, writeSvgToFile } = await import("@/utils/exportSvg");
      const svgString = generateSvg(reactFlow, options);
      await writeSvgToFile(svgString);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Export SVG failed:", err);
      useToastStore.getState().addToast("Export SVG failed", "error");
    }
  }

  return <ExportSvgDialog open={open} onClose={onClose} onExport={handleExportSvg} />;
}
