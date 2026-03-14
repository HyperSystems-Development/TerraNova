import { useCallback, useEffect, useRef, useState } from "react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useProjectStore, type DirectoryEntry } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import {
  showInFolder,
  createDirectory,
  copyFile,
  listDirectory,
  resolveBundledHytaleAssetPath,
  type DirectoryEntryData,
} from "@/utils/ipc";
import mapDirEntry from "@/utils/mapDirEntry";
import { useToastStore } from "@/stores/toastStore";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-tn-text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
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
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <path
          d="M1.5 3.5a1 1 0 011-1h3.586a1 1 0 01.707.293L8.207 4.207a1 1 0 00.707.293H13.5a1 1 0 011 1V5.5H3l-1 7h12l1-7"
          stroke="#b5924c"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12.5l1-7h12l-1 7H2z"
          fill="#b5924c"
          opacity="0.15"
          stroke="#b5924c"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
      <path
        d="M1.5 3.5a1 1 0 011-1h3.586a1 1 0 01.707.293L8.207 4.207a1 1 0 00.707.293H13.5a1 1 0 011 1v7a1 1 0 01-1 1h-12a1 1 0 01-1-1v-8z"
        fill="#b5924c"
        opacity="0.15"
        stroke="#b5924c"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon({ name }: { name: string }) {
  const color = getFileColor(name);
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 1.5h5.5L13 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z"
        fill={color}
        opacity="0.6"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 1.5V5H13"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
}

interface NewFolderDialogState {
  open: boolean;
  targetDirectory: string;
}

const HYTALE_FOLDERS = [
  { label: "Weathers", path: "Server\\Weathers" },
  { label: "Environments", path: "Server\\Environments" },
  { label: "Biomes", path: "Server\\HytaleGenerator\\Biomes" },
  { label: "WorldStructures", path: "Server\\HytaleGenerator\\WorldStructures" },
];
const QUICK_PICK_EXTENSIONS = new Set([".json", ".png", ".jpg", ".jpeg", ".dds", ".bson"]);
const QUICK_PICK_LIMIT = 12;

