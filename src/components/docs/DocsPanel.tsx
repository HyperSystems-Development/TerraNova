import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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

type DocTreeNode =
  | { type: "folder"; title: string; slug: string; children: DocTreeNode[] }
  | { type: "file"; title: string; slug: string };

function slugFromPath(path: string) {
  // Vite returns paths like "../docs/overview.md" or "../../docs/guides/foo.md"
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(/docs\/(.*)\.md$/);
  return match ? match[1] : normalized;
}

function titleFromSlug(slug: string) {
  const name = slug.split("/").pop() ?? slug;
  // Use a simple title case conversion for file names
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDocTree(entries: DocEntry[]): DocTreeNode[] {
  const root: DocTreeNode = { type: "folder", title: "Docs", slug: "", children: [] };

  for (const entry of entries) {
    const parts = entry.slug.split("/");
    let current = root;
    let currentSlugParts: string[] = [];

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      currentSlugParts.push(part);
      const isLast = i === parts.length - 1;
      const slug = currentSlugParts.join("/");

      if (isLast) {
        // file
        current.children.push({ type: "file", title: entry.title, slug });
      } else {
        let nextFolder = current.children.find(
          (c) => c.type === "folder" && c.title === part,
        ) as DocTreeNode | undefined;
        if (!nextFolder) {
          nextFolder = { type: "folder", title: titleFromSlug(part), slug, children: [] };
          current.children.push(nextFolder);
        }
        current = nextFolder;
      }
    }
  }

  return root.children;
}

type ResolvedLink = { slug: string; anchor?: string } | null;

function resolveLinkSlug(currentSlug: string, href: string): ResolvedLink {
  if (!href || href.startsWith("http") || href.startsWith("mailto:")) return null;

  // Anchor within the same page
  if (href.startsWith("#")) {
    return { slug: currentSlug, anchor: href.slice(1) };
  }

  // Relative path
  const baseParts = currentSlug.split("/");
  baseParts.pop();
  const [pathPart, anchorPart] = href.split("#", 2);
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
  const [collapsedHeaders, setCollapsedHeaders] = useState<Record<string, boolean>>({});
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

    function filterNode(node: DocTreeNode): DocTreeNode | null {
      if (node.type === "file") {
        return allowed.has(node.slug) ? node : null;
      }
      const childNodes = node.children
        .map(filterNode)
        .filter((n): n is DocTreeNode => n !== null);
      if (childNodes.length > 0) {
        return { ...node, children: childNodes };
      }
      return null;
    }

    return docTree
      .map(filterNode)
      .filter((n): n is DocTreeNode => n !== null);
  }, [filter, docTree, filtered]);

  const filteredGrouped = useMemo(() => {
    const map = new Map<string, DocEntry[]>();
    for (const entry of filtered) {
      const group = entry.slug.includes("/") ? entry.slug.split("/")[0] : "Root";
      const arr = map.get(group) ?? [];
      arr.push(entry);
      map.set(group, arr);
    }
    return map;
  }, [filtered]);

  const loadDoc = useCallback(
    async (slug: string, anchor?: string) => {
      const entry = entries.find((e) => e.slug === slug);
      if (!entry) return;
      const text = await entry.loader();
      setRawMd(text);
      setSelectedSlug(slug);

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
      <div className="w-64 min-w-[220px] border-r border-tn-border bg-tn-panel/80 flex flex-col">
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
          {[...filteredGrouped.entries()].map(([group, groupEntries]) => (
            <div key={group} className="pt-3">
              <div className="px-3 text-[11px] uppercase tracking-wide text-tn-text-muted">{group}</div>
              <div className="mt-1">
                {groupEntries.map((entry) => (
                  <button
                    key={entry.slug}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedSlug === entry.slug
                        ? "bg-tn-accent/20 text-tn-text"
                        : "text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text"
                    }`}
                    onClick={() => loadDoc(entry.slug)}
                  >
                    {entry.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 docs-content" id="docs-content">
        {selectedSlug ? (
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
        ) : (
          <div className="text-tn-text-muted">Select a document to view.</div>
        )}
      </div>
    </div>
  );
}
