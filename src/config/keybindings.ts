import { useSettingsStore } from "@/stores/settingsStore";

export interface KeybindingDef {
  id: string;
  defaultKey: string;
  label: string;
  category: "Canvas" | "Edit" | "File" | "View";
}

/**
 * Central registry of all keyboard shortcuts.
 * Bookmark shortcuts (Alt+1-9, Ctrl+Shift+1-9) are excluded — they're parameterized.
 */
export const KEYBINDINGS: KeybindingDef[] = [
  // ── Canvas ──────────────────────────────────────────────────
  { id: "quickAdd",           defaultKey: "Tab",            label: "Quick Add",                  category: "Canvas" },
  { id: "quickAddAlt",        defaultKey: "Shift+A",        label: "Quick Add (Alt)",            category: "Canvas" },
  { id: "search",             defaultKey: "Ctrl+F",         label: "Search Nodes",               category: "Canvas" },
  { id: "selectAll",          defaultKey: "Ctrl+A",         label: "Select All",                 category: "Canvas" },
  { id: "toggleRoot",         defaultKey: "Ctrl+T",         label: "Toggle Root",                category: "Canvas" },
  { id: "selectUpstream",     defaultKey: "Ctrl+PageUp",    label: "Select Upstream",            category: "Canvas" },
  { id: "selectDownstream",   defaultKey: "Ctrl+PageDown",  label: "Select Downstream",          category: "Canvas" },

  // ── Edit ────────────────────────────────────────────────────
  { id: "undo",               defaultKey: "Ctrl+Z",         label: "Undo",                       category: "Edit" },
  { id: "redo",               defaultKey: "Ctrl+Shift+Z",   label: "Redo",                       category: "Edit" },
  { id: "redoAlt",            defaultKey: "Ctrl+Y",         label: "Redo (Alt)",                  category: "Edit" },
  { id: "cut",                defaultKey: "Ctrl+X",         label: "Cut",                        category: "Edit" },
  { id: "copy",               defaultKey: "Ctrl+C",         label: "Copy",                       category: "Edit" },
  { id: "paste",              defaultKey: "Ctrl+V",         label: "Paste",                      category: "Edit" },
  { id: "duplicate",          defaultKey: "Ctrl+D",         label: "Duplicate",                  category: "Edit" },
  { id: "group",              defaultKey: "Ctrl+G",         label: "Group",                      category: "Edit" },
  { id: "autoLayoutAll",      defaultKey: "L",              label: "Auto Layout All",            category: "Edit" },
  { id: "autoLayoutSelected", defaultKey: "Shift+L",        label: "Auto Layout Selected",       category: "Edit" },
  { id: "tidyUp",             defaultKey: "Ctrl+Shift+L",   label: "Tidy Up",                    category: "Edit" },

  // ── File ────────────────────────────────────────────────────
  { id: "newProject",         defaultKey: "Ctrl+N",         label: "New Project",                category: "File" },
  { id: "openFile",           defaultKey: "Ctrl+O",         label: "Open Asset Pack",            category: "File" },
  { id: "save",               defaultKey: "Ctrl+S",         label: "Save",                       category: "File" },
  { id: "saveAs",             defaultKey: "Ctrl+Shift+S",   label: "Save As",                    category: "File" },
  { id: "closeProject",       defaultKey: "Ctrl+W",         label: "Close Project",              category: "File" },
  { id: "exportPack",         defaultKey: "Ctrl+Shift+E",   label: "Export Asset Pack",          category: "File" },
  { id: "exportJson",         defaultKey: "Ctrl+E",         label: "Export Current JSON",        category: "File" },
  { id: "exportSvg",          defaultKey: "Ctrl+Shift+G",   label: "Export SVG",                 category: "File" },
  { id: "toggleInstantSave",  defaultKey: "Ctrl+Shift+I",   label: "Toggle Instant Save",        category: "File" },

  // ── View ────────────────────────────────────────────────────
  { id: "resetZoom",          defaultKey: "Ctrl+0",         label: "Reset Zoom",                 category: "View" },
  { id: "fitView",            defaultKey: "Ctrl+1",         label: "Fit View",                   category: "View" },
  { id: "zoomToSelection",    defaultKey: "Ctrl+2",         label: "Zoom to Selection",          category: "View" },
  { id: "toggleGrid",         defaultKey: "G",              label: "Toggle Grid",                category: "View" },
  { id: "toggleSnap",         defaultKey: "Shift+G",        label: "Toggle Snap",                category: "View" },
  { id: "cycleViewMode",      defaultKey: "P",              label: "Cycle View Mode",            category: "View" },
  { id: "togglePreviews",     defaultKey: "T",              label: "Toggle Inline Previews",     category: "View" },
  { id: "toggleHelpMode",     defaultKey: "?",              label: "Toggle Help Mode",           category: "View" },
  { id: "toggleLeftPanel",    defaultKey: "Ctrl+[",         label: "Toggle Left Panel",          category: "View" },
  { id: "toggleRightPanel",   defaultKey: "Ctrl+]",         label: "Toggle Right Panel",         category: "View" },
  { id: "maximizeEditor",     defaultKey: "Ctrl+\\",        label: "Maximize Editor",            category: "View" },
  { id: "bridge",             defaultKey: "Ctrl+B",         label: "Bridge",                     category: "View" },
  { id: "settings",           defaultKey: "Ctrl+,",         label: "Preferences",                category: "View" },
  { id: "toggleSplitDirection",  defaultKey: "V",           label: "Toggle Split Direction",     category: "View" },
];

