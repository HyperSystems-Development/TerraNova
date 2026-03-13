import { useState, useCallback, useEffect, useRef } from "react";
import { useProjectStore, type DirectoryEntry } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import { showInFolder, createDirectory, copyFile, listDirectory } from "@/utils/ipc";
import mapDirEntry from "@/utils/mapDirEntry";
import { useToastStore } from "@/stores/toastStore";

/* ── Inline SVG Icons ──────────────────────────────────────────────── */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 shrink-0 text-tn-text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M6 3l5 5-5 5V3z" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 3.5a1 1 0 011-1h3.586a1 1 0 01.707.293L8.207 4.207a1 1 0 00.707.293H13.5a1 1 0 011 1V5.5H3l-1 7h12l1-7" stroke="#b5924c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12.5l1-7h12l-1 7H2z" fill="#b5924c" opacity="0.15" stroke="#b5924c" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 3.5a1 1 0 011-1h3.586a1 1 0 01.707.293L8.207 4.207a1 1 0 00.707.293H13.5a1 1 0 011 1v7a1 1 0 01-1 1h-12a1 1 0 01-1-1v-8z" fill="#b5924c" opacity="0.15" stroke="#b5924c" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon({ name }: { name: string }) {
  const color = getFileColor(name);
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
      <path d="M4 1.5h5.5L13 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" fill={color} opacity="0.6" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.5 1.5V5H13" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Map file names to semantic colors */
function getFileColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("biome")) return "#4E9E8F";
  if (lower.includes("density") || lower.includes("terrain")) return "#5B8DBF";
  if (lower.includes("material")) return "#C87D3A";
  if (lower.includes("worldstructure") || lower.includes("world_structure")) return "#9B7FBF";
  if (lower.includes("structure")) return "#9B7FBF";
  if (lower.includes("assignment")) return "#7BAA7B";
  if (lower.includes("environment") || lower.includes("environ")) return "#7DB08C";
  if (lower.includes("weather")) return "#5B9EC9";
  if (lower.includes("prefab")) return "#A09B74";
  if (lower.includes("instance")) return "#A0825A";
  if (lower.includes("settings") || lower.includes("config")) return "#B5A88C";
  if (lower.includes("world")) return "#7B8FBF";
  if (lower === "manifest.json") return "#B5A88C";
  return "#D4C9B5";
}

/* ── Context Menu ──────────────────────────────────────────────────── */

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
}

/** Standard Hytale asset folder names that can be bootstrapped quickly */
const HYTALE_FOLDERS = [
  { label: "Weathers", path: "Server\\Weathers" },
  { label: "Environments", path: "Server\\Environments" },
  { label: "Biomes", path: "Server\\HytaleGenerator\\Biomes" },
  { label: "WorldStructures", path: "Server\\HytaleGenerator\\WorldStructures" },
];

function ContextMenuDivider() {
  return <div className="my-1 border-t border-tn-border/40" />;
}