function normalizeWindowsPath(path: string): string {
  return path.replace(/\//g, "\\").replace(/\\+$/, "");
}

function getTargetDirectory(menu: ContextMenuState): string {
  return menu.isDir ? menu.path : menu.path.replace(/[/\\][^/\\]+$/, "");
}

function getBundledAssetRelativePath(projectPath: string | null, targetPath: string): string {
  if (!projectPath) return "";

  const normalizedProjectPath = normalizeWindowsPath(projectPath);
  const normalizedTargetPath = normalizeWindowsPath(targetPath);
  if (!normalizedTargetPath.startsWith(normalizedProjectPath)) {
    return "";
  }

  const relativePath = normalizedTargetPath
    .slice(normalizedProjectPath.length)
    .replace(/^\\+/, "");

  return relativePath;
}

function getBundledAssetSourceLabel(relativePath: string): string {
  return relativePath ? `Hytale Cache\\${relativePath}` : "Hytale Cache";
}

function isQuickPickAsset(name: string): boolean {
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  return QUICK_PICK_EXTENSIONS.has(extension);
}

async function findSeedAssetFile(sourceDir: string): Promise<DirectoryEntryData | null> {
  let entries: DirectoryEntryData[];
  try {
    entries = await listDirectory(sourceDir);
  } catch {
    return null;
  }

  const jsonFiles = entries
    .filter((entry) => !entry.is_dir && entry.name.toLowerCase().endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const defaultJson = jsonFiles.find((entry) => entry.name.toLowerCase() === "default.json");
  if (defaultJson) return defaultJson;
  if (jsonFiles.length > 0) return jsonFiles[0];

  const subdirectories = entries
    .filter((entry) => entry.is_dir)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const subdirectory of subdirectories) {
    const seedAsset = await findSeedAssetFile(subdirectory.path);
    if (seedAsset) return seedAsset;
  }

  return null;
}

function ContextMenuDivider() {
  return <div className="my-1 border-t border-tn-border/40" />;
}

function validateFolderName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Folder name is required.";
  if (trimmed === "." || trimmed === "..") return "Folder name cannot be . or ..";
  if (/[\\/]/.test(trimmed)) return "Folder name cannot contain path separators.";
  if (/[<>:"|?*]/.test(trimmed)) return "Folder name contains invalid Windows characters.";
  return null;
}

function NewFolderDialog({
  open,
  targetDirectory,
  value,
  error,
  loading,
  onChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  targetDirectory: string;
  value: string;
  error: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Enter" && !loading) {
        event.preventDefault();
        onConfirm();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose, onConfirm, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[440px] rounded-lg border border-tn-border bg-tn-panel p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-tn-text">New Folder</h2>
          <p className="mt-1 text-xs text-tn-text-muted">Create a folder inside:</p>
          <p className="mt-1 truncate rounded border border-tn-border/50 bg-tn-bg/70 px-2 py-1 text-[11px] text-tn-text-muted">
            {targetDirectory}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-tn-text-muted" htmlFor="asset-tree-new-folder">
            Folder Name
          </label>
          <input
            id="asset-tree-new-folder"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="NewFolder"
            className="rounded border border-tn-border bg-tn-bg px-2 py-1.5 text-sm text-tn-text outline-none transition-colors focus:border-tn-accent"
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-tn-border pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded border border-tn-border px-3 py-1.5 text-xs hover:bg-tn-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded bg-tn-accent px-3 py-1.5 text-xs font-medium text-tn-bg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Folder"}
          </button>
        </div>
      </div>
    </div>
  );
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
      className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left transition-colors ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-tn-text hover:bg-white/[0.06]"
      }`}
      onClick={onClick}
    >
      <span className="text-[13px]">{label}</span>
      {sublabel ? <span className="truncate text-[10px] text-tn-text-muted">{sublabel}</span> : null}
    </button>
  );
}

function ContextMenu({
  menu,
  onClose,
  onRefresh,
  onRequestNewFolder,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onRefresh: () => void;
  onRequestNewFolder: (targetDirectory: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const projectPath = useProjectStore((s) => s.projectPath);
  const addToast = useToastStore((s) => s.addToast);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const [showAssetSubmenu, setShowAssetSubmenu] = useState(false);
  const [assetChoices, setAssetChoices] = useState<DirectoryEntryData[] | null>(null);
  const [assetChoiceError, setAssetChoiceError] = useState<string | null>(null);
  const targetDirectory = getTargetDirectory(menu);
  const bundledAssetRelativePath = getBundledAssetRelativePath(projectPath, targetDirectory);
  const assetSourceLabel = getBundledAssetSourceLabel(bundledAssetRelativePath);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useEffect(() => {
    setShowFolderSubmenu(false);
    setShowAssetSubmenu(false);
    setAssetChoices(null);
    setAssetChoiceError(null);
  }, [bundledAssetRelativePath, targetDirectory]);

  function handleReveal() {
    showInFolder(menu.path).catch(() => {});
    onClose();
  }

  function handleCopyPath() {
    navigator.clipboard.writeText(menu.path).catch(() => {});
    addToast("Path copied to clipboard", "success");
    onClose();
  }

  function handleNewFolder() {
    onRequestNewFolder(targetDirectory);
    onClose();
  }

  async function handleAddHytaleFolder(folderRelPath: string, label: string) {
    if (!projectPath) {
      onClose();
      return;
    }

    const fullPath = `${projectPath}\\${folderRelPath}`;
    try {
      await createDirectory(fullPath);
      onRefresh();
      addToast(`Created ${label} folder`, "success");
    } catch (error) {
      addToast(`Failed to create folder: ${error}`, "error");
      onClose();
      return;
    }

    try {
      const sourceDir = await resolveBundledHytaleAssetPath(
        getBundledAssetRelativePath(projectPath, fullPath),
      );
      const seedAsset = await findSeedAssetFile(sourceDir);
      if (seedAsset) {
        await copyFile(seedAsset.path, `${fullPath}\\${seedAsset.name}`);
        onRefresh();
        addToast(`Added default asset: ${seedAsset.name}`, "success");
      }
    } catch {
      // Missing bundled assets for this folder type is non-fatal.
    }

    onClose();
  }

  async function copyBundledAsset(sourcePath: string, fileName: string) {
    const destination = `${targetDirectory}\\${fileName}`;
    try {
      await copyFile(sourcePath, destination);
      onRefresh();
      addToast(`Added Hytale asset: ${fileName}`, "success");
    } catch (error) {
      addToast(`Failed to add asset: ${error}`, "error");
    }
    onClose();
  }

  async function loadAssetChoices() {
    try {
      const sourcePath = await resolveBundledHytaleAssetPath(bundledAssetRelativePath);
      const entries = await listDirectory(sourcePath);
      const files = entries
        .filter((entry) => !entry.is_dir && isQuickPickAsset(entry.name))
        .sort((left, right) => left.name.localeCompare(right.name));
      setAssetChoices(files);
      setAssetChoiceError(null);
    } catch (error) {
      setAssetChoices([]);
      setAssetChoiceError(String(error));
    }
  }

  async function handleCopyHytaleAsset() {
    let defaultPath: string;
    try {
      defaultPath = await resolveBundledHytaleAssetPath(bundledAssetRelativePath);
    } catch {
      addToast("No cached Hytale assets are available for this folder yet. Sync them in Settings first.", "warning");
      onClose();
      return;
    }

    const selected = await openFileDialog({
      title: "Add Hytale Asset",
      defaultPath,
      filters: [{ name: "Hytale Assets", extensions: ["json", "png", "jpg", "jpeg", "dds", "bson"] }],
    });
    if (!selected || typeof selected !== "string") {
      onClose();
      return;
    }

    const fileName = selected.split(/[/\\]/).pop() ?? "asset.json";
    await copyBundledAsset(selected, fileName);
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[200px] rounded border border-tn-border bg-tn-surface py-1 text-[13px] shadow-xl"
      style={{ left: menu.x, top: menu.y }}
    >
      <ContextMenuItem label="Reveal in Explorer" onClick={handleReveal} />
      <ContextMenuItem label="Copy Path" onClick={handleCopyPath} />

      <ContextMenuDivider />

      <ContextMenuItem label="New Folder..." onClick={handleNewFolder} />

      <div className="relative">
        <button
          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-tn-text transition-colors hover:bg-white/[0.06]"
          onMouseEnter={() => setShowFolderSubmenu(true)}
          onMouseLeave={() => setShowFolderSubmenu(false)}
        >
          <span className="text-[13px]">Add Hytale Folder</span>
          <svg className="h-3 w-3 text-tn-text-muted" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </button>
        {showFolderSubmenu ? (
          <div
            className="absolute left-full top-0 z-50 min-w-[180px] rounded border border-tn-border bg-tn-surface py-1 shadow-xl"
            onMouseEnter={() => setShowFolderSubmenu(true)}
            onMouseLeave={() => setShowFolderSubmenu(false)}
          >
            {HYTALE_FOLDERS.map((folder) => (
              <ContextMenuItem
                key={folder.path}
                label={folder.label}
                sublabel={folder.path}
                onClick={() => {
                  void handleAddHytaleFolder(folder.path, folder.label);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-tn-text transition-colors hover:bg-white/[0.06]"
          onMouseEnter={() => {
            setShowAssetSubmenu(true);
            if (assetChoices === null) {
              void loadAssetChoices();
            }
          }}
          onMouseLeave={() => setShowAssetSubmenu(false)}
        >
          <span className="text-[13px]">Add Hytale Asset</span>
          <svg className="h-3 w-3 text-tn-text-muted" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </button>
        {showAssetSubmenu ? (
          <div
            className="absolute left-full top-0 z-50 min-w-[220px] rounded border border-tn-border bg-tn-surface py-1 shadow-xl"
            onMouseEnter={() => setShowAssetSubmenu(true)}
            onMouseLeave={() => setShowAssetSubmenu(false)}
          >
            <div className="border-b border-tn-border/40 px-3 py-1.5">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
                {assetSourceLabel}
              </p>
            </div>
            {assetChoices === null ? (
              <div className="px-3 py-2 text-[11px] text-tn-text-muted">Loading assets...</div>
            ) : assetChoices.length > 0 ? (
              <>
                {assetChoices.slice(0, QUICK_PICK_LIMIT).map((asset) => (
                  <ContextMenuItem
                    key={asset.path}
                    label={asset.name}
                    onClick={() => {
                      void copyBundledAsset(asset.path, asset.name);
                    }}
                  />
                ))}
                {assetChoices.length > QUICK_PICK_LIMIT ? (
                  <div className="px-3 py-1 text-[10px] text-tn-text-muted">
                    {assetChoices.length - QUICK_PICK_LIMIT} more file(s) available via Browse...
                  </div>
                ) : null}
              </>
            ) : (
              <div className="px-3 py-2 text-[11px] text-tn-text-muted">
                {assetChoiceError ? "No direct file picks here. Use Browse..." : "No cached files in this folder."}
              </div>
            )}

            <ContextMenuDivider />

            <ContextMenuItem
              label="Browse..."
              sublabel={assetSourceLabel}
              onClick={() => {
                void handleCopyHytaleAsset();
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TreeNode({
  entry,
  depth,
  onContextMenu,
}: {
  entry: DirectoryEntry;
  depth: number;
  onContextMenu: (event: React.MouseEvent, path: string, isDir: boolean) => void;
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
          className="group flex w-full items-center gap-1.5 py-[5px] text-left text-[13px] text-tn-text transition-colors duration-100 hover:bg-white/[0.04]"
          style={{ paddingLeft: `${indent}px`, paddingRight: 8 }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(event) => onContextMenu(event, entry.path, true)}
        >
          {depth > 0 ? <IndentGuides depth={depth} /> : null}
          <ChevronIcon open={expanded} />
          <FolderIcon open={expanded} />
          <span className="truncate font-medium">{entry.name}</span>
          {entry.children && entry.children.length > 0 ? (
            <span className="ml-auto tabular-nums text-[10px] text-tn-text-muted/60">
              {entry.children.length}
            </span>
          ) : null}
        </button>
        {expanded ? (
          <div className="relative">
            {entry.children?.map((child) => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} onContextMenu={onContextMenu} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={`group flex w-full items-center gap-1.5 py-[5px] text-left text-[13px] transition-colors duration-100 ${
        isActive ? "bg-tn-accent/10 text-tn-accent" : "text-tn-text hover:bg-white/[0.04]"
      }`}
      style={{ paddingLeft: `${indent}px`, paddingRight: 8 }}
      onClick={() => openFile(entry.path)}
      onContextMenu={(event) => onContextMenu(event, entry.path, false)}
    >
      {depth > 0 ? <IndentGuides depth={depth} /> : null}
      <span className="w-3 shrink-0" />
      <FileIcon name={entry.name} />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

function IndentGuides({ depth }: { depth: number }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0" aria-hidden>
      {Array.from({ length: depth }, (_, index) => (
        <div
          key={index}
          className="absolute inset-y-0 w-px bg-tn-border/30"
          style={{ left: `${(index + 1) * 14 + 6 + 5}px` }}
        />
      ))}
    </div>
  );
}

export function AssetTree() {
  const directoryTree = useProjectStore((s) => s.directoryTree);
  const setDirectoryTree = useProjectStore((s) => s.setDirectoryTree);
  const projectPath = useProjectStore((s) => s.projectPath);
  const addToast = useToastStore((s) => s.addToast);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<NewFolderDialogState>({
    open: false,
    targetDirectory: "",
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleContextMenu = useCallback((event: React.MouseEvent, path: string, isDir: boolean) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, path, isDir });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!projectPath) return;
    try {
      const entries = await listDirectory(projectPath);
      setDirectoryTree(entries.map(mapDirEntry));
    } catch {
      // Leave the tree as-is if refresh fails.
    }
  }, [projectPath, setDirectoryTree]);

  const handleRequestNewFolder = useCallback((targetDirectory: string) => {
    setNewFolderDialog({ open: true, targetDirectory });
    setNewFolderName("");
    setNewFolderError(null);
  }, []);

  const handleCloseNewFolderDialog = useCallback(() => {
    if (creatingFolder) return;
    setNewFolderDialog({ open: false, targetDirectory: "" });
    setNewFolderName("");
    setNewFolderError(null);
  }, [creatingFolder]);

  const handleConfirmNewFolder = useCallback(async () => {
    const validationError = validateFolderName(newFolderName);
    if (validationError) {
      setNewFolderError(validationError);
      return;
    }

    setCreatingFolder(true);
    setNewFolderError(null);
    const folderName = newFolderName.trim();
    const newPath = `${newFolderDialog.targetDirectory}\\${folderName}`;
    try {
      await createDirectory(newPath);
      await handleRefresh();
      addToast(`Created folder: ${folderName}`, "success");
      setNewFolderDialog({ open: false, targetDirectory: "" });
      setNewFolderName("");
    } catch (error) {
      setNewFolderError(`Failed to create folder: ${error}`);
    } finally {
      setCreatingFolder(false);
    }
  }, [addToast, handleRefresh, newFolderDialog.targetDirectory, newFolderName]);

  if (directoryTree.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-sm text-tn-text-muted">
          No asset pack open.
          <br />
          Use File -&gt; Open to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 select-none overflow-y-auto py-1">
      {directoryTree.map((entry) => (
        <TreeNode key={entry.path} entry={entry} depth={0} onContextMenu={handleContextMenu} />
      ))}
      {contextMenu ? (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onRefresh={() => {
            void handleRefresh();
          }}
          onRequestNewFolder={handleRequestNewFolder}
        />
      ) : null}
      <NewFolderDialog
        open={newFolderDialog.open}
        targetDirectory={newFolderDialog.targetDirectory}
        value={newFolderName}
        error={newFolderError}
        loading={creatingFolder}
        onChange={(value) => {
          setNewFolderName(value);
          if (newFolderError) setNewFolderError(null);
        }}
        onClose={handleCloseNewFolderDialog}
        onConfirm={() => {
          void handleConfirmNewFolder();
        }}
      />
    </div>
  );
}
