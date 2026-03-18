import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Folder, FileText, X,
  BookOpen, Map as MapIcon, Wrench, Library, ScrollText, GitPullRequest, Copy, Check,
  Compass, GraduationCap, LayoutTemplate, Hash, List, Settings,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { MermaidDiagram } from "@/components/docs/MermaidDiagram";
import { DocNodeGraph, parseNodeGraph } from "@/components/docs/DocNodeGraph";

// ── Docs settings ────────────────────────────────────────────────────────────
type DocsSettings = {
  showDifficultyTags: boolean;
  compactTree: boolean;
  showProgressBar: boolean;
  showTocByDefault: boolean;
  showFolderCount: boolean;
};

const DEFAULT_SETTINGS: DocsSettings = {
  showDifficultyTags: true,
  compactTree: false,
  showProgressBar: true,
  showTocByDefault: true,
  showFolderCount: true,
};

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
  if (name.includes("experimental"))                                                      tags.push("experimental");
  else if (name.includes("expert"))                                                       tags.push("expert");
  else if (name.includes("advanced") || name.includes("sculpting") || name.includes("composition")) tags.push("advanced");
  else if (name.includes("terrain-types") || name.includes("node-combinations") ||
           name.includes("multi-biome") || name.includes("terrain-and-caves") ||
           name.includes("biome-system") || name.includes("terrain-math") ||
           name.includes("curves-explained") || name.includes("materials-guide") ||
           name.includes("props-and-placement"))                                           tags.push("intermediate");
  else if (name.includes("basic") || name.includes("data-flow") ||
           name.includes("create-a-world") || name.includes("setup") ||
           name.includes("understanding"))                                                tags.push("basic");
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
  "glossary/asset-node-editor-nodes":               "Node Editor Nodes",
  "glossary/in-game-commands":                       "In-Game Commands",
  // Guides
  "guides/biome-system":                             "Biome System",
  "guides/node-combinations":                        "Node Combinations",
  "guides/terrain-math-explained":                   "Terrain Math Explained",
  "guides/curves-explained":                         "Curves Explained",
  "guides/materials-guide":                          "Materials Guide",
  "guides/props-and-placement":                      "Props & Placement",
  "guides/setup-data-flow-first-steps":              "Data Flow & First Steps",
  "guides/understanding-basic-terrain-generation":   "Basic Terrain Generation",
  "guides/terrain-types":                            "Terrain Types",
  "guides/terrain-types-advanced":                   "Complex Terrain",
  "guides/terrain-types-expert":                     "Expert Terrain",
  "guides/terrain-sculpting-advanced":               "Terrain Sculpting",
  "guides/terrain-composition-expert":               "Terrain Composition",
  "guides/terrain-experimental":                     "Experimental Terrain",
  // Walkthroughs
  "walkthroughs/data-flow-first-steps":              "Data Flow & First Steps",
  "walkthroughs/basic-terrain-generation":           "Basic Terrain Generation",
  "walkthroughs/create-a-world":                     "Create a World",
  "walkthroughs/terrain-and-caves":                  "Terrain & Caves",
  "walkthroughs/multi-biome-world":                  "Multi-Biome World",
  "walkthroughs/periodic-density-stripes":           "Density Stripes",
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
  { key: "templates", title: "Templates", slug: "templates" },
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
  templates:       LayoutTemplate,
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
  const sectionMap = new Map<string, FolderNode>();
  const sections: FolderNode[] = ROOT_SECTION_ORDER.map((section) => {
    const folder: FolderNode = { type: "folder", title: section.title, slug: section.slug, children: [] };
    sectionMap.set(section.key, folder);
    return folder;
  });

  const otherSection: FolderNode = { type: "folder", title: "Other", slug: "other", children: [] };

  for (const entry of entries) {
    const parts = entry.slug.split("/");
    const sectionKey = parts.length === 1 ? entry.slug : parts[0];
    const section = sectionMap.get(sectionKey) ?? otherSection;
    const title = parts.length === 1 ? entry.title : titleFromSlug(parts.slice(1).join("/"));
    section.children.push({ type: "file", title, slug: entry.slug, tags: tagsFromSlug(entry.slug) });
  }

  const DIFFICULTY_ORDER: Record<string, number> = {
    basic: 0, intermediate: 1, advanced: 2, expert: 3, experimental: 4,
  };
  function difficultyRank(node: DocTreeNodeData): number {
    if (node.type !== "file") return -1;
    const tag = (node.tags ?? []).find((t) => t in DIFFICULTY_ORDER);
    return tag !== undefined ? DIFFICULTY_ORDER[tag] : -1;
  }
  function sortByDifficulty(nodes: DocTreeNodeData[]): DocTreeNodeData[] {
    return [...nodes].sort((a, b) => {
      const da = difficultyRank(a);
      const db = difficultyRank(b);
      if (da === -1 && db === -1) return 0; // untagged: preserve order
      if (da === -1) return 1;              // untagged sinks to bottom
      if (db === -1) return -1;
      return da - db;
    });
  }

  // Build final tree: sections with multiple children become folder nodes;
  // sections whose only child is a same-named top-level file collapse to a file node directly.
  const result: DocTreeNodeData[] = [];

  for (const section of sections) {
    if (section.children.length === 0) continue;

    // Always strip README/index files -- the folder header loads them on click
    const meaningful = section.children.filter((child) =>
      child.type !== "file" || !/\/(readme|index)$/i.test(child.slug)
    );

    if (meaningful.length === 0) {
      // Only a README existed -- expose it as a single file node with the section title
      const only = section.children[0];
      result.push({ type: "file", title: section.title, slug: only.slug });
    } else if (meaningful.length === 1 && section.children.length === 1) {
      // Single file section (e.g. overview, introduction) -- no folder wrapper needed
      result.push({ type: "file", title: section.title, slug: meaningful[0].slug });
    } else {
      result.push({ ...section, children: sortByDifficulty(meaningful) });
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

function DocTreeNodeItem({
  node,
  selectedSlug,
  onSelect,
  collapsed,
  onToggleCollapse,
  activeItemRef,
  settings = DEFAULT_SETTINGS,
  depth = 0,
}: {
  node: DocTreeNodeData;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  collapsed: Record<string, boolean>;
  onToggleCollapse: (slug: string) => void;
  activeItemRef: React.RefObject<HTMLButtonElement | null>;
  settings?: DocsSettings;
  depth?: number;
}) {
  const indent = depth * 12;
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
        className={`docs-file flex w-full items-center gap-2 text-left border-l-2 transition-colors ${
          isTopLevel ? `${compact ? "py-1" : "py-2"} text-sm font-semibold` : `${compact ? "py-0.5" : "py-1.5"} text-[13px]`
        } ${
          isSelected
            ? "border-tn-accent bg-tn-accent/20 text-tn-text"
            : "border-transparent text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text"
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
  const readmeSlug = node.slug + "/README";
  const isFolderSelected = selectedSlug === readmeSlug;
  const childCount = node.children.length;
  const compact = settings.compactTree;
  return (
    <div className="docs-folder mt-0.5">
      <button
        ref={isFolderSelected ? (el) => { (activeItemRef as React.MutableRefObject<HTMLButtonElement | null>).current = el; } : undefined}
        type="button"
        className={`flex w-full items-center gap-2 ${compact ? "py-1" : "py-2"} pr-3 text-sm font-semibold border-l-2 ${
          isFolderSelected
            ? "border-tn-accent bg-tn-accent/20 text-tn-text"
            : `border-transparent ${isCollapsed ? "text-tn-text-muted" : "text-tn-text"}`
        } hover:bg-tn-accent/10 focus:outline-none focus:ring-2 focus:ring-tn-accent/40`}
        style={{ paddingLeft: `${indent + basePadding}px` }}
        onClick={() => {
          onToggleCollapse(node.slug);
          onSelect(readmeSlug);
        }}
        aria-expanded={!isCollapsed}
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{node.title}</span>
        {isCollapsed && settings.showFolderCount && (
          <span className="text-[10px] text-tn-text-muted tabular-nums shrink-0 mr-0.5">{childCount}</span>
        )}
        {isCollapsed
          ? <ChevronRight className="h-3 w-3 text-tn-text-muted shrink-0" />
          : <ChevronDown className="h-3 w-3 text-tn-text-muted shrink-0" />
        }
      </button>
      {!isCollapsed && (
        <div className="pb-1">
          {node.children.map((child) => (
            <DocTreeNodeItem
              key={`${child.type}-${child.slug}`}
              node={child}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
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
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      type="button"
      className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded border border-tn-border bg-tn-panel/80 text-tn-text-muted hover:text-tn-text hover:bg-tn-accent/10 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
      title="Copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
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
    if (!contentEl || entries.length === 0) return;
    const headingEls = entries
      .map(({ id }) => contentEl.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];
    if (headingEls.length === 0) return;

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

export function DocsPanel() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);
  const navIndexRef = useRef(-1);
  const [scrollProgress, setScrollProgress] = useState(0);
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
  // Per-doc scroll position memory: slug → scrollTop
  const scrollMemoryRef = useRef<Record<string, number>>({});
  const prevSlugRef = useRef<string | null>(null);
  const prevCollapsedFoldersRef = useRef<Record<string, boolean> | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const entries = useMemo<DocEntry[]>(() => {
    const list: DocEntry[] = [];
    for (const [path, loader] of Object.entries(docsModules)) {
      const slug = slugFromPath(path);
      const title = titleFromSlug(slug);
      list.push({ slug, title, path, loader });
    }
    return list.sort((a, b) => a.slug.localeCompare(b.slug));
  }, []);

  const docTree = useMemo(() => buildDocTree(entries), [entries]);
  const tocEntries = useMemo(() => parseToc(rawMd), [rawMd]);

  const getAllFolderSlugs = useCallback((nodes: DocTreeNodeData[]): string[] => {
    const slugs: string[] = [];
    for (const node of nodes) {
      if (node.type === "folder") {
        slugs.push(node.slug);
        slugs.push(...getAllFolderSlugs(node.children));
      }
    }
    return slugs;
  }, []);

  const toggleSidebarCollapsed = useCallback(
    (next?: boolean) => {
      setSidebarCollapsed((current) => {
        const target = typeof next === "boolean" ? next : !current;

        if (target) {
          prevCollapsedFoldersRef.current = collapsedFolders;
          const allFolders = getAllFolderSlugs(docTree);
          const collapsedState = Object.fromEntries(allFolders.map((s) => [s, true]));
          setCollapsedFolders(collapsedState);
        } else if (prevCollapsedFoldersRef.current) {
          setCollapsedFolders(prevCollapsedFoldersRef.current);
          prevCollapsedFoldersRef.current = null;
        }

        return target;
      });
    },
    [collapsedFolders, docTree, getAllFolderSlugs],
  );

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const lower = filter.toLowerCase();

    return entries.filter((entry) => {
      const text = docIndex[entry.slug] ?? "";
      return (
        entry.title.toLowerCase().includes(lower) ||
        entry.slug.toLowerCase().includes(lower) ||
        text.toLowerCase().includes(lower)
      );
    });
  }, [entries, filter, docIndex]);

  const filteredTree = useMemo(() => {
    if (!filter.trim()) return docTree;

    // Flatten filtered entries into a tree-like object for display
    const allowed = new Set(filtered.map((e) => e.slug));

    function filterNode(node: DocTreeNodeData): DocTreeNodeData | null {
      if (node.type === "file") {
        return allowed.has(node.slug) ? node : null;
      }
      const childNodes = node.children
        .map(filterNode)
        .filter((n): n is DocTreeNodeData => n !== null);
      if (childNodes.length > 0) {
        return { ...node, children: childNodes };
      }
      return null;
    }

    return docTree
      .map(filterNode)
      .filter((n): n is DocTreeNodeData => n !== null);
  }, [filter, docTree, filtered]);

  const loadDoc = useCallback(
    async (slug: string, anchor?: string, pushHistory = true) => {
      const entry = entries.find((e) => e.slug === slug);
      if (!entry) return;
      let text: string;
      try {
        text = await entry.loader();
      } catch {
        setRawMd(`> **Error:** Could not load \`${slug}\`. The file may be missing or unreadable.`);
        setSelectedSlug(slug);
        return;
      }

      // Save scroll position of the doc we're leaving
      if (prevSlugRef.current && contentRef.current && prevSlugRef.current !== slug) {
        scrollMemoryRef.current[prevSlugRef.current] = contentRef.current.scrollTop;
      }

      // Strip HTML comments (e.g. <!-- walkthrough -->) before rendering
      const cleaned = text.replace(/<!--[\s\S]*?-->/g, "");
      setRawMd(cleaned);
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
        navIndexRef.current = newIndex;
        setNavIndex(newIndex);
      }

      // Detect experimental flag
      setIsExperimental(text.includes("<!-- experimental -->"));

      // Parse walkthrough steps if applicable
      if (text.includes("<!-- walkthrough -->")) {
        const steps: Array<{ title: string; content: string }> = [];
        const parts = cleaned.split(/^##\s+/m).slice(1);
        for (const part of parts) {
          const [titleLine, ...rest] = part.split("\n");
          steps.push({ title: titleLine.trim(), content: rest.join("\n") });
        }
        setWalkthroughSteps(steps);
      } else {
        setWalkthroughSteps([]);
        setWalkthroughActive(false);
      }

      if (anchor && contentRef.current) {
        setTimeout(() => {
          const el = contentRef.current?.querySelector(`#${CSS.escape(anchor)}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      } else {
        // Restore saved scroll position for this doc (if any), otherwise reset to top
        const savedScroll = scrollMemoryRef.current[slug] ?? 0;
        setTimeout(() => {
          if (contentRef.current) contentRef.current.scrollTop = savedScroll;
        }, 20);
      }
    },
    [entries],
  );

  const navBack = useCallback(() => {
    const i = navIndexRef.current;
    if (i <= 0) return;
    const newIndex = i - 1;
    navIndexRef.current = newIndex;
    setNavIndex(newIndex);
    loadDoc(navHistory[newIndex], undefined, false);
  }, [navHistory, loadDoc]);

  const navForward = useCallback(() => {
    const i = navIndexRef.current;
    if (i >= navHistory.length - 1) return;
    const newIndex = i + 1;
    navIndexRef.current = newIndex;
    setNavIndex(newIndex);
    loadDoc(navHistory[newIndex], undefined, false);
  }, [navHistory, loadDoc]);

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

      setDocIndex(index);
      setBacklinks(Object.fromEntries(Object.entries(inbound).map(([k, v]) => [k, Array.from(v)])));
      setOutboundLinks(Object.fromEntries(Object.entries(outbound).map(([k, v]) => [k, Array.from(v)])));
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

  // Persist docs settings
  useEffect(() => {
    try { localStorage.setItem("tn-docs-settings", JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  // Reading progress bar
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setScrollProgress(0);
    function onScroll() {
      const scrollable = el!.scrollHeight - el!.clientHeight;
      setScrollProgress(scrollable > 0 ? el!.scrollTop / scrollable : 0);
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

  // Auto-expand all sidebar folders when a search is active
  useEffect(() => {
    if (filter.trim()) {
      setCollapsedFolders({});
    }
  }, [filter]);

  const handleLinkClick = useCallback(
    (href: string) => {
      const resolved = resolveLinkSlug(selectedSlug ?? "", href);
      if (!resolved) return false;

      const target = entries.find((e) => e.slug === resolved.slug || e.slug === resolved.slug.replace(/\.md$/, ""));
      if (target) {
        loadDoc(target.slug, resolved.anchor);
        return true;
      }

      // If the link is an anchor within the same document, just scroll
      if (resolved.slug === selectedSlug && resolved.anchor) {
        loadDoc(resolved.slug, resolved.anchor);
        return true;
      }

      return false;
    },
    [entries, loadDoc, selectedSlug],
  );

  const mdComponents = useMemo(() => ({
    a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
      const hrefStr = String(href ?? "");
      const isExternal = hrefStr.startsWith("http") || hrefStr.startsWith("mailto:");
      const resolved = !isExternal ? resolveLinkSlug(selectedSlug ?? "", hrefStr) : null;
      const isInternal = resolved !== null && (
        entries.some((e) => e.slug === resolved.slug || e.slug === resolved.slug.replace(/\.md$/, "")) ||
        (resolved.slug === selectedSlug && !!resolved.anchor)
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
      if (lang === "mermaid") return <MermaidDiagram code={value} />;
      if (lang === "nodegraph") {
        const graph = parseNodeGraph(value);
        if (graph) return <DocNodeGraph {...graph} />;
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
    code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) =>
      <code className={className} {...props}>{children}</code>,
    h2: ({ id, children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
      <h2 {...props} id={id} className="group flex items-center gap-2">
        {children}
        {id && (
          <a href={`#${id}`} className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-tn-text-muted hover:text-tn-accent shrink-0" aria-label="Link to section" onClick={(e) => { e.preventDefault(); const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <Hash className="h-4 w-4" />
          </a>
        )}
      </h2>
    ),
    h3: ({ id, children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
      <h3 {...props} id={id} className="group flex items-center gap-2">
        {children}
        {id && (
          <a href={`#${id}`} className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-tn-text-muted hover:text-tn-accent shrink-0" aria-label="Link to section" onClick={(e) => { e.preventDefault(); const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <Hash className="h-3.5 w-3.5" />
          </a>
        )}
      </h3>
    ),
  }), [entries, selectedSlug, handleLinkClick]);

  return (
    <div className="flex h-full">
      <div
        className={`docs-sidebar relative flex flex-col transition-all duration-200 border-r border-tn-border bg-tn-panel/80 ${
          sidebarCollapsed ? "hidden" : "w-64 min-w-[220px]"
        }`}
      >
        <div className="border-b border-tn-border px-3 py-2 flex items-center gap-1.5">
          {!showSettings && (
            <div className="relative flex-1">
              <input
                className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 pr-6 text-sm text-tn-text focus:outline-none focus:border-tn-accent"
                placeholder="Search docs…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filter && (
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-tn-text-muted hover:text-tn-text focus:outline-none"
                  onClick={() => setFilter("")}
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
            </SettingsSection>
            <button
              type="button"
              className="mt-2 text-[11px] text-tn-text-muted hover:text-tn-text underline"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
            >
              Reset to defaults
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={sidebarScrollRef}>
            {filteredTree.length === 0 && filter.trim() ? (
              <div className="px-4 py-6 text-center text-xs text-tn-text-muted">No results for "{filter}"</div>
            ) : (
              filteredTree.map((node) => (
                <DocTreeNodeItem
                  key={`${node.type}-${node.slug}`}
                  node={node}
                  selectedSlug={selectedSlug}
                  onSelect={loadDoc}
                  collapsed={collapsedFolders}
                  onToggleCollapse={(slug) =>
                    setCollapsedFolders((prev) => ({ ...prev, [slug]: !prev[slug] }))
                  }
                  activeItemRef={activeItemRef}
                  settings={settings}
                />
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Reading progress bar */}
        {settings.showProgressBar && (
          <div className="h-0.5 w-full bg-tn-border shrink-0">
            <div
              className="h-full bg-tn-accent transition-[width] duration-75"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto p-6 pb-16 docs-content"
          id="docs-content"
          ref={contentRef}
          onKeyDown={(e) => {
            if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); navBack(); }
            if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); navForward(); }
          }}
          tabIndex={-1}
        >
        {selectedSlug ? (
          <>
            <div className="flex items-center justify-between mb-4">
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
                          <span className="text-tn-text-muted truncate max-w-[120px]">{crumb.label}</span>
                          <ChevronRight className="h-3 w-3 text-tn-border shrink-0" />
                        </>
                      ) : (
                        <span className="font-semibold text-tn-text truncate">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {walkthroughSteps.length > 0 && (
                <button
                  className="rounded border border-tn-border bg-tn-panel px-3 py-1 text-sm text-tn-text hover:bg-tn-panel/80"
                  onClick={() => {
                    setWalkthroughActive((v) => !v);
                    setWalkthroughStep(0);
                  }}
                >
                  {walkthroughActive ? "Exit Walkthrough" : "Start Walkthrough"}
                </button>
              )}
            </div>

            {walkthroughActive ? (
              <div
                className="flex flex-col gap-4"
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setWalkthroughStep((s) => Math.max(0, s - 1));
                  if (e.key === "ArrowRight") setWalkthroughStep((s) => Math.min(walkthroughSteps.length - 1, s + 1));
                }}
                tabIndex={-1}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-tn-text">{walkthroughSteps[walkthroughStep].title}</div>
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, rehypeHighlight]}
                  components={mdComponents}
                >
                  {walkthroughSteps[walkthroughStep].content}
                </ReactMarkdown>

                <div className="text-xs text-tn-text-muted" aria-live="polite">
                  Step {walkthroughStep + 1} of {walkthroughSteps.length}
                </div>
              </div>
            ) : (
              <>
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

                <RelatedDocs
                  selectedSlug={selectedSlug}
                  outboundLinks={outboundLinks}
                  backlinks={backlinks}
                  entries={entries}
                  loadDoc={loadDoc}
                />
              </>
            )}
          </>
        ) : (
          <div className="text-tn-text-muted">Select a document to view.</div>
        )}
        </div>
      </div>
    </div>
  );
}
