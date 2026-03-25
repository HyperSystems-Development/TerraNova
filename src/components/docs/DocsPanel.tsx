import { startTransition, useDeferredValue, useMemo, useState, useEffect, useCallback, useRef, memo } from "react";
import "highlight.js/styles/atom-one-dark.css";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Folder, FileText, X,
  BookOpen, Map as MapIcon, Wrench, Library, ScrollText, GitPullRequest, Copy, Check,
  Compass, GraduationCap, Hash, List, Settings, Search, Clock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { MermaidDiagram } from "@/components/docs/MermaidDiagram";
import { DocNodeGraph, parseNodeGraph } from "@/components/docs/DocNodeGraph";
import {
  buildDocNodeGraphMarkdownBlock,
  buildSnippetDocNodeGraph,
  buildSnippetGraphData,
  extractWalkthroughSteps,
  filterDocTree,
  findFirstFileSlug,
  getDefaultDocSlug,
  parseSnippetFence,
  stripDocComments,
} from "@/components/docs/docsPanelUtils";
import { CurveCanvas } from "@/components/properties/CurveCanvas";
import { autoLayout } from "@/utils/autoLayout";
import type { ClipboardData } from "@/utils/clipboard";
import { useEditorStore } from "@/stores/editorStore";
import { getMutateAndCommit } from "@/stores/slices/historySlice";
import { useToastStore } from "@/stores/toastStore";
import { usePreviewStore } from "@/stores/previewStore";
import { useSettingsStore } from "@/stores/settingsStore";

// ── Inline node pill ─────────────────────────────────────────────────────────
// Category colours match DocNodeGraph's CATEGORY_COLORS palette.
const NODE_CATEGORY_COLORS: Record<string, string> = {
  generative:  "#4A90D9",
  filter:      "#7B68AE",
  math:        "#2D9B83",
  position:    "#3D8B37",
  terrain:     "#B8763C",
  shape:       "#C45B84",
  material:    "#C87D3A",
  prop:        "#C76B6B",
  scanner:     "#5AACA6",
  biome:       "#4E9E8F",
  worldstruct: "#5A6FA0",
  framework:   "#8C8878",
  output:      "#b5924c",
  curve:       "#A67EB8",
};

/** Known node → category lookup so authors can write `node:SimplexNoise2D` without specifying category. */
const NODE_DEFAULT_CATEGORY: Record<string, string> = {
  // Generative
  SimplexNoise2D: "generative", SimplexNoise3D: "generative",
  CellNoise2D: "generative", CellNoise3D: "generative",
  CellWallDistance: "generative", Abs: "generative",
  // Math / combinators
  Sum: "math", Min: "math", Max: "math", Mix: "math",
  SmoothMin: "math", SmoothMax: "math", Multiplier: "math",
  Inverter: "math", Normalizer: "math", Constant: "math",
  Amplitude: "math", MultiMix: "math",
  // Filter / transform
  CurveMapper: "filter", YSampled: "filter", GradientWarp: "filter",
  FastGradientWarp: "filter", VectorWarp: "filter",
  Switch: "filter", SwitchState: "filter",
  Cache: "filter", Cache2D: "filter",
  Pow: "filter", Sqrt: "filter",
  // Position / coordinate
  BaseHeight: "position", YValue: "position",
  XOverride: "position", YOverride: "position", ZOverride: "position",
  Scale: "position", Slider: "position", Rotator: "position", Anchor: "position",
  DistanceToBiomeEdge: "position",
  // Terrain
  TerrainAccessor: "terrain", Terrain: "terrain",
  Imported: "terrain", Exported: "terrain", SingleInstance: "terrain",
  // Shape SDF
  Ellipsoid: "shape", Plane: "shape", Cylinder: "shape",
  Cuboid: "shape", Shell: "shape",
  // Output
  "Terrain Out": "output",
  // Material
  SpaceAndDepth: "material", ConstantThickness: "material",
  NoiseThickness: "material", RangeThickness: "material",
  WeightedThickness: "material", Queue: "material",
  DownwardDepth: "material", UpwardDepth: "material",
  DownwardSpace: "material", UpwardSpace: "material",
  // Prop / scanner
  Prefab: "prop", Cluster: "prop", Weighted: "prop", PondFiller: "prop",
  Occurrence: "prop", Jitter2d: "prop", SimpleHorizontal: "prop",
  ColumnLinear: "scanner", ColumnRandom: "scanner", Area: "scanner",
};

/**
 * Renders an inline TerraNova node pill.
 * Syntax in markdown: `node:NodeName` or `node:NodeName|category`
 */
function NodePill({ name, category }: { name: string; category?: string }) {
  const cat = category ?? NODE_DEFAULT_CATEGORY[name] ?? "generative";
  const color = NODE_CATEGORY_COLORS[cat] ?? NODE_CATEGORY_COLORS.generative;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 4,
        border: `1.5px solid ${color}88`,
        background: `${color}1a`,
        padding: "1px 7px 1px 5px",
        fontSize: "0.8em",
        fontFamily: "inherit",
        fontWeight: 600,
        color,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {name}
    </span>
  );
}

// ── Docs settings ────────────────────────────────────────────────────────────
type DocsSettings = {
  showDifficultyTags: boolean;
  compactTree: boolean;
  showProgressBar: boolean;
  showTocByDefault: boolean;
  showFolderCount: boolean;
  readingWidth: "narrow" | "standard" | "wide";
  fontSize: "default" | "small" | "medium" | "large";
  wrapCodeBlocks: boolean;
  showStickyHeader: boolean;
  showRelatedDocs: boolean;
  autoOpenFirstSearchResult: boolean;
  curvePreviewDetail: "minimal" | "standard";
  curvePreviewScale: "compact" | "comfortable";
  snippetDisplayMode: "json" | "nodegraph" | "both";
};

const DEFAULT_SETTINGS: DocsSettings = {
  showDifficultyTags: false,
  compactTree: false,
  showProgressBar: false,
  showTocByDefault: false,
  showFolderCount: false,
  readingWidth: "standard",
  fontSize: "default",
  wrapCodeBlocks: false,
  showStickyHeader: false,
  showRelatedDocs: true,
  autoOpenFirstSearchResult: false,
  curvePreviewDetail: "minimal",
  curvePreviewScale: "compact",
  snippetDisplayMode: "json",
};

type DocsSettingsPresetId = "balanced" | "focused" | "reference";

type DocsSettingsPreset = {
  id: DocsSettingsPresetId;
  label: string;
  description: string;
  settings: DocsSettings;
};

const DOCS_SETTINGS_PRESETS: DocsSettingsPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "General-purpose browsing and reading.",
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: "focused",
    label: "Focused",
    description: "Roomier reading with richer walkthrough previews.",
    settings: {
      ...DEFAULT_SETTINGS,
      readingWidth: "wide",
      fontSize: "medium",
      showTocByDefault: true,
      showStickyHeader: true,
      showRelatedDocs: false,
      curvePreviewDetail: "standard",
      curvePreviewScale: "comfortable",
      snippetDisplayMode: "nodegraph",
    },
  },
  {
    id: "reference",
    label: "Reference",
    description: "Denser navigation with fuller preview context.",
    settings: {
      ...DEFAULT_SETTINGS,
      showDifficultyTags: true,
      compactTree: true,
      showProgressBar: true,
      showTocByDefault: true,
      showFolderCount: true,
      showStickyHeader: true,
      showRelatedDocs: true,
      autoOpenFirstSearchResult: true,
      curvePreviewDetail: "standard",
      curvePreviewScale: "comfortable",
      snippetDisplayMode: "both",
    },
  },
];

const DOCS_SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof DocsSettings>;

function matchesDocsSettingsPreset(current: DocsSettings, preset: DocsSettings): boolean {
  return DOCS_SETTINGS_KEYS.every((key) => current[key] === preset[key]);
}

function formatDocsCurveValue(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(3);
}