/** Returns the effective key combo for a given shortcut id (user override or default). */
export function resolveKeybinding(id: string): string {
  const overrides = useSettingsStore.getState().keybindingOverrides;
  if (overrides[id]) return overrides[id];
  const def = KEYBINDINGS.find((k) => k.id === id);
  return def?.defaultKey ?? "";
}

/**
 * Parse a key combo string like "Ctrl+Shift+L" into its parts.
 * Normalises "Ctrl" to ctrlKey (or metaKey on macOS handled at match time).
 */
function parseKeyCombo(combo: string) {
  const parts = combo.split("+");
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1).map((m) => m.toLowerCase()));
  return {
    ctrl: mods.has("ctrl"),
    shift: mods.has("shift"),
    alt: mods.has("alt"),
    key,
  };
}

/** Check if a KeyboardEvent matches the resolved binding for a shortcut id. */
export function matchesKeybinding(id: string, e: KeyboardEvent): boolean {
  const combo = resolveKeybinding(id);
  if (!combo) return false;
  return matchesKeyCombo(combo, e);
}

/** Check if a KeyboardEvent matches a specific key combo string. */
export function matchesKeyCombo(combo: string, e: KeyboardEvent): boolean {
  const parsed = parseKeyCombo(combo);
  const mod = e.metaKey || e.ctrlKey;

  // Modifier check
  if (parsed.ctrl !== mod) return false;
  if (parsed.shift !== e.shiftKey) return false;
  if (parsed.alt !== e.altKey) return false;

  // Key check — handle special keys
  const eventKey = e.key;
  const parsedKey = parsed.key;

  if (parsedKey === "Tab") return eventKey === "Tab";
  if (parsedKey === "?") return eventKey === "?";

  // For single characters, compare case-insensitively
  if (parsedKey.length === 1) {
    return eventKey.toLowerCase() === parsedKey.toLowerCase();
  }

  // Fallback
  return eventKey === parsedKey;
}

/** Format a key combo for display (e.g. replace Ctrl with ⌘ on macOS). */
export function formatKeyCombo(combo: string): string {
  if (!combo) return "";
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  if (isMac) {
    return combo
      .replace(/Ctrl\+/g, "⌘")
      .replace(/Alt\+/g, "⌥")
      .replace(/Shift\+/g, "⇧");
  }
  return combo;
}
