import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore, type ViewMode } from "@/stores/previewStore";
import { useBridgeStore } from "@/stores/bridgeStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { matchesKeybinding } from "@/config/keybindings";
import { exportAssetPack, exportCurrentJson } from "@/utils/exportAssetPack";
import { handleAutoLayout, handleAutoLayoutSelected, handleTidyUp } from "@/utils/layoutActions";

interface GlobalShortcutCallbacks {
  onCloseProject: () => void;
  onNewProject: () => void;
  onSettings: () => void;
  onExportSvg: () => void;
}

/**
 * Register global keyboard shortcuts for the application.
 * This restores functionality that was lost when the Toolbar was split into TitleBar + Toolbar.
 */
export function useGlobalKeyboardShortcuts({
  onCloseProject,
  onNewProject,
  onSettings,
  onExportSvg,
}: GlobalShortcutCallbacks) {
  const { openAssetPack, saveFile, saveFileAs } = useTauriIO();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const reactFlow = useReactFlow();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Alt+1-9 — jump to bookmark (parameterized, stays hardcoded)
      if (e.altKey && !mod && !e.shiftKey && /^[1-9]$/.test(e.key) && !inInput) {
        const slot = parseInt(e.key);
        const bookmark = useUIStore.getState().bookmarks.get(slot);
        if (bookmark) {
          e.preventDefault();
          reactFlow.setViewport(
            { x: bookmark.x, y: bookmark.y, zoom: bookmark.zoom },
            { duration: 300 },
          );
        }
        return;
      }

      // Ctrl+Shift+1-9 — save bookmark at current viewport (parameterized, stays hardcoded)
      if (mod && e.shiftKey && /^[1-9!@#$%^&*(]$/.test(e.key) && !inInput) {
        const shiftDigitMap: Record<string, number> = {
          "!": 1, "@": 2, "#": 3, "$": 4, "%": 5, "^": 6, "&": 7, "*": 8, "(": 9,
          "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
        };
        const slot = shiftDigitMap[e.key];
        if (slot) {
          e.preventDefault();
          const viewport = reactFlow.getViewport();
          useUIStore.getState().setBookmark(slot, {
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          });
          return;
        }
      }

      if (inInput) return;

      // Toggle grid
      if (matchesKeybinding("toggleGrid", e)) {
        e.preventDefault();
        useUIStore.getState().toggleGrid();
        return;
      }

      // Toggle snap
      if (matchesKeybinding("toggleSnap", e)) {
        e.preventDefault();
        useUIStore.getState().toggleSnap();
        return;
      }

      // Cycle view mode
      if (matchesKeybinding("cycleViewMode", e)) {
        const editingContext = useEditorStore.getState().editingContext;
        if (!editingContext || editingContext === "Settings") return;
        e.preventDefault();
        const { viewMode, setViewMode } = usePreviewStore.getState();
        const cycle: ViewMode[] = ["graph", "preview", "split"];
        setViewMode(cycle[(cycle.indexOf(viewMode) + 1) % cycle.length]);
        return;
      }

      // Toggle help mode
      if (matchesKeybinding("toggleHelpMode", e)) {
        e.preventDefault();
        useUIStore.getState().toggleHelpMode();
        return;
      }

      // Auto layout all
      if (matchesKeybinding("autoLayoutAll", e)) {
        e.preventDefault();
        handleAutoLayout(reactFlow);
        return;
      }

      // Auto layout selected
      if (matchesKeybinding("autoLayoutSelected", e)) {
        e.preventDefault();
        handleAutoLayoutSelected();
        return;
      }

      // Tidy up
      if (matchesKeybinding("tidyUp", e)) {
        e.preventDefault();
        handleTidyUp();
        return;
      }

      // Toggle inline previews
      if (matchesKeybinding("togglePreviews", e)) {
        const editingContext = useEditorStore.getState().editingContext;
        if (!editingContext || editingContext === "Settings") return;
        e.preventDefault();
        const store = usePreviewStore.getState();
        store.setShowInlinePreviews(!store.showInlinePreviews);
        return;
      }

      // Toggle split direction (V)
      if (matchesKeybinding("toggleSplitDirection", e)) {
        e.preventDefault();
        const store = usePreviewStore.getState();
        if (store.viewMode === "split") {
          store.setSplitDirection(store.splitDirection === "horizontal" ? "vertical" : "horizontal");
        }
        return;
      }

      // New project
      if (matchesKeybinding("newProject", e)) {
        e.preventDefault();
        onNewProject();
        return;
      }

      // Close project
      if (matchesKeybinding("closeProject", e)) {
        e.preventDefault();
        onCloseProject();
        return;
      }

      // Open file
      if (matchesKeybinding("openFile", e)) {
        e.preventDefault();
        openAssetPack();
        return;
      }

      // Export SVG
      if (matchesKeybinding("exportSvg", e)) {
        e.preventDefault();
        onExportSvg();
        return;
      }

      // Export asset pack (check before exportJson to avoid Ctrl+E matching Ctrl+Shift+E)
      if (matchesKeybinding("exportPack", e)) {
        e.preventDefault();
        exportAssetPack();
        return;
      }

      // Export current JSON
      if (matchesKeybinding("exportJson", e)) {
        e.preventDefault();
        exportCurrentJson();
        return;
      }

      // Toggle instant save
      if (matchesKeybinding("toggleInstantSave", e)) {
        e.preventDefault();
        const settings = useSettingsStore.getState();
        settings.toggleInstantSave();
        const nowEnabled = useSettingsStore.getState().instantSaveEnabled;
        useToastStore.getState().addToast(
          nowEnabled ? "Instant Save enabled" : "Instant Save disabled",
          "success",
        );
        return;
      }

      // Save as
      if (matchesKeybinding("saveAs", e)) {
        e.preventDefault();
        saveFileAs();
        return;
      }

      // Save (check after saveAs to avoid Ctrl+Shift+S matching Ctrl+S)
      if (matchesKeybinding("save", e)) {
        e.preventDefault();
        saveFile();
        return;
      }

      // Redo
      if (matchesKeybinding("redo", e)) {
        e.preventDefault();
        redo();
        return;
      }

      // Undo (check after redo to avoid Ctrl+Shift+Z matching Ctrl+Z)
      if (matchesKeybinding("undo", e)) {
        e.preventDefault();
        undo();
        return;
      }

      // Bridge
      if (matchesKeybinding("bridge", e)) {
        e.preventDefault();
        useBridgeStore.getState().setDialogOpen(true);
        return;
      }

      // Settings
      if (matchesKeybinding("settings", e)) {
        e.preventDefault();
        onSettings();
        return;
      }

      // Toggle left panel
      if (matchesKeybinding("toggleLeftPanel", e)) {
        e.preventDefault();
        useUIStore.getState().toggleLeftPanel();
        return;
      }

      // Toggle right panel
      if (matchesKeybinding("toggleRightPanel", e)) {
        e.preventDefault();
        useUIStore.getState().toggleRightPanel();
        return;
      }

      // Maximize editor
      if (matchesKeybinding("maximizeEditor", e)) {
        e.preventDefault();
        const ui = useUIStore.getState();
        const bothHidden = !ui.leftPanelVisible && !ui.rightPanelVisible;
        ui.setLeftPanelVisible(bothHidden);
        ui.setRightPanelVisible(bothHidden);
        return;
      }

      // Reset zoom
      if (matchesKeybinding("resetZoom", e)) {
        e.preventDefault();
        reactFlow.zoomTo(1, { duration: 300 });
        return;
      }

      // Fit view
      if (matchesKeybinding("fitView", e)) {
        e.preventDefault();
        reactFlow.fitView({ padding: 0.1, duration: 300 });
        return;
      }

      // Zoom to selection
      if (matchesKeybinding("zoomToSelection", e)) {
        e.preventDefault();
        const nodes = useEditorStore.getState().nodes.filter((n) => n.selected);
        if (nodes.length === 0) return;
        reactFlow.fitView({
          nodes: nodes.map((n) => ({ id: n.id })),
          padding: 0.2,
          duration: 300,
        });
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openAssetPack, saveFile, saveFileAs, undo, redo, reactFlow, onCloseProject, onNewProject, onSettings, onExportSvg]);
}
