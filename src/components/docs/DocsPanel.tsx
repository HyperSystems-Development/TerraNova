import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight, Folder, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";

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
type FileNode = { type: "file"; title: string; slug: string };

type DocTreeNodeData = FolderNode | FileNode;

function slugFromPath(path: string) {
  // Vite returns paths like "../docs/overview.md" or "../../docs/guides/foo.md"
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/docs\/(.*)\.md$/);
  return match ? match[1] : normalized;
}

function titleFromSlug(slug: string) {
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
  { key: "overview", title: "Overview", slug: "root/overview" },
  { key: "getting-started", title: "Getting Started", slug: "root/getting-started" },
  { key: "guides", title: "Guides", slug: "guides" },
  { key: "templates", title: "Templates", slug: "templates" },
  { key: "glossary", title: "Glossary", slug: "glossary" },
  { key: "reference", title: "Reference", slug: "reference" },
  { key: "troubleshooting", title: "Troubleshooting", slug: "root/troubleshooting" },
  { key: "contributing", title: "Contributing", slug: "root/contributing" },
];

function buildDocTree(entries: DocEntry[]): DocTreeNodeData[] {
  const sectionMap = new Map<string, FolderNode>();
  const sections: FolderNode[] = ROOT_SECTION_ORDER.map((section) => {
    const folder: FolderNode = {
      type: "folder",
      title: section.title,
      slug: section.slug,
      children: [],
    };
    sectionMap.set(section.key, folder);
    return folder;
  });

  const otherSection: FolderNode = {
    type: "folder",
    title: "Other",
    slug: "other",
    children: [],
  };

  for (const entry of entries) {
    const parts = entry.slug.split("/");
    const sectionKey = parts.length === 1 ? entry.slug : parts[0];
    const section = sectionMap.get(sectionKey) ?? otherSection;

    // If this entry is part of a deeper folder structure, preserve it in the title.
    const title = parts.length === 1 ? entry.title : `${titleFromSlug(parts.slice(1).join("/"))}`;

    section.children.push({ type: "file", title, slug: entry.slug });
  }

  const result = [...sections];
  if (otherSection.children.length > 0) {
    result.push(otherSection);
  }

  return result;
}

