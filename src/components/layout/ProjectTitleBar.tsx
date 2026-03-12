import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore, type ViewMode } from "@/stores/previewStore";
import { useBridgeStore } from "@/stores/bridgeStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { resolveKeybinding } from "@/config/keybindings";
import { exportAssetPack, exportCurrentJson } from "@/utils/exportAssetPack";
import { isMac } from "@/utils/platform";

interface MenuItemProps {
  label: string;
  onClick: () => void;
  shortcut?: string;
  disabled?: boolean;
}

function MenuItem({ label, onClick, shortcut, disabled }: MenuItemProps) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm flex justify-between gap-6 ${disabled ? "text-tn-text-muted/40 cursor-default" : "hover:bg-tn-accent/20"
        }`}
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
    >
      <span>{label}</span>
      {shortcut && <span className="text-tn-text-muted text-xs">{shortcut}</span>}
    </button>
  );
}

function MenuSeparator() {
  return <div className="border-t border-tn-border my-1" />;
}

function MenuDropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="px-3 h-8 text-sm hover:bg-tn-surface rounded"
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-tn-panel border border-tn-border rounded shadow-lg py-1 min-w-[220px] z-50">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

interface ProjectTitleBarProps {
  onCloseProject: () => void;
  onNewProject: () => void;
  onSettings: () => void;
  onShortcuts: () => void;
  onConfig: () => void;
  onExportSvg: () => void;
}

export function ProjectTitleBar({
  onCloseProject,
  onNewProject,
  onSettings,
  onShortcuts,
  onConfig,
  onExportSvg,
}: ProjectTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  const { openAssetPack, saveFile, saveFileAs, newBiome, newInstance } = useTauriIO();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const reactFlow = useReactFlow();
  const showInlinePreviews = usePreviewStore((s) => s.showInlinePreviews);
  const showGrid = useUIStore((s) => s.showGrid);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const showMinimap = useUIStore((s) => s.showMinimap);
  const leftPanelVisible = useUIStore((s) => s.leftPanelVisible);
  const rightPanelVisible = useUIStore((s) => s.rightPanelVisible);
  const helpMode = useUIStore((s) => s.helpMode);
  const useAccordionSidebar = useUIStore((s) => s.useAccordionSidebar);
  const flowDirection = useSettingsStore((s) => s.flowDirection);

  const selectedCount = useEditorStore((s) => s.nodes.filter((n) => n.selected).length);

  function handleResetZoom() {
    reactFlow.zoomTo(1, { duration: 300 });
  }

  function handleFitView() {
    reactFlow.fitView({ padding: 0.1, duration: 300 });
  }

  function handleZoomToSelection() {
    const nodes = useEditorStore.getState().nodes.filter((n) => n.selected);
    if (nodes.length === 0) return;
    reactFlow.fitView({
      nodes: nodes.map((n) => ({ id: n.id })),
      padding: 0.2,
      duration: 300,
    });
  }

  useEffect(() => {
    if (isMac) return;

    appWindow.isMaximized().then(setIsMaximized);

    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = () => {
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <div
      {...(!isMac ? { "data-tauri-drag-region": true } : {})}
      className="h-8 bg-tn-panel border-b border-tn-border flex items-center justify-between select-none shrink-0"
    >
      <div className="flex items-center">
        <MenuDropdown label="File">
          <MenuItem label="New Project..." onClick={onNewProject} shortcut={resolveKeybinding("newProject")} />
          <MenuItem label="New Biome..." onClick={newBiome} />
          <MenuItem label="New Instance..." onClick={newInstance} />
          <MenuItem label="Close Project" onClick={onCloseProject} shortcut={resolveKeybinding("closeProject")} />
          <MenuSeparator />
          <MenuItem label="Open Asset Pack..." onClick={openAssetPack} shortcut={resolveKeybinding("openFile")} />
          <MenuItem label="Save" onClick={saveFile} shortcut={resolveKeybinding("save")} />
          <MenuItem label="Save As..." onClick={saveFileAs} shortcut={resolveKeybinding("saveAs")} />
          <MenuSeparator />
          <MenuItem label="Export Asset Pack..." onClick={exportAssetPack} shortcut={resolveKeybinding("exportPack")} />
          <MenuItem label="Export Current JSON..." onClick={exportCurrentJson} shortcut={resolveKeybinding("exportJson")} />
          <MenuItem label="Export SVG..." onClick={onExportSvg} shortcut={resolveKeybinding("exportSvg")} />
        </MenuDropdown>

        <MenuDropdown label="Edit">
          <MenuItem label="Undo" onClick={undo} shortcut={resolveKeybinding("undo")} />
          <MenuItem label="Redo" onClick={redo} shortcut={resolveKeybinding("redo")} />
          <MenuSeparator />
          <MenuItem
            label="Cut"
            onClick={() => {
              const store = useEditorStore.getState();
              store.copyNodes();
              const ids = store.nodes.filter((n) => n.selected).map((n) => n.id);
              if (ids.length > 0) store.removeNodes(ids);
            }}
            shortcut={resolveKeybinding("cut")}
          />
          <MenuItem label="Copy" onClick={() => useEditorStore.getState().copyNodes()} shortcut={resolveKeybinding("copy")} />
          <MenuItem label="Paste" onClick={() => useEditorStore.getState().pasteNodes()} shortcut={resolveKeybinding("paste")} />
          <MenuItem label="Duplicate" onClick={() => useEditorStore.getState().duplicateNodes()} shortcut={resolveKeybinding("duplicate")} />
          <MenuSeparator />
          <MenuItem
            label="Align Left"
            onClick={() => useEditorStore.getState().alignNodes("left")}
            disabled={selectedCount < 2}
          />
          <MenuItem
            label="Align Right"
            onClick={() => useEditorStore.getState().alignNodes("right")}
            disabled={selectedCount < 2}
          />
          <MenuItem
            label="Align Top"
            onClick={() => useEditorStore.getState().alignNodes("top")}
            disabled={selectedCount < 2}
          />
          <MenuItem
            label="Align Bottom"
            onClick={() => useEditorStore.getState().alignNodes("bottom")}
            disabled={selectedCount < 2}
          />
          <MenuItem
            label="Center Horizontally"
            onClick={() => useEditorStore.getState().alignNodes("centerH")}
            disabled={selectedCount < 2}
          />
          <MenuItem
            label="Center Vertically"
            onClick={() => useEditorStore.getState().alignNodes("centerV")}
            disabled={selectedCount < 2}
          />
          <MenuSeparator />
          <MenuItem
            label="Distribute Horizontal"
            onClick={() => useEditorStore.getState().distributeNodes("horizontal")}
            disabled={selectedCount < 3}
          />
          <MenuItem
            label="Distribute Vertical"
            onClick={() => useEditorStore.getState().distributeNodes("vertical")}
            disabled={selectedCount < 3}
          />
        </MenuDropdown>

        <MenuDropdown label="View">
          <MenuItem label="Reset Zoom" onClick={handleResetZoom} shortcut={resolveKeybinding("resetZoom")} />
          <MenuItem label="Fit View" onClick={handleFitView} shortcut={resolveKeybinding("fitView")} />
          <MenuItem label="Zoom to Selection" onClick={handleZoomToSelection} shortcut={resolveKeybinding("zoomToSelection")} />
          <MenuSeparator />
          <MenuItem
            label={showGrid ? "Hide Grid" : "Show Grid"}
            onClick={() => useUIStore.getState().toggleGrid()}
            shortcut={resolveKeybinding("toggleGrid")}
          />
          <MenuItem
            label={snapToGrid ? "Disable Snap" : "Enable Snap"}
            onClick={() => useUIStore.getState().toggleSnap()}
            shortcut={resolveKeybinding("toggleSnap")}
          />
          <MenuItem
            label={showMinimap ? "Hide Minimap" : "Show Minimap"}
            onClick={() => useUIStore.getState().toggleMinimap()}
          />
          <MenuSeparator />
          <MenuItem
            label={leftPanelVisible ? "Hide Left Panel" : "Show Left Panel"}
            onClick={() => useUIStore.getState().toggleLeftPanel()}
            shortcut={resolveKeybinding("toggleLeftPanel")}
          />
          <MenuItem
            label={rightPanelVisible ? "Hide Right Panel" : "Show Right Panel"}
            onClick={() => useUIStore.getState().toggleRightPanel()}
            shortcut={resolveKeybinding("toggleRightPanel")}
          />
          <MenuItem
            label="Maximize Editor"
            onClick={() => {
              const ui = useUIStore.getState();
              const bothHidden = !ui.leftPanelVisible && !ui.rightPanelVisible;
              ui.setLeftPanelVisible(bothHidden);
              ui.setRightPanelVisible(bothHidden);
            }}
            shortcut={resolveKeybinding("maximizeEditor")}
          />
          <MenuSeparator />
          <MenuItem
            label="Cycle View Mode"
            onClick={() => {
              const { viewMode, setViewMode } = usePreviewStore.getState();
              const cycle: ViewMode[] = ["graph", "preview", "split"];
              setViewMode(cycle[(cycle.indexOf(viewMode) + 1) % cycle.length]);
            }}
            shortcut={resolveKeybinding("cycleViewMode")}
          />
          <MenuItem
            label={showInlinePreviews ? "Hide Inline Previews" : "Show Inline Previews"}
            onClick={() => usePreviewStore.getState().setShowInlinePreviews(!showInlinePreviews)}
            shortcut={resolveKeybinding("togglePreviews")}
          />
          <MenuSeparator />
          <MenuItem
            label="Bridge..."
            onClick={() => useBridgeStore.getState().setDialogOpen(true)}
            shortcut={resolveKeybinding("bridge")}
          />
        </MenuDropdown>

        <MenuDropdown label="Settings">
          <MenuItem label="Preferences..." onClick={onSettings} shortcut={resolveKeybinding("settings")} />
          <MenuItem label="Keyboard Shortcuts..." onClick={onShortcuts} />
          <MenuItem label="Configuration..." onClick={onConfig} />
          <MenuSeparator />
          <MenuItem
            label={flowDirection === "LR" ? "Flow Direction: LTR" : "Flow Direction: RTL"}
            onClick={() => useSettingsStore.getState().setFlowDirection(flowDirection === "LR" ? "RL" : "LR")}
          />
          <MenuSeparator />
          <MenuItem
            label={helpMode ? "Disable Help Mode" : "Enable Help Mode"}
            onClick={() => useUIStore.getState().toggleHelpMode()}
            shortcut={resolveKeybinding("toggleHelpMode")}
          />
          <MenuSeparator />
          <MenuItem
            label={useAccordionSidebar ? "Sidebar: Accordion" : "Sidebar: Tabs"}
            onClick={() => useUIStore.getState().toggleAccordionSidebar()}
          />
        </MenuDropdown>
      </div>

      {!isMac && (
        <div className="flex items-center gap-0">
          <button
            onClick={handleMinimize}
            className="w-12 h-8 flex items-center justify-center hover:bg-tn-surface transition-colors text-tn-text-muted hover:text-tn-text"
            title="Minimize"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            onClick={handleMaximize}
            className="w-12 h-8 flex items-center justify-center hover:bg-tn-surface transition-colors text-tn-text-muted hover:text-tn-text"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              </svg>
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-12 h-8 flex items-center justify-center hover:bg-red-600 transition-colors text-tn-text-muted hover:text-white"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
