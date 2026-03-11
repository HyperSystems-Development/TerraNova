import { useState, useCallback, useEffect, useRef } from "react";
import { useProjectStore, type DirectoryEntry } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import { showInFolder } from "@/utils/ipc";

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
  if (lower.includes("biome")) return "#4E9E8F";                          // jade
  if (lower.includes("density") || lower.includes("terrain")) return "#5B8DBF"; // slate blue
  if (lower.includes("material")) return "#C87D3A";                        // copper
  if (lower.includes("worldstructure") || lower.includes("world_structure")) return "#9B7FBF"; // violet
  if (lower.includes("structure")) return "#9B7FBF";                       // violet
  if (lower.includes("assignment")) return "#7BAA7B";                      // muted green
  if (lower.includes("environment") || lower.includes("environ")) return "#7DB08C"; // sage
  if (lower.includes("prefab")) return "#A09B74";                          // khaki
  if (lower.includes("instance")) return "#A0825A";                        // tan
  if (lower.includes("settings") || lower.includes("config")) return "#B5A88C"; // warm stone
  if (lower.includes("world")) return "#7B8FBF";                           // basalt
  if (lower === "manifest.json") return "#B5A88C";                         // warm stone
  return "#D4C9B5";                                                        // default warm
}

/* ── Context Menu ──────────────────────────────────────────────────── */

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
}

function ContextMenu({ menu, onClose }: { menu: ContextMenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded border border-tn-border bg-tn-surface shadow-lg py-1 text-[13px] text-tn-text"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-white/[0.06] transition-colors"
        onClick={handleReveal}
      >
        Reveal in Explorer
      </button>
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
  onContextMenu: (e: React.MouseEvent, path: string) => void;
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
          onContextMenu={(e) => onContextMenu(e, entry.path)}
        >
          {/* Indent guides */}
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
      onContextMenu={(e) => onContextMenu(e, entry.path)}
    >
      {depth > 0 && <IndentGuides depth={depth} />}
      {/* Spacer to align with folders (chevron width) */}
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  }, []);

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
        <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