function DocTreeNodeItem({
  node,
  selectedSlug,
  onSelect,
  collapsed,
  onToggleCollapse,
  depth = 0,
}: {
  node: DocTreeNodeData;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  collapsed: Record<string, boolean>;
  onToggleCollapse: (slug: string) => void;
  depth?: number;
}) {
  const indent = depth * 12; // left indent per depth level
  const basePadding = 10; // always keep a small left margin for the icon
  const isCollapsed = node.type === "folder" && collapsed[node.slug];

  if (node.type === "file") {
    return (
      <button
        type="button"
        className={`docs-file flex w-full items-center gap-2 text-left py-2 text-sm leading-relaxed transition-colors ${
          selectedSlug === node.slug
            ? "bg-tn-accent/20 text-tn-text"
            : "text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text"
        }`}
        style={{ paddingLeft: `${indent + basePadding}px` }}
        onClick={() => onSelect(node.slug)}
      >
        <FileText className="h-4 w-4" />
        <span className="flex-1 truncate">{node.title}</span>
      </button>
    );
  }

  return (
    <div className="docs-folder">
      <button
        type="button"
        className={`flex w-full items-center gap-1.5 py-2 pr-3 text-sm font-semibold rounded ${
          isCollapsed ? "text-tn-text-muted" : "text-tn-text"
        } hover:bg-tn-accent/10 focus:outline-none focus:ring-2 focus:ring-tn-accent/40`}
        style={{ paddingLeft: `${indent + basePadding}px` }}
        onClick={() => onToggleCollapse(node.slug)}
        aria-expanded={!isCollapsed}
      >
        <Folder className="h-4 w-4 text-tn-text-muted" />
        <span className="flex-1 truncate">{node.title}</span>
        <span className="text-xs w-4 text-right flex-shrink-0">
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>
      {!isCollapsed && (
        <div>
          {node.children.map((child) => (
            <DocTreeNodeItem
              key={`${child.type}-${child.slug}`}
              node={child}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
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
  const normalizedHref = href.replace(/^\//, "");

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

export function DocsPanel() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [docIndex, setDocIndex] = useState<Record<string, string>>({});
  const [backlinks, setBacklinks] = useState<Record<string, string[]>>({});
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
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const lower = filter.toLowerCase();

    // Ensure we have doc text available for searching
    const index = docIndex;

    return entries.filter((entry) => {
      const text = index[entry.slug] ?? "";
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
    async (slug: string, anchor?: string) => {
      const entry = entries.find((e) => e.slug === slug);
      if (!entry) return;
      const text = await entry.loader();
      setRawMd(text);
      setSelectedSlug(slug);

      // Parse walkthrough steps if applicable
      if (text.includes("<!-- walkthrough -->")) {
        const steps: Array<{ title: string; content: string }> = [];
        const parts = text.split(/^##\s+/m).slice(1);
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
        // Wait a tick to allow markdown render
        setTimeout(() => {
          const el = contentRef.current?.querySelector(`#${CSS.escape(anchor)}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    },
    [entries],
  );

  // Load default doc on first render
  useEffect(() => {
    if (selectedSlug === null && entries.length > 0) {
      const defaultDoc = entries.find((e) => e.slug === "overview" || e.slug === "introduction");
      loadDoc(defaultDoc?.slug ?? entries[0].slug);
    }
  }, [selectedSlug, entries, loadDoc]);

  // Build full-text index + backlinks for quick search and related docs
  useEffect(() => {
    let cancelled = false;

    async function buildIndex() {
      const index: Record<string, string> = {};
      const links: Record<string, Set<string>> = {};

      // Load all docs in parallel
      await Promise.all(
        entries.map(async (entry) => {
          const text = await entry.loader();
          if (cancelled) return;
          index[entry.slug] = text;

          // Find links to other docs
          const linkRegex = /\]\(([^)]+)\)/g;
          let match: RegExpExecArray | null;
          while ((match = linkRegex.exec(text))) {
            const href = match[1];
            const resolved = resolveLinkSlug(entry.slug, href);
            if (!resolved) continue;
            const targetSlug = resolved.slug;
            // Ignore self-references (e.g. intra-doc anchors)
            if (targetSlug === entry.slug) continue;
            if (!links[targetSlug]) links[targetSlug] = new Set();
            links[targetSlug].add(entry.slug);
          }
        }),
      );

      if (cancelled) return;

      setDocIndex(index);
      setBacklinks(
        Object.fromEntries(
          Object.entries(links).map(([k, v]) => [k, Array.from(v)]),
        ),
      );
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

  return (
    <div className="flex h-full">
      <div className="docs-sidebar w-64 min-w-[220px] border-r border-tn-border bg-tn-panel/80 flex flex-col">
        <div className="p-3 border-b border-tn-border">
          <div className="text-xs font-semibold text-tn-text-muted">Docs</div>
          <input
            className="mt-2 w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-sm text-tn-text focus:outline-none focus:border-tn-accent"
            placeholder="Search docs…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredTree.map((node) => (
            <DocTreeNodeItem
              key={`${node.type}-${node.slug}`}
              node={node}
              selectedSlug={selectedSlug}
              onSelect={loadDoc}
              collapsed={collapsedFolders}
              onToggleCollapse={(slug) =>
                setCollapsedFolders((prev) => ({ ...prev, [slug]: !prev[slug] }))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 docs-content" id="docs-content" ref={contentRef}>
        {selectedSlug ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-tn-text">{titleFromSlug(selectedSlug)}</div>
                <div className="text-[11px] text-tn-text-muted">{selectedSlug}</div>
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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-tn-text">{walkthroughSteps[walkthroughStep]?.title}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border border-tn-border bg-tn-panel px-2 py-1 text-xs text-tn-text hover:bg-tn-panel/80 disabled:opacity-50"
                      disabled={walkthroughStep === 0}
                      onClick={() => setWalkthroughStep((s) => Math.max(0, s - 1))}
                    >
                      Previous
                    </button>
                    <button
                      className="rounded border border-tn-border bg-tn-panel px-2 py-1 text-xs text-tn-text hover:bg-tn-panel/80 disabled:opacity-50"
                      disabled={walkthroughStep >= walkthroughSteps.length - 1}
                      onClick={() => setWalkthroughStep((s) => Math.min(walkthroughSteps.length - 1, s + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
                      const hrefStr = String(href ?? "");
                      const isHandled = handleLinkClick(hrefStr);

                      return (
                        <a
                          {...props}
                          href={hrefStr}
                          onClick={(e) => {
                            if (isHandled) {
                              e.preventDefault();
                            }
                          }}
                          className={
                            isHandled ? "text-tn-accent hover:underline" : "text-tn-text-muted hover:underline"
                          }
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {walkthroughSteps[walkthroughStep]?.content ?? ""}
                </ReactMarkdown>

                <div className="text-xs text-tn-text-muted">
                  Step {walkthroughStep + 1} of {walkthroughSteps.length}
                </div>
              </div>
            ) : (
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
                      const hrefStr = String(href ?? "");
                      const isHandled = handleLinkClick(hrefStr);

                      return (
                        <a
                          {...props}
                          href={hrefStr}
                          onClick={(e) => {
                            if (isHandled) {
                              e.preventDefault();
                            }
                          }}
                          className={
                            isHandled ? "text-tn-accent hover:underline" : "text-tn-text-muted hover:underline"
                          }
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {rawMd}
                </ReactMarkdown>

                {backlinks[selectedSlug]?.length > 0 && (
                  <div className="mt-6 border-t border-tn-border pt-4">
                    <div className="text-sm font-semibold text-tn-text">Referenced by</div>
                    <ul className="mt-2 list-none space-y-1 text-tn-text-muted">
                      {backlinks[selectedSlug].map((ref) => (
                        <li key={ref} className="pl-2">
                          <button
                            type="button"
                            className="text-tn-accent hover:underline"
                            onClick={() => loadDoc(ref)}
                          >
                            {titleFromSlug(ref)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-tn-text-muted">Select a document to view.</div>
        )}
      </div>
    </div>
  );
}