function loadSettings(): DocsSettings {
  try {
    const raw = localStorage.getItem("tn-docs-settings");
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DocsSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Import all markdown docs under src/docs
// Note: Vite now prefers `query: '?raw'` rather than `as: 'raw'`.
const docsModules = import.meta.glob("../../docs/**/*.md", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

type DocEntry = {
  slug: string;
  title: string;
  path: string;
  loader: () => Promise<string>;
};

type FolderNode = { type: "folder"; title: string; slug: string; children: DocTreeNodeData[] };
type FileNode = { type: "file"; title: string; slug: string; tags?: string[] };

type DocTreeNodeData = FolderNode | FileNode;

/** Derive display tags from a slug — difficulty level + content type hints */
function tagsFromSlug(slug: string): string[] {
  const tags: string[] = [];
  const name = slug.split("/").pop() ?? "";
  if (name.includes("experimental"))                                                        tags.push("experimental");
  else if (name.includes("expert"))                                                         tags.push("expert");
  else if (name.includes("advanced") || name.includes("sculpting") || name.includes("composition")) tags.push("advanced");
  else if (name.includes("terrain-types") || name.includes("node-combinations") ||
           name.includes("multi-biome")   || name.includes("terrain-and-caves")  ||
           name.includes("biome-system")  || name.includes("terrain-math")       ||
           name.includes("curves-explained") || name.includes("materials-guide") ||
           name.includes("props-and-placement") || name.includes("periodic"))              tags.push("intermediate");
  else if (name.includes("basic") || name.includes("data-flow") ||
           name.includes("create-a-world") || name.includes("setup") ||
           name.includes("understanding"))                                                  tags.push("basic");
  return tags;
}

function slugFromPath(path: string) {
  // Vite returns paths like "../docs/overview.md" or "../../docs/guides/foo.md"
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/docs\/(.*)\.md$/);
  return match ? match[1] : normalized;
}

const SLUG_TITLE_OVERRIDES: Record<string, string> = {
  // Glossary
  "glossary/asset-node-editor-nodes":                        "Node Editor Nodes",
  "glossary/in-game-commands":                               "In-Game Commands",
  // Guides — sub-folder display names
  "guides/terrain":                                          "Terrain",
  "guides/world":                                            "World Building",
  "guides/content":                                          "Content",
  // Guides root
  "guides/setup-data-flow-first-steps":                      "Data Flow & First Steps",
  "guides/understanding-basic-terrain-generation":           "Basic Terrain Generation",
  // Guides/terrain
  "guides/terrain/terrain-types":                            "Terrain Types",
  "guides/terrain/terrain-types-advanced":                   "Complex Terrain",
  "guides/terrain/terrain-types-expert":                     "Expert Terrain",
  "guides/terrain/terrain-sculpting-advanced":               "Terrain Sculpting",
  "guides/terrain/terrain-composition-expert":               "Terrain Composition",
  "guides/terrain/terrain-experimental":                     "Experimental Terrain",
  "guides/terrain/terrain-math-explained":                   "Terrain Math",
  // Guides/world
  "guides/world/biome-system":                               "Biome System",
  "guides/world/node-combinations":                          "Node Combinations",
  "guides/world/curves-explained":                           "Curves Explained",
  "guides/world/environments-and-weather":                   "Environments & Weather",
  // Guides/content
  "guides/content/materials-guide":                          "Materials Guide",
  "guides/content/props-and-placement":                      "Props & Placement",
  // Walkthroughs
  "walkthroughs/quickstart":                                 "Quickstart",
  "walkthroughs/data-flow-first-steps":                      "Data Flow & First Steps",
  "walkthroughs/basic-terrain-generation":                   "Basic Terrain Generation",
  "walkthroughs/create-a-world":                             "Create a World",
  "walkthroughs/sky-islands":                                "Sky Islands Walkthrough",
  "walkthroughs/terrain-and-caves":                          "Terrain & Caves",
  "walkthroughs/multi-biome-world":                          "Multi-Biome World",
  "walkthroughs/periodic-density-stripes":                   "Density Stripes",
  // Reference
  "reference/terrain-types":                                 "Terrain Snippets",
  "reference/reading-the-graph":                             "Reading the Graph",
  "reference/node-effects":                                  "Node Effects",
  "reference/curves":                                        "Curves Reference",
  "reference/exporting":                                     "Exporting",
};

function titleFromSlug(slug: string) {
  if (SLUG_TITLE_OVERRIDES[slug]) return SLUG_TITLE_OVERRIDES[slug];

  const parts = slug.split("/");
  let name = parts.pop() ?? slug;

  // Treat README/index-style pages as the folder title
  if (/^(readme|index)$/i.test(name) && parts.length > 0) {
    name = parts[parts.length - 1];
  }

  // Use a simple title case conversion for file names
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROOT_SECTION_ORDER = [
  { key: "overview", title: "Overview", slug: "overview" },
  { key: "getting-started", title: "Getting Started", slug: "getting-started" },
  { key: "walkthroughs", title: "Walkthroughs", slug: "walkthroughs" },
  { key: "guides", title: "Guides", slug: "guides" },
  { key: "glossary", title: "Glossary", slug: "glossary" },
  { key: "reference", title: "Reference", slug: "reference" },
  { key: "troubleshooting", title: "Troubleshooting", slug: "troubleshooting" },
  { key: "contributing", title: "Contributing", slug: "contributing" },
];

const SECTION_ICONS: Record<string, LucideIcon> = {
  overview:          BookOpen,
  "getting-started": Compass,
  walkthroughs:    MapIcon,
  guides:          GraduationCap,
  glossary:        Library,
  reference:       ScrollText,
  troubleshooting: Wrench,
  contributing:    GitPullRequest,
};

/** Returns [{label, slug}] segments for a slug like "guides/node-combinations" */
function breadcrumbsFromSlug(slug: string): Array<{ label: string; slug: string }> {
  const parts = slug.split("/");
  // Strip README/index from the last segment for display
  if (/^(readme|index)$/i.test(parts[parts.length - 1]) && parts.length > 1) {
    parts.pop();
  }
  const crumbs: Array<{ label: string; slug: string }> = [];
  for (let i = 0; i < parts.length; i++) {
    const crumbSlug = parts.slice(0, i + 1).join("/");
    const section = ROOT_SECTION_ORDER.find((s) => s.key === parts[0]);
    const label = i === 0
      ? (section?.title ?? titleFromSlug(parts[0]))
      : titleFromSlug(parts[i]);
    crumbs.push({ label, slug: crumbSlug });
  }
  return crumbs;
}

type TocEntry = { id: string; text: string; level: number };

/** Extract h2 and h3 headings from raw markdown for the on-page TOC. */
function parseToc(md: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();
  const headingRe = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(md))) {
    const level = match[1].length;
    // Strip inline markdown: backtick code, bold/italic markers, links
    const text = match[2].trim()
      .replace(/`[^`]*`/g, (m) => m.slice(1, -1))
      .replace(/[*_]+([^*_]+)[*_]+/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // github-slugger: lowercase, replace spaces with -, strip non-alphanumeric except - and spaces
    const base = text.toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const count = seen.get(base) ?? 0;
    const id = count === 0 ? base : `${base}-${count}`;
    seen.set(base, count + 1);
    entries.push({ id, text: match[2].trim(), level });
  }
  return entries;
}

function buildDocTree(entries: DocEntry[]): DocTreeNodeData[] {
  const DIFFICULTY_ORDER: Record<string, number> = {
    basic: 0, intermediate: 1, advanced: 2, expert: 3, experimental: 4,
  };
  function difficultyRank(node: DocTreeNodeData): number {
    if (node.type !== "file") return -1;
    const tag = (node.tags ?? []).find((t) => t in DIFFICULTY_ORDER);
    return tag !== undefined ? DIFFICULTY_ORDER[tag] : -1;
  }
  function sortRecursive(nodes: DocTreeNodeData[]): DocTreeNodeData[] {
    return [...nodes]
      .sort((a, b) => {
        // Folders sort before files (alphabetically within each group)
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        if (a.type === "file" && b.type === "file") {
          const da = difficultyRank(a), db = difficultyRank(b);
          if (da !== -1 || db !== -1) {
            if (da === -1) return 1;
            if (db === -1) return -1;
            return da - db;
          }
        }
        return 0;
      })
      .map((n) => n.type === "folder" ? { ...n, children: sortRecursive(n.children) } : n);
  }

  /** Recursively insert an entry under parentFolder, using remainingParts to navigate/create sub-folders. */
  function insertIntoFolder(parentFolder: FolderNode, remainingParts: string[], entry: DocEntry): void {
    if (remainingParts.length === 1) {
      parentFolder.children.push({
        type: "file",
        title: SLUG_TITLE_OVERRIDES[entry.slug] ?? titleFromSlug(remainingParts[0]),
        slug: entry.slug,
        tags: tagsFromSlug(entry.slug),
      });
      return;
    }
    const [head, ...tail] = remainingParts;
    const childSlug = parentFolder.slug + "/" + head;
    let subfolder = parentFolder.children.find(
      (c): c is FolderNode => c.type === "folder" && c.slug === childSlug,
    );
    if (!subfolder) {
      subfolder = {
        type: "folder",
        title: SLUG_TITLE_OVERRIDES[childSlug] ?? titleFromSlug(head),
        slug: childSlug,
        children: [],
      };
      parentFolder.children.push(subfolder);
    }
    insertIntoFolder(subfolder, tail, entry);
  }

  const sectionMap = new Map<string, FolderNode>();
  const sections: FolderNode[] = ROOT_SECTION_ORDER.map((section) => {
    const folder: FolderNode = { type: "folder", title: section.title, slug: section.slug, children: [] };
    sectionMap.set(section.key, folder);
    return folder;
  });
  const otherSection: FolderNode = { type: "folder", title: "Other", slug: "other", children: [] };

  for (const entry of entries) {
    const parts = entry.slug.split("/");
    const sectionKey = parts[0];
    const section = sectionMap.get(sectionKey) ?? otherSection;
    if (parts.length === 1) {
      // Top-level file (overview, troubleshooting, etc.)
      section.children.push({ type: "file", title: entry.title, slug: entry.slug, tags: tagsFromSlug(entry.slug) });
    } else {
      insertIntoFolder(section, parts.slice(1), entry);
    }
  }

  // Build final tree: collapse single-file sections, strip README nodes from folder display
  const result: DocTreeNodeData[] = [];
  for (const section of sections) {
    if (section.children.length === 0) continue;
    const meaningful = section.children.filter((child) =>
      child.type !== "file" || !/\/(readme|index)$/i.test(child.slug),
    );
    if (meaningful.length === 0) {
      const only = section.children[0];
      result.push({ type: "file", title: section.title, slug: only.slug });
    } else if (meaningful.length === 1 && section.children.length === 1) {
      result.push({ type: "file", title: section.title, slug: meaningful[0].slug });
    } else {
      result.push({ ...section, children: sortRecursive(meaningful) });
    }
  }
  if (otherSection.children.length > 0) result.push(otherSection);
  return result;
}

const TAG_STYLES: Record<string, { label: string; className: string }> = {
  basic:        { label: "basic",        className: "text-green-400 border-green-400/30 bg-green-400/10" },
  intermediate: { label: "intermediate", className: "text-sky-400 border-sky-400/30 bg-sky-400/10" },
  advanced:     { label: "advanced",     className: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  expert:       { label: "expert",       className: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  experimental: { label: "⚗",           className: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
};

const DocTreeNodeItem = memo(function DocTreeNodeItem({
  node,
  selectedSlug,
  onSelect,
  onResolveFolderSlug,
  collapsed,
  onToggleCollapse,
  activeItemRef,
  settings = DEFAULT_SETTINGS,
  depth = 0,
}: {
  node: DocTreeNodeData;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  onResolveFolderSlug: (folderSlug: string) => string | null;
  collapsed: Record<string, boolean>;
  onToggleCollapse: (slug: string) => void;
  activeItemRef: React.RefObject<HTMLButtonElement | null>;
  settings?: DocsSettings;
  depth?: number;
}) {
  const indent = depth * 16;
  const basePadding = 10;
  const isCollapsed = node.type === "folder" && collapsed[node.slug];

  if (node.type === "file") {
    const isSelected = selectedSlug === node.slug;
    const sectionKey = node.slug.split("/")[0];
    const Icon = depth === 0 ? (SECTION_ICONS[sectionKey] ?? FileText) : FileText;
    const isTopLevel = depth === 0;
    const tags = node.tags ?? [];
    const compact = settings.compactTree;
    return (
      <button
        ref={isSelected ? (el) => { (activeItemRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
        type="button"
        data-depth={depth}
        className={`docs-file docs-file-button flex w-full items-center gap-2 rounded-r-xl text-left border-l-2 transition-colors ${
          isTopLevel ? `${compact ? "py-1" : "py-2"} text-sm font-semibold` : `${compact ? "py-0.5" : "py-1.5"} text-[13px]`
        } ${
          isSelected
            ? "border-tn-accent bg-tn-accent/18 text-tn-text shadow-[inset_0_0_0_1px_rgba(181,147,80,0.12)]"
            : "border-transparent text-tn-text-muted hover:bg-tn-accent/8 hover:text-tn-text"
        }`}
        style={{ paddingLeft: `${indent + basePadding}px`, paddingRight: "12px" }}
        onClick={() => onSelect(node.slug)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate min-w-0">{node.title}</span>
        {settings.showDifficultyTags && tags.map((tag) => {
          const style = TAG_STYLES[tag];
          if (!style) return null;
          return (
            <span
              key={tag}
              className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide border rounded px-1 py-px leading-tight ${style.className}`}
            >
              {style.label}
            </span>
          );
        })}
      </button>
    );
  }

  const FolderIcon = SECTION_ICONS[node.slug] ?? Folder;
  const defaultFolderSlug = onResolveFolderSlug(node.slug);
  const isFolderSelected = defaultFolderSlug !== null && selectedSlug === defaultFolderSlug;
  const childCount = node.children.length;
  const compact = settings.compactTree;
  return (
    <div className="docs-folder mt-0.5" data-depth={depth}>
      <button
        ref={isFolderSelected ? (el) => { (activeItemRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
        type="button"
        data-depth={depth}
        className={`docs-folder-button flex w-full items-center gap-2 rounded-r-xl ${compact ? "py-1" : "py-2"} pr-3 text-sm font-semibold border-l-2 ${
          isFolderSelected
            ? "border-tn-accent bg-tn-accent/18 text-tn-text shadow-[inset_0_0_0_1px_rgba(181,147,80,0.12)]"
            : `border-transparent ${isCollapsed ? "text-tn-text-muted" : "text-tn-text"}`
        } hover:bg-tn-accent/8 focus:outline-none focus:ring-2 focus:ring-tn-accent/40`}
        style={{ paddingLeft: `${indent + basePadding}px` }}
        onClick={() => {
          onToggleCollapse(node.slug);
          if (defaultFolderSlug) onSelect(defaultFolderSlug);
        }}
        aria-expanded={!isCollapsed}
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{node.title}</span>
        {isCollapsed && settings.showFolderCount && (
          <span className="mr-0.5 shrink-0 rounded-full border border-tn-border/70 bg-tn-bg/70 px-1.5 py-px text-[10px] tabular-nums text-tn-text-muted">{childCount}</span>
        )}
        {isCollapsed
          ? <ChevronRight className="h-3 w-3 text-tn-text-muted shrink-0" />
          : <ChevronDown className="h-3 w-3 text-tn-text-muted shrink-0" />
        }
      </button>
      {!isCollapsed && (
        <div className="docs-tree-children ml-3 border-l border-tn-border/55 pb-1 pl-1.5">
          {node.children.map((child) => (
            <DocTreeNodeItem
              key={`${child.type}-${child.slug}`}
              node={child}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
              onResolveFolderSlug={onResolveFolderSlug}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              activeItemRef={activeItemRef}
              settings={settings}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      type="button"
      className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded border border-tn-border bg-tn-panel/80 text-tn-text-muted hover:text-tn-text hover:bg-tn-accent/10 opacity-20 group-hover:opacity-100 transition-opacity focus:opacity-100"
      title="Copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function HeadingAnchor({
  id,
  size,
  selectedSlug,
  contentRef,
}: {
  id: string;
  size: "h2" | "h3";
  selectedSlug: string | null;
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Scroll to heading
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Copy a docs-relative deep link for the current heading.
    const headingLink = selectedSlug ? `/${selectedSlug}#${id}` : `#${id}`;
    navigator.clipboard.writeText(headingLink).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [id, contentRef, selectedSlug]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copy link to heading"
      className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-tn-text-muted hover:text-tn-accent ${size === "h2" ? "ml-1" : "ml-0.5"}`}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1 }}
    >
      {copied
        ? <Check className={size === "h2" ? "h-4 w-4 text-green-400" : "h-3.5 w-3.5 text-green-400"} />
        : <Hash className={size === "h2" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      }
    </button>
  );
}

function ActionPillButton({
  label,
  onClick,
  title,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-md border border-tn-border/80 bg-tn-bg/85 px-2.5 py-1 text-[10px] font-medium text-tn-text-muted transition-colors hover:border-tn-accent/70 hover:bg-tn-accent/10 hover:text-tn-text disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

type ResolvedLink = { slug: string; anchor?: string } | null;

function resolveLinkSlug(currentSlug: string, href: string): ResolvedLink {
  if (!href || href.startsWith("http") || href.startsWith("mailto:")) return null;

  // Anchor within the same page
  if (href.startsWith("#")) {
    return { slug: currentSlug, anchor: href.slice(1) };
  }

  // Strip leading slashes (treat as root-relative within docs)
  let normalizedHref = href.replace(/^\//, "");
  // Allow links that include the docs folder (e.g. docs/tutorials/...) to work too.
  normalizedHref = normalizedHref.replace(/^docs\//, "");

  // Relative path
  const baseParts = currentSlug.split("/");
  baseParts.pop();
  const [pathPart, anchorPart] = normalizedHref.split("#", 2);
  const parts = pathPart.split("/");
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  let resolved = baseParts.join("/");
  // Normalize .md extension if provided
  if (resolved.endsWith(".md")) {
    resolved = resolved.slice(0, -3);
  }

  return { slug: resolved, anchor: anchorPart };
}

function RelatedDocs({
  selectedSlug,
  outboundLinks,
  backlinks,
  entries,
  loadDoc,
}: {
  selectedSlug: string;
  outboundLinks: Record<string, string[]>;
  backlinks: Record<string, string[]>;
  entries: DocEntry[];
  loadDoc: (slug: string) => void;
}) {
  const validOutbound = outboundLinks[selectedSlug]?.filter((slug) => entries.some((e) => e.slug === slug)) ?? [];
  const refs = backlinks[selectedSlug] ?? [];
  if (validOutbound.length === 0 && refs.length === 0) return null;
  return (
    <div className="mt-6 border-t border-tn-border pt-4 space-y-4">
      {validOutbound.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-tn-text-muted uppercase tracking-wide mb-2">See also</div>
          <div className="flex flex-wrap gap-2">
            {validOutbound.map((slug) => (
              <button
                key={slug}
                type="button"
                className="px-2.5 py-1 rounded border border-tn-border text-xs text-tn-text-muted hover:text-tn-text hover:border-tn-accent hover:bg-tn-accent/10 transition-colors"
                onClick={() => loadDoc(slug)}
              >
                {titleFromSlug(slug)}
              </button>
            ))}
          </div>
        </div>
      )}
      {refs.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-tn-text-muted uppercase tracking-wide mb-2">Referenced by</div>
          <div className="flex flex-wrap gap-2">
            {refs.map((ref) => (
              <button
                key={ref}
                type="button"
                className="px-2.5 py-1 rounded border border-tn-border text-xs text-tn-text-muted hover:text-tn-text hover:border-tn-accent hover:bg-tn-accent/10 transition-colors"
                onClick={() => loadDoc(ref)}
              >
                {titleFromSlug(ref)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrevNextNav({
  selectedSlug,
  entries,
  loadDoc,
}: {
  selectedSlug: string;
  entries: DocEntry[];
  loadDoc: (slug: string) => void;
}) {
  // Use section-ordered slugs matching ROOT_SECTION_ORDER, filtering out templates
  const orderedSlugs = useMemo(() => {
    const sectionOrder = ROOT_SECTION_ORDER.map((s) => s.key);
    return [...entries].sort((a, b) => {
      const sA = sectionOrder.indexOf(a.slug.split("/")[0]);
      const sB = sectionOrder.indexOf(b.slug.split("/")[0]);
      if (sA !== sB) return (sA === -1 ? 999 : sA) - (sB === -1 ? 999 : sB);
      return a.slug.localeCompare(b.slug);
    }).filter((e) => !e.slug.startsWith("templates/"));
  }, [entries]);

  const idx = orderedSlugs.findIndex((e) => e.slug === selectedSlug);
  if (idx === -1) return null;
  const prev = idx > 0 ? orderedSlugs[idx - 1] : null;
  const next = idx < orderedSlugs.length - 1 ? orderedSlugs[idx + 1] : null;
  if (!prev && !next) return null;

  return (
    <div className="mt-8 flex items-stretch gap-3 border-t border-tn-border pt-5">
      {prev ? (
        <button
          type="button"
          className="flex flex-1 flex-col items-start gap-0.5 rounded-lg border border-tn-border px-4 py-3 text-left transition-colors hover:border-tn-accent/60 hover:bg-tn-accent/5"
          onClick={() => loadDoc(prev.slug)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Previous
          </span>
          <span className="text-sm font-medium text-tn-text">{prev.title}</span>
        </button>
      ) : <div className="flex-1" />}
      {next ? (
        <button
          type="button"
          className="flex flex-1 flex-col items-end gap-0.5 rounded-lg border border-tn-border px-4 py-3 text-right transition-colors hover:border-tn-accent/60 hover:bg-tn-accent/5"
          onClick={() => loadDoc(next.slug)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted flex items-center gap-1">
            Next <ChevronRight className="h-3 w-3" />
          </span>
          <span className="text-sm font-medium text-tn-text">{next.title}</span>
        </button>
      ) : <div className="flex-1" />}
    </div>
  );
}

function DocToc({ entries, contentRef, defaultOpen = true }: { entries: TocEntry[]; contentRef: React.RefObject<HTMLDivElement | null>; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeId, setActiveId] = useState<string>("");

  // Reset open state when entries change (new doc loaded)
  useEffect(() => {
    setOpen(defaultOpen);
    setActiveId("");
  }, [entries, defaultOpen]);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const headingEls = entries
      .map(({ id }) => contentEl.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter((o) => o.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { root: contentEl, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries, contentRef]);

  if (entries.length < 2) return null;

  return (
    <div className="mb-5 rounded border border-tn-border bg-tn-panel/60">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-tn-text-muted uppercase tracking-wide hover:text-tn-text focus:outline-none"
        onClick={() => setOpen((v) => !v)}
      >
        <List className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">On this page</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="pb-2 border-t border-tn-border">
          {entries.map(({ id, text, level }) => (
            <button
              key={id}
              type="button"
              className={`flex w-full items-center gap-1.5 px-3 py-1 text-left transition-colors ${
                level === 3 ? "pl-6 text-[12px]" : "text-[13px]"
              } ${
                activeId === id
                  ? "text-tn-accent"
                  : "text-tn-text-muted hover:text-tn-text"
              }`}
              onClick={() => {
                const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span className="truncate">{text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted mb-1.5">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SettingsToggle({
  label, description, value, onChange,
}: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="flex items-start gap-2.5 cursor-pointer group"
      onClick={() => onChange(!value)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!value); } }}
    >
      <div
        role="switch"
        aria-checked={value}
        className={`mt-0.5 w-8 h-4 rounded-full shrink-0 transition-colors relative ${value ? "bg-tn-accent" : "bg-tn-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0"}`}
        />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-tn-text leading-tight">{label}</div>
        <div className="text-[10px] text-tn-text-muted leading-tight mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function SettingsSelect<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="min-w-0">
        <div className="text-[12px] font-medium leading-tight text-tn-text">{label}</div>
        <div className="mt-0.5 text-[10px] leading-tight text-tn-text-muted">{description}</div>
      </div>
      <select
        className="rounded border border-tn-border bg-tn-bg px-2 py-1 text-xs text-tn-text focus:outline-none focus:border-tn-accent"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Reading time ─────────────────────────────────────────────────────────────
function estimateReadingTime(md: string): number {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── DOM text highlighter ──────────────────────────────────────────────────────
/**
 * Wraps all occurrences of `term` inside text nodes within `root` with <mark>
 * elements. Existing marks are cleared first. Returns the total match count.
 */
function applyTextHighlight(root: HTMLElement, term: string): number {
  // Clear previous marks
  root.querySelectorAll("mark.docs-highlight").forEach((m) => {
    const parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
      parent.normalize();
    }
  });

  if (!term) return 0;

  const lower = term.toLowerCase();
  let count = 0;

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const idx = text.toLowerCase().indexOf(lower);
      if (idx === -1) return;
      const before = document.createTextNode(text.slice(0, idx));
      const mark = document.createElement("mark");
      mark.className = "docs-highlight";
      mark.textContent = text.slice(idx, idx + term.length);
      const after = document.createTextNode(text.slice(idx + term.length));
      const parent = node.parentNode!;
      parent.insertBefore(before, node);
      parent.insertBefore(mark, node);
      parent.insertBefore(after, node);
      parent.removeChild(node);
      count++;
      // Continue searching `after` for multiple matches on same text node
      walk(after);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !["SCRIPT", "STYLE", "CODE", "PRE", "MARK"].includes((node as Element).tagName)
    ) {
      Array.from(node.childNodes).forEach(walk);
    }
  };

  walk(root);
  return count;
}

// ── Walkthrough progress persistence ─────────────────────────────────────────
const WT_PROGRESS_KEY = "tn-docs-wt-progress";

function loadWalkthroughProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(WT_PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveWalkthroughProgress(slug: string, step: number) {
  try {
    const current = loadWalkthroughProgress();
    current[slug] = step;
    localStorage.setItem(WT_PROGRESS_KEY, JSON.stringify(current));
  } catch { /* ignore */ }
}

export function DocsPanel() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);
  const navIndexRef = useRef(-1);
  const setNavIndexBoth = useCallback((i: number) => {
    navIndexRef.current = i;
    setNavIndex(i);
  }, []);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [docIndex, setDocIndex] = useState<Record<string, string>>({});
  const [backlinks, setBacklinks] = useState<Record<string, string[]>>({});
  const [outboundLinks, setOutboundLinks] = useState<Record<string, string[]>>({});
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("tn-docs-collapsed");
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [walkthroughSteps, setWalkthroughSteps] = useState<Array<{ title: string; content: string }>>([]);
  const [walkthroughShowFull, setWalkthroughShowFull] = useState(false);
  const [isExperimental, setIsExperimental] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("tn-docs-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [settings, setSettings] = useState<DocsSettings>(() => loadSettings() ?? DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  // In-doc find bar
  const [findQuery, setFindQuery] = useState("");
  const [findActive, setFindActive] = useState(false);
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [findMatchIndex, setFindMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  // Search-to-doc highlight: term that should be highlighted after a search-driven nav
  const pendingHighlightRef = useRef<string>("");
  // Per-doc scroll position memory: slug → scrollTop
  const scrollMemoryRef = useRef<Record<string, number>>({});
  const prevSlugRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const walkthroughShellRef = useRef<HTMLDivElement | null>(null);
  const searchCursorRef = useRef(-1);
  // Keep a ref in sync with selectedSlug so mdComponents/handleLinkClick don't recreate on every nav
  const selectedSlugRef = useRef<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);

  const writeTextToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const entries = useMemo<DocEntry[]>(() => {
    const list: DocEntry[] = [];
    for (const [path, loader] of Object.entries(docsModules)) {
      const slug = slugFromPath(path);
      if (slug.startsWith("templates/")) continue;
      const title = titleFromSlug(slug);
      list.push({ slug, title, path, loader });
    }
    return list.sort((a, b) => a.slug.localeCompare(b.slug));
  }, []);
  const entriesBySlug = useMemo(() => new Map(entries.map((entry) => [entry.slug, entry])), [entries]);

  const allDocSlugs = useMemo(() => entries.map((entry) => entry.slug), [entries]);
  const resolveFolderSlug = useCallback(
    (folderSlug: string) => getDefaultDocSlug(folderSlug, allDocSlugs),
    [allDocSlugs],
  );
  const shouldWrapCodeBlocks = settings.wrapCodeBlocks;
  const showCurveStats = settings.curvePreviewDetail === "standard";
  const comfortableCurvePreview = settings.curvePreviewScale === "comfortable";
  const docsCurveHeight = showCurveStats
    ? (comfortableCurvePreview ? 128 : 112)
    : (comfortableCurvePreview ? 110 : 96);
  const docsCurveWidthClass = showCurveStats
    ? (comfortableCurvePreview ? "max-w-[560px]" : "max-w-[480px]")
    : (comfortableCurvePreview ? "max-w-[520px]" : "max-w-[440px]");
  const snippetDisplayMode = settings.snippetDisplayMode;

  const docTree = useMemo(() => buildDocTree(entries), [entries]);
  const tocEntries = useMemo(() => parseToc(rawMd), [rawMd]);
  const normalizedFilter = deferredFilter.trim();

  const toggleSidebarCollapsed = useCallback(
    (next?: boolean) => {
      setSidebarCollapsed((current) => (typeof next === "boolean" ? next : !current));
    },
    [],
  );

  const toggleFolderCollapsed = useCallback(
    (slug: string) => setCollapsedFolders((prev) => ({ ...prev, [slug]: !prev[slug] })),
    [],
  );

  const filtered = useMemo(() => {
    if (!normalizedFilter) return entries;
    const lower = normalizedFilter.toLowerCase();

    return entries.filter((entry) => {
      const text = docIndex[entry.slug] ?? "";
      return (
        entry.title.toLowerCase().includes(lower) ||
        entry.slug.toLowerCase().includes(lower) ||
        text.toLowerCase().includes(lower)
      );
    });
  }, [docIndex, entries, normalizedFilter]);

  const filteredTree = useMemo(() => {
    if (!normalizedFilter) return docTree;
    const allowed = new Set(filtered.map((e) => e.slug));
    return filterDocTree(docTree, allowed) as DocTreeNodeData[];
  }, [docTree, filtered, normalizedFilter]);

  const scrollToAnchor = useCallback((anchor: string) => {
    setTimeout(() => {
      const el = contentRef.current?.querySelector(`#${CSS.escape(anchor)}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const loadDoc = useCallback(
    async (slug: string, anchor?: string, pushHistory = true, fromSearch?: string) => {
      const entry = entriesBySlug.get(slug);
      if (!entry) return;
      let text: string;
      try {
        text = await entry.loader();
      } catch {
        setRawMd(`> **Error:** Could not load \`${slug}\`. The file may be missing or unreadable.`);
        selectedSlugRef.current = slug;
        setSelectedSlug(slug);
        return;
      }

      // Save scroll position of the doc we're leaving
      if (prevSlugRef.current && contentRef.current && prevSlugRef.current !== slug) {
        scrollMemoryRef.current[prevSlugRef.current] = contentRef.current.scrollTop;
      }

      // Strip HTML comments (e.g. <!-- walkthrough -->) before rendering
      const cleaned = stripDocComments(text);
      setRawMd(cleaned);
      selectedSlugRef.current = slug;
      setSelectedSlug(slug);
      prevSlugRef.current = slug;

      // Persist last-read slug
      try { localStorage.setItem("tn-docs-last-slug", slug); } catch { /* ignore */ }

      // Push to nav history (truncate forward stack)
      if (pushHistory) {
        const newIndex = navIndexRef.current + 1;
        setNavHistory((prev) => {
          const next = prev.slice(0, newIndex);
          next.push(slug);
          return next;
        });
        setNavIndexBoth(newIndex);
      }

      // Detect experimental flag
      setIsExperimental(text.includes("<!-- experimental -->"));

      const steps = extractWalkthroughSteps(text);
      setWalkthroughSteps(steps);
      if (steps.length > 0) {
        const savedStep = loadWalkthroughProgress()[slug] ?? 0;
        setWalkthroughStep(Math.min(savedStep, steps.length - 1));
      } else {
        setWalkthroughStep(0);
        setWalkthroughActive(false);
      }
      setWalkthroughShowFull(false);

      // Store search term to highlight after render
      pendingHighlightRef.current = fromSearch ?? "";
      // Reset find bar
      setFindActive(false);
      setFindQuery("");
      setFindMatchCount(0);
      setFindMatchIndex(0);

      if (anchor) {
        scrollToAnchor(anchor);
      } else {
        // Restore saved scroll position for this doc (if any), otherwise reset to top
        const savedScroll = scrollMemoryRef.current[slug] ?? 0;
        setTimeout(() => {
          if (contentRef.current) contentRef.current.scrollTop = savedScroll;
        }, 20);
      }
    },
    [entriesBySlug, scrollToAnchor, setNavIndexBoth],
  );

  const handleCopySnippetJson = useCallback(async (snippetJson: string, label?: string) => {
    const copied = await writeTextToClipboard(snippetJson);
    addToast(
      copied
        ? `${label ?? "Snippet"} JSON copied`
        : `Could not copy ${label ?? "snippet"} JSON`,
      copied ? "success" : "error",
    );
  }, [addToast, writeTextToClipboard]);

  const handleCopySnippetGraph = useCallback(async (snippetJson: string, label?: string) => {
    try {
      const graphData = buildSnippetGraphData(snippetJson);
      useEditorStore.setState({ _clipboardData: graphData.clipboardData });
      const copied = await writeTextToClipboard(JSON.stringify(graphData.clipboardData));
      addToast(
        copied
          ? `${label ?? "Terrain graph"} copied. Paste it into the canvas with Ctrl+V.`
          : `${label ?? "Terrain graph"} saved to TerraNova clipboard. Paste it into the canvas with Ctrl+V.`,
        "success",
      );
    } catch (error) {
      addToast(
        `Could not build a graph from this snippet: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  }, [addToast, writeTextToClipboard]);

  const handleCopyNodeGraphBlock = useCallback(async (
    graph: string | Parameters<typeof buildDocNodeGraphMarkdownBlock>[0],
    label?: string,
  ) => {
    const clipboardData = typeof graph === "object" && graph !== null && "clipboardData" in graph
      ? (graph as { clipboardData?: unknown }).clipboardData
      : null;
    if (
      clipboardData &&
      typeof clipboardData === "object" &&
      (clipboardData as { version?: unknown }).version === "1"
    ) {
      useEditorStore.setState({ _clipboardData: clipboardData as ClipboardData });
    }

    const copied = await writeTextToClipboard(buildDocNodeGraphMarkdownBlock(graph));
    addToast(
      clipboardData
        ? (
          copied
            ? `${label ?? "Node graph"} copied. Paste it into docs or the canvas with Ctrl+V.`
            : `${label ?? "Node graph"} saved to the TerraNova clipboard. Paste it into the canvas with Ctrl+V.`
        )
        : (
          copied
            ? `${label ?? "Node graph"} block copied. Paste it into docs to render the preview.`
            : `Could not copy ${label ?? "node graph"} block`
        ),
      copied ? "success" : "error",
    );
  }, [addToast, writeTextToClipboard]);

  const handleOpenSnippetInEditor = useCallback(async (snippetJson: string, label?: string) => {
    try {
      const editor = useEditorStore.getState();
      const context = editor.editingContext;

      if (context === "Biome") {
        if (!editor.biomeSections?.Terrain) {
          addToast("This biome does not have a Terrain graph section to replace.", "warning");
          return;
        }
        switchBiomeSection("Terrain");
      } else if (context !== null && context !== "Density") {
        addToast("Open a biome Terrain tab or a density graph before loading a terrain snippet.", "warning");
        return;
      }

      const graphData = buildSnippetGraphData(snippetJson);
      const flowDirection = useSettingsStore.getState().flowDirection;
      const layoutedNodes = await autoLayout(graphData.clipboardData.nodes, graphData.clipboardData.edges, flowDirection)
        .catch(() => graphData.clipboardData.nodes);

      const mutateAndCommit = getMutateAndCommit();
      mutateAndCommit((state) => ({
        nodes: layoutedNodes,
        edges: graphData.clipboardData.edges,
        outputNodeId: graphData.outputNodeId,
        selectedNodeId: graphData.outputNodeId,
        ...(state.editingContext === null
          ? {
              editingContext: "Density",
              originalWrapper: null,
              rawJsonContent: null,
              biomeSections: null,
              activeBiomeSection: null,
              biomeConfig: null,
              biomeRanges: [],
              noiseRangeConfig: null,
              settingsConfig: null,
              materialConfig: null,
              instanceConfig: null,
            }
          : {}),
      }), `Load ${label ?? "terrain snippet"}`);

      usePreviewStore.getState().setViewMode("graph");
      usePreviewStore.getState().setSelectedPreviewNodeId(graphData.outputNodeId);
      addToast(`${label ?? "Terrain snippet"} loaded into the editor`, "success");
    } catch (error) {
      addToast(
        `Could not load this snippet into the editor: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  }, [addToast, switchBiomeSection]);

  const navBack = useCallback(() => {
    const i = navIndexRef.current;
    if (i <= 0) return;
    const newIndex = i - 1;
    setNavIndexBoth(newIndex);
    loadDoc(navHistory[newIndex], undefined, false);
  }, [navHistory, loadDoc, setNavIndexBoth]);

  const navForward = useCallback(() => {
    const i = navIndexRef.current;
    if (i >= navHistory.length - 1) return;
    const newIndex = i + 1;
    setNavIndexBoth(newIndex);
    loadDoc(navHistory[newIndex], undefined, false);
  }, [navHistory, loadDoc, setNavIndexBoth]);

  // Load last-read or default doc on first render
  useEffect(() => {
    if (selectedSlug === null && entries.length > 0) {
      let target: string | undefined;
      try {
        const last = localStorage.getItem("tn-docs-last-slug");
        if (last && entries.some((e) => e.slug === last)) target = last;
      } catch { /* ignore */ }
      if (!target) {
        target = entries.find((e) => e.slug === "overview")?.slug ?? entries[0].slug;
      }
      loadDoc(target);
    }
  }, [selectedSlug, entries, loadDoc]);

  // Build full-text index + backlinks for quick search and related docs
  useEffect(() => {
    let cancelled = false;

    async function buildIndex() {
      const index: Record<string, string> = {};
      const inbound: Record<string, Set<string>> = {};
      const outbound: Record<string, Set<string>> = {};

      await Promise.all(
        entries.map(async (entry) => {
          const text = await entry.loader();
          if (cancelled) return;
          index[entry.slug] = text;

          const linkRegex = /\]\(([^)]+)\)/g;
          let match: RegExpExecArray | null;
          while ((match = linkRegex.exec(text))) {
            const href = match[1];
            const resolved = resolveLinkSlug(entry.slug, href);
            if (!resolved) continue;
            const targetSlug = resolved.slug;
            if (targetSlug === entry.slug) continue;
            if (!inbound[targetSlug]) inbound[targetSlug] = new Set();
            inbound[targetSlug].add(entry.slug);
            if (!outbound[entry.slug]) outbound[entry.slug] = new Set();
            outbound[entry.slug].add(targetSlug);
          }
        }),
      );

      if (cancelled) return;

      startTransition(() => {
        setDocIndex(index);
        setBacklinks(Object.fromEntries(Object.entries(inbound).map(([k, v]) => [k, Array.from(v)])));
        setOutboundLinks(Object.fromEntries(Object.entries(outbound).map(([k, v]) => [k, Array.from(v)])));
      });
    }

    buildIndex();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  // Persist folder collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("tn-docs-collapsed", JSON.stringify(collapsedFolders));
    } catch {
      // ignore
    }
  }, [collapsedFolders]);

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("tn-docs-sidebar-collapsed", sidebarCollapsed ? "true" : "false");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  // Reader-first collapse behavior: hiding the sidebar should preserve tree state
  // and move focus into the reading surface rather than the hidden menu.
  useEffect(() => {
    if (!sidebarCollapsed) return;

    setShowSettings(false);
    const frame = requestAnimationFrame(() => {
      contentRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [sidebarCollapsed]);

  // Persist docs settings
  useEffect(() => {
    try { localStorage.setItem("tn-docs-settings", JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  // Press / to focus search (when sidebar is visible and not already typing)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || sidebarCollapsed || showSettings) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarCollapsed, showSettings]);

  // Reading progress bar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setScrollProgress(0);
    setShowScrollTop(false);
    function onScroll() {
      const scrollable = el!.scrollHeight - el!.clientHeight;
      setScrollProgress(scrollable > 0 ? el!.scrollTop / scrollable : 0);
      setShowScrollTop(el!.scrollTop > 300);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedSlug]); // re-attach when doc changes so progress resets

  // Sidebar auto-scroll: keep active item visible
  useEffect(() => {
    const item = activeItemRef.current;
    const container = sidebarScrollRef.current;
    if (!item || !container) return;
    const itemRect = item.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [selectedSlug]);

  // Auto-expand all sidebar folders when a search is active; reset cursor
  useEffect(() => {
    if (normalizedFilter) {
      setCollapsedFolders({});
      searchCursorRef.current = -1;
    }
  }, [normalizedFilter]);

  // Auto-select first result when searching
  useEffect(() => {
    if (!normalizedFilter || !settings.autoOpenFirstSearchResult) return;
    const firstSlug = findFirstFileSlug(filteredTree);
    if (firstSlug && firstSlug !== selectedSlug) loadDoc(firstSlug, undefined, true, normalizedFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTree, normalizedFilter, selectedSlug, settings.autoOpenFirstSearchResult]);

  // Apply search-driven highlight to rendered doc after content changes
  useEffect(() => {
    const term = pendingHighlightRef.current;
    if (!term || !contentRef.current) return;
    // Small delay so ReactMarkdown has finished painting
    const id = setTimeout(() => {
      if (contentRef.current) applyTextHighlight(contentRef.current, term);
    }, 80);
    return () => clearTimeout(id);
  }, [rawMd]);

  // Apply/update find-bar highlights whenever findQuery or doc content changes
  useEffect(() => {
    if (!contentRef.current) return;
    if (!findActive || !findQuery) {
      applyTextHighlight(contentRef.current, "");
      setFindMatchCount(0);
      setFindMatchIndex(0);
      return;
    }
    const count = applyTextHighlight(contentRef.current, findQuery);
    setFindMatchCount(count);
    setFindMatchIndex(count > 0 ? 0 : -1);
    // Scroll first match into view
    const first = contentRef.current.querySelector("mark.docs-highlight");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [findQuery, findActive, rawMd]);

  // Persist walkthrough step progress whenever it changes
  useEffect(() => {
    if (!selectedSlug || walkthroughSteps.length === 0) return;
    saveWalkthroughProgress(selectedSlug, walkthroughStep);
  }, [selectedSlug, walkthroughStep, walkthroughSteps.length]);

  // Ctrl+F to open find bar when reading area is focused
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        const active = document.activeElement;
        // Only intercept when focus is inside the docs panel content area
        if (contentRef.current?.contains(active as Node) || active === document.body) {
          e.preventDefault();
          setFindActive(true);
          requestAnimationFrame(() => findInputRef.current?.focus());
        }
      }
      if (e.key === "Escape" && findActive) {
        setFindActive(false);
        setFindQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [findActive]);

  const navigateFindMatch = useCallback((direction: 1 | -1) => {
    if (!contentRef.current || findMatchCount === 0) return;
    const marks = Array.from(contentRef.current.querySelectorAll<HTMLElement>("mark.docs-highlight"));
    if (marks.length === 0) return;
    const next = ((findMatchIndex + direction) + marks.length) % marks.length;
    setFindMatchIndex(next);
    marks.forEach((m, i) => {
      m.classList.toggle("docs-highlight-active", i === next);
    });
    marks[next]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [findMatchCount, findMatchIndex]);

  const handleLinkClick = useCallback(
    (href: string) => {
      const slug = selectedSlugRef.current ?? "";
      const resolved = resolveLinkSlug(slug, href);
      if (!resolved) return false;

      const target = entriesBySlug.get(resolved.slug) ?? entriesBySlug.get(resolved.slug.replace(/\.md$/, ""));
      if (target) {
        if (target.slug === slug && resolved.anchor) {
          scrollToAnchor(resolved.anchor);
          return true;
        }
        loadDoc(target.slug, resolved.anchor);
        return true;
      }

      // If the link is an anchor within the same document, just scroll
      if (resolved.slug === slug && resolved.anchor) {
        scrollToAnchor(resolved.anchor);
        return true;
      }

      return false;
    },
    [entriesBySlug, loadDoc, scrollToAnchor],
  );

  const mdComponents = useMemo(() => ({
    a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
      const hrefStr = String(href ?? "");
      const isExternal = hrefStr.startsWith("http") || hrefStr.startsWith("mailto:");
      const currentSlug = selectedSlugRef.current ?? "";
      const resolved = !isExternal ? resolveLinkSlug(currentSlug, hrefStr) : null;
      const isInternal = resolved !== null && (
        entriesBySlug.has(resolved.slug) || entriesBySlug.has(resolved.slug.replace(/\.md$/, "")) ||
        (resolved.slug === currentSlug && !!resolved.anchor)
      );
      return (
        <a
          {...props}
          href={hrefStr}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          onClick={(e) => {
            if (!isExternal && handleLinkClick(hrefStr)) e.preventDefault();
          }}
          className={isInternal ? "text-tn-accent hover:underline" : "text-tn-text-muted hover:underline"}
        >
          {children}
        </a>
      );
    },
    img: ({ src, alt, ...props }: React.ComponentPropsWithoutRef<"img">) => {
      // Resolve relative image paths to /docs/ in public folder
      const srcStr = String(src ?? "");
      const resolved = srcStr.startsWith("http") || srcStr.startsWith("/")
        ? srcStr
        : `/docs/${srcStr.replace(/^\.\//, "")}`;
      return (
        <img
          {...props}
          src={resolved}
          alt={alt ?? ""}
          className="my-3 rounded border border-tn-border max-w-full"
          style={{ imageRendering: "auto" }}
        />
      );
    },
    pre: ({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) => {
      // Extract the inner code element to check language and get text for copy
      const codeEl = Array.isArray(children) ? children[0] : children;
      const codeProps = (codeEl as React.ReactElement<React.ComponentPropsWithoutRef<"code">>)?.props;
      const cls = String(codeProps?.className || "");
      const lang = /language-(\w+)/.exec(cls)?.[1];
      const value = String(codeProps?.children ?? "").replace(/\n$/, "");
      if (lang === "mermaid") return <div className="docs-wide-block"><MermaidDiagram code={value} /></div>;
      if (lang === "nodegraph") {
        const graph = parseNodeGraph(value);
        if (graph) {
          return (
            <div className="docs-wide-block my-4 overflow-hidden rounded-xl border border-tn-border shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
              <DocNodeGraph
                {...graph}
                headerAction={
                  <ActionPillButton
                    label="Copy Nodegraph"
                    onClick={() => { void handleCopyNodeGraphBlock(graph, "Node graph"); }}
                    title={"clipboardData" in graph ? "Copy a docs nodegraph block that also pastes into the canvas" : "Copy a paste-ready nodegraph markdown block"}
                  />
                }
              />
            </div>
          );
        }
      }
      // curve: fence — renders a read-only CurveCanvas with optional label
      // Format: first line (optional) = label, rest = JSON point array [[x,y],...]
      if (lang === "curve") {
        const lines = value.trim().split("\n");
        let label: string | undefined;
        let pointsJson = value.trim();
        // First line may be a label (if it doesn't start JSON), optionally followed by
        // a second metadata line: { "xLabel": "...", "yLabel": "..." }
        let xLabel = "Input x";
        let yLabel = "Output y";
        if (!lines[0].trim().startsWith("[") && !lines[0].trim().startsWith("{")) {
          label = lines[0].trim();
          // Check if second line is a metadata object (not the points array)
          const remaining = lines.slice(1).join("\n").trim();
          const secondLine = lines[1]?.trim();
          if (secondLine?.startsWith("{") && !secondLine.startsWith("[")) {
            try {
              const meta = JSON.parse(secondLine) as { xLabel?: string; yLabel?: string };
              if (meta.xLabel) xLabel = meta.xLabel;
              if (meta.yLabel) yLabel = meta.yLabel;
              pointsJson = lines.slice(2).join("\n").trim();
            } catch {
              pointsJson = remaining;
            }
          } else {
            pointsJson = remaining;
          }
        }
        try {
          const points = JSON.parse(pointsJson) as [number, number][];
          const xs = points.map((p) => p[0]);
          const ys = points.map((p) => p[1]);
          const xMin = Math.min(...xs), xMax = Math.max(...xs);
          const yMin = Math.min(...ys), yMax = Math.max(...ys);
          return (
            <div className="docs-wide-block my-4 overflow-hidden rounded-xl border border-tn-border bg-tn-panel/45 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
              {/* Header: label + compact range summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tn-border bg-tn-panel px-3 py-2">
                <span className="text-[11px] font-medium tracking-[0.03em] text-tn-text-muted">
                  {label ?? "Curve"}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-tn-text-muted/75">
                  <span className="inline-flex items-center gap-1 rounded-full border border-tn-border/80 bg-tn-bg/70 px-2 py-0.5">
                    <span className="font-semibold text-tn-text-muted/80">{xLabel}</span>
                    <span className="font-mono text-tn-text-muted">{formatDocsCurveValue(xMin)} to {formatDocsCurveValue(xMax)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-tn-border/80 bg-tn-bg/70 px-2 py-0.5">
                    <span className="font-semibold text-tn-text-muted/80">{yLabel}</span>
                    <span className="font-mono text-tn-text-muted">{formatDocsCurveValue(yMin)} to {formatDocsCurveValue(yMax)}</span>
                  </span>
                </div>
                <span aria-hidden="true" className="hidden font-mono text-[10px] text-tn-text-muted/70">
                  x [{xMin} → {xMax}] &nbsp; y [{yMin} → {yMax}]
                </span>
              </div>
              {/* Canvas */}
              <div className="bg-[linear-gradient(180deg,rgba(181,147,80,0.05),transparent_70%)] px-3 py-3">
                <div className={`mx-auto w-full ${docsCurveWidthClass}`}>
                  <CurveCanvas points={points} compact compactHeight={docsCurveHeight} docsCompact />
                </div>
              </div>
              {/* Point table — shown in standard detail mode */}
              {showCurveStats && (
                <div className="border-t border-tn-border px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted mb-1.5">
                    Control points
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {points.map((p, i) => (
                      <span
                        key={i}
                        className="font-mono text-[10px] rounded border border-tn-border bg-tn-bg px-1.5 py-0.5 text-tn-text-muted"
                        title={`Point ${i + 1}: x=${p[0]}, y=${p[1]}`}
                      >
                        ({p[0]}, {p[1]})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        } catch {
          // Fall through to raw code block if JSON parse fails
        }
      }
      // bounds: fence — renders a visual range bar with min/max labels
      // Format: JSON {
      //   "min": number, "max": number,
      //   "label"?: string,
      //   "context"?: [number, number],  // shared axis [ctxMin, ctxMax] for spatial comparison across stacked bars
      //   "danger"?: [number, number][]  // regions to highlight in warning color, e.g. [[-2,-1],[1,2]]
      // }
      if (lang === "bounds") {
        try {
          const parsed = JSON.parse(value) as {
            min: number;
            max: number;
            label?: string;
            context?: [number, number];
            danger?: [number, number][];
          };
          const { min, max, label } = parsed;
          const ctxMin = parsed.context ? parsed.context[0] : min;
          const ctxMax = parsed.context ? parsed.context[1] : max;
          const ctxRange = ctxMax - ctxMin;
          // Convert a value to a % position within the context axis
          const toFrac = (v: number) =>
            ctxRange === 0 ? 0 : Math.max(0, Math.min(1, (v - ctxMin) / ctxRange));
          const fillLeft = toFrac(min);
          const fillRight = 1 - toFrac(max);
          const hasZeroCross = ctxMin < 0 && ctxMax > 0;
          const zeroFrac = toFrac(0);
          const range = max - min;
          return (
            <div className="docs-wide-block my-4 overflow-hidden rounded-xl border border-tn-border bg-tn-panel shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
              {label && (
                <div className="border-b border-tn-border px-3 py-2 text-[11px] font-medium tracking-[0.03em] text-tn-text-muted">
                  {label}
                </div>
              )}
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="relative h-5 rounded bg-tn-bg border border-tn-border overflow-hidden">
                  {/* Danger zone regions (rendered first, behind the fill) */}
                  {parsed.danger?.map(([dMin, dMax], i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 bg-red-500/20"
                      style={{ left: `${toFrac(dMin) * 100}%`, right: `${(1 - toFrac(dMax)) * 100}%` }}
                    />
                  ))}
                  {/* Fill bar showing the actual min–max range within context */}
                  <div
                    className="absolute top-0 bottom-0 bg-tn-accent/25 border-x border-tn-accent/40"
                    style={{ left: `${fillLeft * 100}%`, right: `${fillRight * 100}%` }}
                  />
                  {/* Zero line */}
                  {hasZeroCross && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-tn-text-muted/50"
                      style={{ left: `${zeroFrac * 100}%` }}
                    />
                  )}
                  {/* Min label */}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-[10px] text-tn-accent font-mono"
                    style={{ left: `calc(${fillLeft * 100}% + 4px)` }}
                  >{min}</span>
                  {/* Max label */}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-[10px] text-tn-accent font-mono"
                    style={{ right: `calc(${fillRight * 100}% + 4px)` }}
                  >{max}</span>
                </div>
                {/* Context axis tick labels */}
                {parsed.context && (
                  <div className="relative flex justify-between text-[9px] text-tn-text-muted/60 font-mono px-0">
                    <span>{ctxMin}</span>
                    {hasZeroCross && (
                      <span className="absolute -translate-x-1/2" style={{ left: `${zeroFrac * 100}%` }}>0</span>
                    )}
                    <span>{ctxMax}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-tn-text-muted">
                  <span>Min: <span className="text-tn-text font-mono">{min}</span></span>
                  <span>Range: <span className="text-tn-text font-mono">{range.toFixed(3)}</span></span>
                  <span>Max: <span className="text-tn-text font-mono">{max}</span></span>
                </div>
              </div>
            </div>
          );
        } catch {
          // Fall through to raw code block
        }
      }
      // snippet: fence renders a labelled copyable JSON block styled as a terrain snippet
      // Format: first line (if not JSON) is the label and optional [difficulty], rest is JSON
      if (lang === "snippet") {
        const { label, difficulty, snippetJson } = parseSnippetFence(value);
        let snippetGraph = null;
        try {
          snippetGraph = buildSnippetDocNodeGraph(snippetJson);
        } catch {
          snippetGraph = null;
        }
        const showSnippetGraph = snippetDisplayMode === "nodegraph" || snippetDisplayMode === "both";
        const showSnippetJson = snippetDisplayMode === "json" || snippetDisplayMode === "both" || !snippetGraph;
        const difficultyColor: Record<string, string> = {
          Beginner: "bg-green-500/20 text-green-400 border-green-500/30",
          Intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          Advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
          Expert: "bg-red-500/20 text-red-400 border-red-500/30",
        };
        const diffClass = difficulty ? (difficultyColor[difficulty] ?? "bg-tn-surface text-tn-text-muted border-tn-border") : "";
        return (
          <div className="docs-wide-block docs-snippet-card my-5 overflow-hidden rounded-xl border border-tn-border bg-tn-panel/70 shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            <div className="border-b border-tn-border bg-[linear-gradient(180deg,rgba(181,147,80,0.12),rgba(181,147,80,0.03))] px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {label && (
                      <span className="truncate text-[12px] font-semibold tracking-[0.02em] text-tn-text">{label}</span>
                    )}
                    {difficulty && (
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${diffClass}`}>
                        {difficulty}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-tn-text-muted/75">
                    Terrain snippet
                  </div>
                </div>
                <div className="docs-snippet-actions flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <ActionPillButton
                    label="Copy JSON"
                    onClick={() => { void handleCopySnippetJson(snippetJson, label); }}
                    title="Copy the raw terrain snippet JSON"
                  />
                  {snippetGraph && (
                    <ActionPillButton
                      label="Copy Nodegraph"
                      onClick={() => { void handleCopyNodeGraphBlock(snippetGraph, label ? `${label} nodegraph` : "Snippet nodegraph"); }}
                      title="Copy a paste-ready nodegraph markdown block"
                    />
                  )}
                  <ActionPillButton
                    label="Copy Graph"
                    onClick={() => { void handleCopySnippetGraph(snippetJson, label); }}
                    title="Copy a paste-ready TerraNova graph to the clipboard"
                  />
                  <ActionPillButton
                    label="Open In Editor"
                    onClick={() => { void handleOpenSnippetInEditor(snippetJson, label); }}
                    title="Replace the current terrain graph with this snippet"
                  />
                </div>
              </div>
            </div>
            {showSnippetGraph && snippetGraph && (
              <div className="border-t border-white/5 bg-tn-bg/40 px-3 py-3">
                <DocNodeGraph {...snippetGraph} />
              </div>
            )}
            {showSnippetJson && (
              <pre className={`m-0 border-t border-white/5 bg-tn-bg/55 p-4 text-xs leading-7 text-tn-text-muted ${shouldWrapCodeBlocks ? "overflow-x-hidden whitespace-pre-wrap break-words" : "overflow-x-auto whitespace-pre"}`}>
                <code>{snippetJson}</code>
              </pre>
            )}
          </div>
        );
      }
      return (
        <div className="relative group">
          <pre {...props}>{children}</pre>
          <CopyButton text={value} />
        </div>
      );
    },
    blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<"blockquote">) => {
      const childArray = Array.isArray(children) ? children : [children];
      const firstChild = childArray[0] as React.ReactElement<{ children?: React.ReactNode }> | undefined;
      const firstText = firstChild?.props?.children;
      const firstStr = Array.isArray(firstText) ? String(firstText[0] ?? "") : String(firstText ?? "");
      const alertMatch = /^\[!(NOTE|TIP|WARNING|IMPORTANT)\]/.exec(firstStr.trim());
      if (alertMatch) {
        const type = alertMatch[1].toLowerCase() as "note" | "tip" | "warning" | "important";
        const labels: Record<string, string> = { note: "Note", tip: "Tip", warning: "Warning", important: "Important" };
        const rest = childArray.map((child, i) => {
          if (i !== 0) return child;
          const el = child as React.ReactElement<{ children?: React.ReactNode }>;
          const pChildren = Array.isArray(el.props?.children) ? el.props.children : [el.props?.children];
          const stripped = (pChildren as React.ReactNode[]).map((c, j) =>
            j === 0 ? String(c).replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/i, "") : c
          );
          return <p key="p0">{stripped}</p>;
        });
        return (
          <blockquote {...props} data-callout={type}>
            <span className="callout-label">{labels[type]}</span>
            {rest}
          </blockquote>
        );
      }
      return <blockquote {...props}>{children}</blockquote>;
    },
    code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) => {
      // Inline node pill: `node:NodeName` or `node:NodeName|category`
      const text = String(children ?? "");
      if (!className && text.startsWith("node:")) {
        const rest = text.slice(5);
        const [name, cat] = rest.split("|", 2);
        return <NodePill name={name.trim()} category={cat?.trim()} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
    h2: ({ id, children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
      <h2 {...props} id={id} className="group flex items-center gap-2">
        {children}
        {id && (
          <HeadingAnchor id={id} size="h2" selectedSlug={selectedSlug} contentRef={contentRef} />
        )}
      </h2>
    ),
    h3: ({ id, children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
      <h3 {...props} id={id} className="group flex items-center gap-2">
        {children}
        {id && (
          <HeadingAnchor id={id} size="h3" selectedSlug={selectedSlug} contentRef={contentRef} />
        )}
      </h3>
    ),
  }), [
    docsCurveHeight,
    docsCurveWidthClass,
    showCurveStats,
    entriesBySlug,
    handleCopyNodeGraphBlock,
    handleCopySnippetGraph,
    handleCopySnippetJson,
    handleLinkClick,
    handleOpenSnippetInEditor,
    selectedSlug,
    shouldWrapCodeBlocks,
    snippetDisplayMode,
  ]);
  const selectedEntry = selectedSlug ? entriesBySlug.get(selectedSlug) ?? null : null;
  const readingTimeMin = rawMd ? estimateReadingTime(rawMd) : null;

  return (
    <div
      className="flex h-full"
      onKeyDown={(e) => {
        if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); navBack(); }
        if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); navForward(); }
      }}
    >
      <div
        className={`docs-sidebar relative flex flex-col transition-all duration-200 border-r border-tn-border bg-tn-panel/80 ${
          sidebarCollapsed ? "hidden" : "w-64 min-w-[220px]"
        }`}
      >
        <div className="border-b border-tn-border px-3 py-2 flex items-center gap-1.5">
          {!showSettings && (
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 pr-6 text-sm text-tn-text focus:outline-none focus:border-tn-accent"
                placeholder="Search docs…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    searchCursorRef.current = -1;
                    setFilter("");
                    searchInputRef.current?.blur();
                    return;
                  }
                  if (!normalizedFilter || filtered.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    searchCursorRef.current = Math.min(searchCursorRef.current + 1, filtered.length - 1);
                    if (filtered[searchCursorRef.current]) loadDoc(filtered[searchCursorRef.current].slug);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    searchCursorRef.current = Math.max(searchCursorRef.current - 1, 0);
                    if (filtered[searchCursorRef.current]) loadDoc(filtered[searchCursorRef.current].slug);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const idx = searchCursorRef.current >= 0 ? searchCursorRef.current : 0;
                    if (filtered[idx]) {
                      loadDoc(filtered[idx].slug);
                      searchCursorRef.current = -1;
                      setFilter("");
                      searchInputRef.current?.blur();
                    }
                  }
                }}
              />
              {filter && (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-tn-text-muted hover:text-tn-text focus:outline-none"
                  onClick={() => { searchCursorRef.current = -1; setFilter(""); }}
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {showSettings && <span className="flex-1 text-xs font-semibold text-tn-text-muted uppercase tracking-wide pl-1">Settings</span>}
          <button
            type="button"
            className={`flex items-center justify-center w-6 h-6 shrink-0 rounded focus:outline-none transition-colors ${showSettings ? "text-tn-accent bg-tn-accent/15" : "text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text"}`}
            onClick={() => setShowSettings((v) => !v)}
            title="Docs settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-6 h-6 shrink-0 rounded text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text focus:outline-none"
            onClick={() => toggleSidebarCollapsed()}
            title="Hide docs tree"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {showSettings ? (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            <SettingsSection label="Profiles">
              <div className="grid gap-2">
                {DOCS_SETTINGS_PRESETS.map((preset) => {
                  const isActive = matchesDocsSettingsPreset(settings, preset.settings);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-tn-accent bg-tn-accent/12 text-tn-text"
                          : "border-tn-border bg-tn-bg/50 text-tn-text-muted hover:border-tn-text-muted/40 hover:text-tn-text"
                      }`}
                      onClick={() => setSettings({ ...preset.settings })}
                    >
                      <div className="text-[12px] font-semibold leading-tight">{preset.label}</div>
                      <div className="mt-0.5 text-[10px] leading-tight opacity-80">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>
            <SettingsSection label="Tree">
              <SettingsToggle
                label="Difficulty tags"
                description="Show basic / intermediate / expert badges"
                value={settings.showDifficultyTags}
                onChange={(v) => setSettings((s) => ({ ...s, showDifficultyTags: v }))}
              />
              <SettingsToggle
                label="Compact tree"
                description="Tighter row spacing for more items visible"
                value={settings.compactTree}
                onChange={(v) => setSettings((s) => ({ ...s, compactTree: v }))}
              />
              <SettingsToggle
                label="Folder item count"
                description="Show item count on collapsed folders"
                value={settings.showFolderCount}
                onChange={(v) => setSettings((s) => ({ ...s, showFolderCount: v }))}
              />
            </SettingsSection>
            <SettingsSection label="Reading">
              <SettingsSelect
                label="Reading width"
                description="Control how wide the prose column feels"
                value={settings.readingWidth}
                options={[
                  { value: "narrow", label: "Narrow" },
                  { value: "standard", label: "Standard" },
                  { value: "wide", label: "Wide" },
                ]}
                onChange={(value) => setSettings((s) => ({ ...s, readingWidth: value }))}
              />
              <SettingsSelect
                label="Font size"
                description="Adjust the text size in the reading area"
                value={settings.fontSize}
                options={[
                  { value: "default", label: "Default (13px)" },
                  { value: "small", label: "Small (12px)" },
                  { value: "medium", label: "Medium (14px)" },
                  { value: "large", label: "Large (15px)" },
                ]}
                onChange={(value) => setSettings((s) => ({ ...s, fontSize: value }))}
              />
              <SettingsToggle
                label="Reading progress bar"
                description="Thin bar showing scroll progress"
                value={settings.showProgressBar}
                onChange={(v) => setSettings((s) => ({ ...s, showProgressBar: v }))}
              />
              <SettingsToggle
                label="Table of contents open"
                description="Expand TOC by default when loading a doc"
                value={settings.showTocByDefault}
                onChange={(v) => setSettings((s) => ({ ...s, showTocByDefault: v }))}
              />
              <SettingsToggle
                label="Sticky header"
                description="Keep doc navigation pinned while scrolling"
                value={settings.showStickyHeader}
                onChange={(v) => setSettings((s) => ({ ...s, showStickyHeader: v }))}
              />
              <SettingsToggle
                label="Related docs"
                description="Show See also / Referenced by links at the end of a doc"
                value={settings.showRelatedDocs}
                onChange={(v) => setSettings((s) => ({ ...s, showRelatedDocs: v }))}
              />
              <SettingsToggle
                label="Wrap code blocks"
                description="Wrap long snippets instead of horizontal scrolling"
                value={settings.wrapCodeBlocks}
                onChange={(v) => setSettings((s) => ({ ...s, wrapCodeBlocks: v }))}
              />
            </SettingsSection>
            <SettingsSection label="Search">
              <SettingsToggle
                label="Auto-open first result"
                description="Jump into the first matching document while searching"
                value={settings.autoOpenFirstSearchResult}
                onChange={(v) => setSettings((s) => ({ ...s, autoOpenFirstSearchResult: v }))}
              />
            </SettingsSection>
            <SettingsSection label="Preview">
              <SettingsSelect
                label="Curve preview detail"
                description="Choose how much info docs curve previews show"
                value={settings.curvePreviewDetail}
                options={[
                  { value: "minimal", label: "Minimal" },
                  { value: "standard", label: "Standard" },
                ]}
                onChange={(value) => setSettings((s) => ({ ...s, curvePreviewDetail: value }))}
              />
              <SettingsSelect
                label="Curve preview size"
                description="Compact keeps the page tighter; Comfortable gives labels more room"
                value={settings.curvePreviewScale}
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "comfortable", label: "Comfortable" },
                ]}
                onChange={(value) => setSettings((s) => ({ ...s, curvePreviewScale: value }))}
              />
              <SettingsSelect
                label="Snippet display"
                description="Show terrain snippets as JSON, nodegraph, or both"
                value={settings.snippetDisplayMode}
                options={[
                  { value: "json", label: "JSON" },
                  { value: "nodegraph", label: "Nodegraph" },
                  { value: "both", label: "Both" },
                ]}
                onChange={(value) => setSettings((s) => ({ ...s, snippetDisplayMode: value }))}
              />
            </SettingsSection>
            <button
              type="button"
              className="mt-2 text-[11px] text-tn-text-muted hover:text-tn-text underline"
              onClick={() => setSettings({ ...DEFAULT_SETTINGS })}
            >
              Reset to defaults
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={sidebarScrollRef}>
            {normalizedFilter ? (
              <>
                <div className="border-b border-tn-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-tn-text-muted">
                  {filtered.length} result{filtered.length === 1 ? "" : "s"}
                </div>
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-tn-text-muted">No results for "{filter}"</div>
                ) : (
                  filtered.map((entry) => {
                    const isSelected = selectedSlug === entry.slug;
                    const snippet = (() => {
                      const text = docIndex[entry.slug] ?? "";
                      const lower = text.toLowerCase();
                      const idx = lower.indexOf(normalizedFilter.toLowerCase());
                      if (idx === -1) return null;
                      const start = Math.max(0, idx - 40);
                      const end = Math.min(text.length, idx + normalizedFilter.length + 60);
                      const raw = text.slice(start, end).replace(/\s+/g, " ").trim();
                      const hi = raw.toLowerCase().indexOf(normalizedFilter.toLowerCase());
                      if (hi === -1) return raw;
                      return (
                        <>
                          {raw.slice(0, hi)}
                          <mark className="bg-tn-accent/30 text-tn-text rounded-sm">{raw.slice(hi, hi + normalizedFilter.length)}</mark>
                          {raw.slice(hi + normalizedFilter.length)}
                        </>
                      );
                    })();
                    return (
                      <button
                        key={entry.slug}
                        type="button"
                        ref={isSelected ? (el) => { (activeItemRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
                        className={`flex w-full flex-col gap-0.5 border-b border-tn-border/40 px-3 py-2 text-left transition-colors hover:bg-tn-accent/8 ${isSelected ? "bg-tn-accent/12" : ""}`}
                        onClick={() => { loadDoc(entry.slug, undefined, true, normalizedFilter); }}
                      >
                        <span className={`text-[12px] font-semibold ${isSelected ? "text-tn-accent" : "text-tn-text"}`}>{entry.title}</span>
                        {snippet && (
                          <span className="text-[10px] leading-snug text-tn-text-muted line-clamp-2">{snippet}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </>
            ) : (
              filteredTree.map((node) => (
                <DocTreeNodeItem
                  key={`${node.type}-${node.slug}`}
                  node={node}
                  selectedSlug={selectedSlug}
                  onSelect={loadDoc}
                  onResolveFolderSlug={resolveFolderSlug}
                  collapsed={collapsedFolders}
                  onToggleCollapse={toggleFolderCollapsed}
                  activeItemRef={activeItemRef}
                  settings={settings}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Reading progress bar */}
        {settings.showProgressBar && (
          <div className="h-0.5 w-full bg-tn-border shrink-0">
            <div
              className="h-full bg-tn-accent transition-[width] duration-75"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        )}

        {/* In-doc find bar */}
        {findActive && (
          <div className="flex items-center gap-1.5 border-b border-tn-border bg-tn-panel/90 px-3 py-1.5 shrink-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-tn-text-muted" />
            <input
              ref={findInputRef}
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); navigateFindMatch(e.shiftKey ? -1 : 1); }
                if (e.key === "Escape") { setFindActive(false); setFindQuery(""); }
              }}
              placeholder="Find in page…"
              className="flex-1 bg-transparent text-sm text-tn-text outline-none placeholder:text-tn-text-muted/50"
            />
            {findQuery && (
              <span className="shrink-0 text-[11px] text-tn-text-muted tabular-nums">
                {findMatchCount === 0 ? "No results" : `${findMatchIndex + 1} / ${findMatchCount}`}
              </span>
            )}
            <button type="button" title="Previous match (Shift+Enter)" onClick={() => navigateFindMatch(-1)} disabled={findMatchCount === 0} className="flex h-5 w-5 items-center justify-center rounded text-tn-text-muted hover:text-tn-text disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Next match (Enter)" onClick={() => navigateFindMatch(1)} disabled={findMatchCount === 0} className="flex h-5 w-5 items-center justify-center rounded text-tn-text-muted hover:text-tn-text disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Close (Esc)" onClick={() => { setFindActive(false); setFindQuery(""); }} className="flex h-5 w-5 items-center justify-center rounded text-tn-text-muted hover:text-tn-text">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto p-6 pb-16 docs-content"
          id="docs-content"
          ref={contentRef}
          data-reading-width={settings.readingWidth}
          data-font-size={settings.fontSize === "default" ? undefined : settings.fontSize}
          data-code-wrap={shouldWrapCodeBlocks ? "wrap" : "scroll"}
          tabIndex={-1}
        >
        {selectedSlug ? (
          <>
            <div className={`docs-reader-header z-20 mb-5 -mx-6 border-b border-tn-border/80 bg-[rgba(28,26,23,0.88)] px-6 py-4 backdrop-blur-md ${settings.showStickyHeader ? "sticky top-0" : ""}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {sidebarCollapsed && (
                  <button
                    type="button"
                    className="flex items-center justify-center w-6 h-6 rounded text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text focus:outline-none"
                    onClick={() => toggleSidebarCollapsed()}
                    title="Show docs tree"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                {/* Back / Forward -- visually grouped with a subtle separator from the Nav toggle */}
                <div className="flex items-center gap-0.5 border border-tn-border rounded px-0.5">
                  <button
                    type="button"
                    className="flex items-center justify-center w-6 h-6 rounded text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text focus:outline-none disabled:opacity-30"
                    onClick={navBack}
                    disabled={navIndex <= 0}
                    title="Back (Alt+←)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center w-6 h-6 rounded text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text focus:outline-none disabled:opacity-30"
                    onClick={navForward}
                    disabled={navIndex >= navHistory.length - 1}
                    title="Forward (Alt+→)"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-sm min-w-0">
                  {breadcrumbsFromSlug(selectedSlug).map((crumb, i, arr) => (
                    <span key={crumb.slug} className="flex items-center gap-1 min-w-0">
                      {i < arr.length - 1 ? (
                        <>
                          <button
                            type="button"
                            className="text-tn-text-muted truncate max-w-[120px] hover:text-tn-text hover:underline transition-colors"
                            onClick={() => loadDoc(crumb.slug)}
                          >
                            {crumb.label}
                          </button>
                          <ChevronRight className="h-3 w-3 text-tn-border shrink-0" />
                        </>
                      ) : (
                        <span className="font-semibold text-tn-text truncate">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {selectedEntry && (
                  <div className="hidden text-right md:block">
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-tn-text-muted/70">Reading</div>
                      {readingTimeMin !== null && (
                        <div className="flex items-center gap-1 rounded-full border border-tn-border/60 bg-tn-bg/60 px-1.5 py-px text-[10px] text-tn-text-muted/80">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span>{readingTimeMin} min</span>
                        </div>
                      )}
                    </div>
                    <div className="max-w-[220px] truncate text-sm font-medium text-tn-text">{selectedEntry.title}</div>
                  </div>
                )}
                <button
                  type="button"
                  title="Find in page (Ctrl+F)"
                  onClick={() => { setFindActive((v) => !v); requestAnimationFrame(() => findInputRef.current?.focus()); }}
                  className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${findActive ? "border-tn-accent/60 bg-tn-accent/15 text-tn-accent" : "border-tn-border text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text"}`}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                {walkthroughSteps.length > 0 && (
                  <button
                    className="rounded border border-tn-border bg-tn-panel px-3 py-1 text-sm text-tn-text hover:bg-tn-panel/80"
                    onClick={() => {
                      setWalkthroughActive((v) => {
                        if (!v) {
                          contentRef.current?.scrollTo({ top: 0 });
                          setTimeout(() => walkthroughShellRef.current?.focus(), 0);
                        }
                        return !v;
                      });
                    }}
                  >
                    {walkthroughActive ? "Exit Walkthrough" : "Start Walkthrough"}
                  </button>
                )}
              </div>
            </div>
            </div>

            {walkthroughActive ? (
              <div
                ref={walkthroughShellRef}
                className="docs-reading-shell flex flex-col gap-4"
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Escape") {
                    e.stopPropagation();
                  }
                  if (e.key === "ArrowLeft") setWalkthroughStep((s) => Math.max(0, s - 1));
                  if (e.key === "ArrowRight") setWalkthroughStep((s) => Math.min(walkthroughSteps.length - 1, s + 1));
                  if (e.key === "Escape") setWalkthroughActive(false);
                }}
                tabIndex={0}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-tn-text">
                    {walkthroughShowFull ? "Full document" : walkthroughSteps[walkthroughStep].title}
                  </div>
                  <div className="flex items-center gap-2">
                    {!walkthroughShowFull && (
                      <>
                        <button
                          className="rounded border border-tn-border bg-tn-panel px-2 py-1 text-xs text-tn-text hover:bg-tn-panel/80 disabled:opacity-50"
                          disabled={walkthroughStep === 0}
                          onClick={() => setWalkthroughStep((s) => Math.max(0, s - 1))}
                        >
                          ← Previous
                        </button>
                        <button
                          className="rounded border border-tn-border bg-tn-panel px-2 py-1 text-xs text-tn-text hover:bg-tn-panel/80 disabled:opacity-50"
                          disabled={walkthroughStep >= walkthroughSteps.length - 1}
                          onClick={() => setWalkthroughStep((s) => Math.min(walkthroughSteps.length - 1, s + 1))}
                        >
                          Next →
                        </button>
                      </>
                    )}
                    <button
                      className={`rounded border px-2 py-1 text-xs transition-colors ${walkthroughShowFull ? "border-tn-accent/60 bg-tn-accent/15 text-tn-accent" : "border-tn-border bg-tn-panel text-tn-text-muted hover:text-tn-text hover:bg-tn-panel/80"}`}
                      onClick={() => setWalkthroughShowFull((v) => !v)}
                      title={walkthroughShowFull ? "Back to step view" : "View the full document"}
                    >
                      {walkthroughShowFull ? "Step view" : "Full doc"}
                    </button>
                  </div>
                </div>

                {walkthroughShowFull ? (
                  <>
                    <DocToc entries={tocEntries} contentRef={contentRef} defaultOpen={settings.showTocByDefault} />
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSlug, rehypeHighlight]}
                      components={mdComponents}
                    >
                      {rawMd}
                    </ReactMarkdown>
                  </>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug, rehypeHighlight]}
                    components={mdComponents}
                  >
                    {walkthroughSteps[walkthroughStep].content}
                  </ReactMarkdown>
                )}

                {!walkthroughShowFull && (
                  <div className="flex items-center gap-3" aria-live="polite">
                    <span className="text-xs text-tn-text-muted">
                      Step {walkthroughStep + 1} of {walkthroughSteps.length}
                    </span>
                    <div className="flex items-center gap-1">
                      {walkthroughSteps.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          title={walkthroughSteps[i].title}
                          onClick={() => setWalkthroughStep(i)}
                          className={`rounded-full transition-all ${
                            i === walkthroughStep
                              ? "h-2 w-4 bg-tn-accent"
                              : i < walkthroughStep
                                ? "h-1.5 w-1.5 bg-tn-accent/50"
                                : "h-1.5 w-1.5 bg-tn-border hover:bg-tn-text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="docs-reading-shell">
                {isExperimental && (
                  <div className="mb-5 flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/08 px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.07)" }}>
                    <span className="mt-0.5 shrink-0 text-base leading-none">⚗️</span>
                    <div>
                      <span className="font-semibold text-amber-400">Experimental</span>
                      <span className="text-tn-text-muted"> — techniques in this guide push beyond normal usage. Expect artifacts, high costs, or behaviour that may change in future updates.</span>
                    </div>
                  </div>
                )}
                <DocToc entries={tocEntries} contentRef={contentRef} defaultOpen={settings.showTocByDefault} />
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, rehypeHighlight]}
                  components={mdComponents}
                >
                  {rawMd}
                </ReactMarkdown>

                {settings.showRelatedDocs && (
                  <RelatedDocs
                    selectedSlug={selectedSlug}
                    outboundLinks={outboundLinks}
                    backlinks={backlinks}
                    entries={entries}
                    loadDoc={loadDoc}
                  />
                )}
                <PrevNextNav
                  selectedSlug={selectedSlug}
                  entries={entries}
                  loadDoc={loadDoc}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-tn-text-muted">Select a document to view.</div>
        )}
        </div>
        {showScrollTop && (
          <button
            type="button"
            onClick={() => { contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            title="Scroll to top"
            className="absolute bottom-4 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-tn-border bg-tn-panel/90 text-tn-text-muted shadow-md backdrop-blur-sm hover:bg-tn-accent/20 hover:text-tn-text transition-colors"
          >
            <ChevronLeft className="h-4 w-4 rotate-90" />
          </button>
        )}
      </div>
    </div>
  );
}
