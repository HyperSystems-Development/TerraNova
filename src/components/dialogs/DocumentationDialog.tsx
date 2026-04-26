import { useState, useEffect, useCallback } from "react";
import { readTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { BookOpen, FileText, History, HelpCircle, X, ChevronRight } from "lucide-react";

interface DocEntry {
  id: string;
  title: string;
  path: string;
  description: string;
  category: "guide" | "tutorial" | "reference" | "about";
}

const DOCS: DocEntry[] = [
  {
    id: "readme",
    title: "Getting Started",
    path: "README.md",
    description: "Overview of TerraNova features and quick start guide",
    category: "guide",
  },
  {
    id: "sky-islands",
    title: "Sky Islands Tutorial",
    path: "docs/tutorials/SKY_ISLANDS_WALKTHROUGH.md",
    description: "Step-by-step guide to building a floating islands biome",
    category: "tutorial",
  },
  {
    id: "changelog",
    title: "Changelog",
    path: "docs/CHANGELOG.md",
    description: "Version history and release notes",
    category: "reference",
  },
  {
    id: "about",
    title: "About TerraNova",
    path: "docs/planning/ABOUT.md",
    description: "What TerraNova is and how it fits with other tools",
    category: "about",
  },
  {
    id: "ai-transparency",
    title: "AI Transparency",
    path: "docs/AI_TRANSPARENCY.md",
    description: "Information about AI usage in this project",
    category: "about",
  },
];

interface DocumentationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DocumentationDialog({ open, onClose }: DocumentationDialogProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>("readme");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDoc = useCallback(async (docId: string) => {
    const doc = DOCS.find((d) => d.id === docId);
    if (!doc) return;

    setLoading(true);
    setError(null);

    try {
      // Try to read from app bundle resources
      const text = await readTextFile(doc.path, {
        baseDir: BaseDirectory.Resource,
      });
      setContent(text);
    } catch (err) {
      // Fallback: show placeholder content
      setError(`Could not load ${doc.title}. File not found in app bundle.`);
      setContent(generatePlaceholderContent(doc));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && selectedDocId) {
      loadDoc(selectedDocId);
    }
  }, [open, selectedDocId, loadDoc]);

  const selectedDoc = DOCS.find((d) => d.id === selectedDocId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[800px] h-[600px] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 bg-tn-surface border-r border-tn-border flex flex-col">
          <div className="p-4 border-b border-tn-border">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-tn-accent" />
              Documentation
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {DOCS.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedDocId === doc.id
                    ? "bg-tn-accent/20 border border-tn-accent/30"
                    : "hover:bg-tn-panel border border-transparent"
                }`}
              >
                <div className="flex items-start gap-2">
                  <DocIcon category={doc.category} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-tn-text truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-tn-text-muted mt-1 line-clamp-2">
                      {doc.description}
                    </div>
                  </div>
                  {selectedDocId === doc.id && (
                    <ChevronRight className="w-4 h-4 text-tn-accent shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-tn-panel">
          <div className="flex items-center justify-between p-4 border-b border-tn-border">
            <div>
              <h3 className="text-lg font-semibold text-tn-text">
                {selectedDoc?.title}
              </h3>
              <p className="text-xs text-tn-text-muted">{selectedDoc?.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-tn-surface rounded-md transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-tn-text-muted" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-tn-text-muted">Loading...</div>
              </div>
            ) : error ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-4 mb-4">
                <p className="text-sm text-amber-400">{error}</p>
              </div>
            ) : null}

            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownContent content={content} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocIcon({ category }: { category: DocEntry["category"] }) {
  switch (category) {
    case "guide":
      return <HelpCircle className="w-4 h-4 text-tn-accent shrink-0 mt-0.5" />;
    case "tutorial":
      return <BookOpen className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />;
    case "reference":
      return <History className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
    case "about":
      return <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />;
  }
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer - convert basic syntax to HTML
  const rendered = renderMarkdown(content);

  return (
    <div
      className="space-y-4 text-sm text-tn-text leading-relaxed"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

function renderMarkdown(md: string): string {
  return (
    md
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-tn-surface p-3 rounded-md overflow-x-auto font-mono text-xs"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-tn-surface px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-tn-text mt-6 mb-3">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-tn-text mt-8 mb-4 border-b border-tn-border pb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-tn-text mb-6">$1</h1>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-tn-accent hover:underline" target="_blank" rel="noopener">$1</a>')
      // Blockquotes
      .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-tn-accent pl-4 italic text-tn-text-muted">$1</blockquote>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-tn-border my-6" />')
      // Paragraphs (must be last)
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<[hb]|<bl|<li|<pr|<hr)(.+)$/gm, '<p class="mb-4">$1</p>')
  );
}

function generatePlaceholderContent(doc: DocEntry): string {
  return `# ${doc.title}

${doc.description}

---

*This documentation file could not be loaded. It may not be bundled with the application.*

**Expected path:** \`${doc.path}\`

To view this documentation, please visit the project repository or check the local docs folder.`;
}