function ContextMenuItem({
  label,
  sublabel,
  onClick,
  danger,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 transition-colors flex items-baseline gap-2 ${
        danger
          ? "hover:bg-red-500/10 text-red-400"
          : "hover:bg-white/[0.06] text-tn-text"
      }`}
      onClick={onClick}
    >
      <span className="text-[13px]">{label}</span>
      {sublabel && <span className="text-[10px] text-tn-text-muted truncate">{sublabel}</span>}
    </button>
  );
}

function ContextMenu({
  menu,
  onClose,
  onRefresh,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const projectPath = useProjectStore((s) => s.projectPath);
  const addToast = useToastStore((s) => s.addToast);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleReveal() {
    showInFolder(menu.path).catch(() => {});
    onClose();
  }

  async function handleNewFolder() {
    const name = window.prompt("New folder name:");
    if (!name?.trim()) { onClose(); return; }
    const base = menu.isDir ? menu.path : menu.path.replace(/[/\\][^/\\]+$/, "");
    const newPath = `${base}\\${name.trim()}`;
    try {
      await createDirectory(newPath);
      onRefresh();
      addToast(`Created folder: ${name.trim()}`, "success");
    } catch (e) {
      addToast(`Failed to create folder: ${e}`, "error");
    }
    onClose();
  }

  async function handleAddHytaleFolder(folderRelPath: string, label: string) {
    if (!projectPath) { onClose(); return; }
    const fullPath = `${projectPath}\\${folderRelPath}`;
    try {
      await createDirectory(fullPath);
      onRefresh();
      addToast(`Created ${label} folder`, "success");
    } catch (e) {
      addToast(`Failed: ${e}`, "error");
    }
    onClose();
  }

  async function handleCopyHytaleAsset() {
    // Prompt user to pick a file from the Hytale asset store
    // We open a file dialog — use native via window.prompt as a path input fallback
    // (Tauri's open dialog would be ideal but we can't call it here without a hook)
    const src = window.prompt("Paste the full path to the Hytale asset file:");
    if (!src?.trim()) { onClose(); return; }
    const fileName = src.trim().split(/[/\\]/).pop() ?? "asset.json";
    const destDir = menu.isDir ? menu.path : menu.path.replace(/[/\\][^/\\]+$/, "");
    const dest = `${destDir}\\${fileName}`;
    try {
      await copyFile(src.trim(), dest);
      onRefresh();
      addToast(`Imported: ${fileName}`, "success");
    } catch (e) {
      addToast(`Failed to import: ${e}`, "error");
    }
    onClose();
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[200px] rounded border border-tn-border bg-tn-surface shadow-xl py-1 text-[13px]"
      style={{ left: menu.x, top: menu.y }}
    >
      <ContextMenuItem label="Reveal in Explorer" onClick={handleReveal} />

      <ContextMenuDivider />

      <ContextMenuItem label="New Folder…" onClick={handleNewFolder} />

      <div className="relative">
        <button
          className="w-full text-left px-3 py-1.5 hover:bg-white/[0.06] transition-colors flex items-center justify-between text-tn-text"
          onMouseEnter={() => setShowFolderSubmenu(true)}
          onMouseLeave={() => setShowFolderSubmenu(false)}
        >
          <span className="text-[13px]">Add Hytale Folder</span>
          <svg className="w-3 h-3 text-tn-text-muted" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </button>
        {showFolderSubmenu && (
          <div
            className="absolute left-full top-0 z-50 min-w-[180px] rounded border border-tn-border bg-tn-surface shadow-xl py-1"
            onMouseEnter={() => setShowFolderSubmenu(true)}
            onMouseLeave={() => setShowFolderSubmenu(false)}
          >
            {HYTALE_FOLDERS.map((f) => (
              <ContextMenuItem
                key={f.path}
                label={f.label}
                sublabel={f.path}
                onClick={() => { void handleAddHytaleFolder(f.path, f.label); }}
              />
            ))}
          </div>
        )}
      </div>

      <ContextMenuItem
        label="Import Hytale Asset…"
        sublabel="copy file into folder"
        onClick={() => { void handleCopyHytaleAsset(); }}
      />
    </div>
  );
}

/* ── Tree Node ─────────────────────────────────────────────────────── */

function TreeNode({
  entry,
  depth,
  onContextMenu,
}: {
  entry: DirectoryEntry;
  depth: number;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { openFile } = useTauriIO();
  const currentFile = useProjectStore((s) => s.currentFile);

  const isActive = currentFile === entry.path;
  const indent = depth * 14 + 6;

  if (entry.isDir) {
    return (
      <div>
        <button
          className="group flex items-center gap-1.5 w-full text-left py-[5px] text-[13px] text-tn-text hover:bg-white/[0.04] transition-colors duration-100"
          style={{ paddingLeft: `${indent}px`, paddingRight: 8 }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, entry.path, true)}
        >
          {depth > 0 && <IndentGuides depth={depth} />}
          <ChevronIcon open={expanded} />
          <FolderIcon open={expanded} />
          <span className="truncate font-medium">{entry.name}</span>
          {entry.children && entry.children.length > 0 && (
            <span className="ml-auto text-[10px] text-tn-text-muted/60 tabular-nums">
              {entry.children.length}
            </span>
          )}
        </button>
        {expanded && (
          <div className="relative">
            {entry.children?.map((child) => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} onContextMenu={onContextMenu} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`group flex items-center gap-1.5 w-full text-left py-[5px] text-[13px] transition-colors duration-100 ${
        isActive
          ? "bg-tn-accent/10 text-tn-accent"
          : "text-tn-text hover:bg-white/[0.04]"
      }`}
      style={{ paddingLeft: `${indent}px`, paddingRight: 8 }}
      onClick={() => openFile(entry.path)}
      onContextMenu={(e) => onContextMenu(e, entry.path, false)}
    >
      {depth > 0 && <IndentGuides depth={depth} />}
      <span className="w-3 shrink-0" />
      <FileIcon name={entry.name} />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

/** Subtle vertical indent guide lines */
function IndentGuides({ depth }: { depth: number }) {
  return (
    <div className="absolute top-0 bottom-0 left-0 pointer-events-none" aria-hidden>
      {Array.from({ length: depth }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px bg-tn-border/30"
          style={{ left: `${(i + 1) * 14 + 6 + 5}px` }}
        />
      ))}
    </div>
  );
}

/* ── Asset Tree Root ───────────────────────────────────────────────── */

export function AssetTree() {
  const directoryTree = useProjectStore((s) => s.directoryTree);
  const setDirectoryTree = useProjectStore((s) => s.setDirectoryTree);
  const projectPath = useProjectStore((s) => s.projectPath);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!projectPath) return;
    try {
      const entries = await listDirectory(projectPath);
      setDirectoryTree(entries.map(mapDirEntry));
    } catch {
      // ignore — tree will stay as-is
    }
  }, [projectPath, setDirectoryTree]);

  if (directoryTree.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-tn-text-muted text-center">
          No asset pack open.
          <br />
          Use File &rarr; Open to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1 select-none">
      {directoryTree.map((entry) => (
        <TreeNode key={entry.path} entry={entry} depth={0} onContextMenu={handleContextMenu} />
      ))}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onRefresh={() => { void handleRefresh(); }}
        />
      )}
    </div>
  );
}
