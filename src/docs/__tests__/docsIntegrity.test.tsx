/* @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { jsonToGraph } from "@/utils/jsonToGraph";
import { isLegacyTypeKey } from "@/nodes/shared/legacyTypes";

type DocRecord = {
  relPath: string;
  slug: string;
  text: string;
  headingIds: Set<string>;
};

type LinkIssue = {
  file: string;
  href: string;
  resolved: string;
};

type AnchorIssue = {
  file: string;
  href: string;
  target: string;
  anchor: string;
};

type FenceIssue = {
  file: string;
  lang: string;
  message: string;
};

type SnippetTypeIssue = {
  file: string;
  label: string;
  type: string;
  reason: "legacy" | "unregistered";
};

type ResolvedDocLink = {
  slug: string;
  anchor?: string;
} | null;

const DOCS_ROOT = path.join(process.cwd(), "src", "docs");
const NODES_INDEX = path.join(process.cwd(), "src", "nodes", "index.ts");

function listMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function slugFromFilePath(filePath: string): string {
  const relPath = toPosixPath(path.relative(DOCS_ROOT, filePath));
  return relPath.replace(/\.md$/i, "");
}

function resolveDocLink(currentSlug: string, href: string): ResolvedDocLink {
  if (!href || href.startsWith("http") || href.startsWith("mailto:")) return null;

  if (href.startsWith("#")) {
    return { slug: currentSlug, anchor: href.slice(1) };
  }

  let normalizedHref = href.replace(/^\//, "");
  normalizedHref = normalizedHref.replace(/^docs\//, "");

  const [pathPart, anchorPart] = normalizedHref.split("#", 2);
  const baseParts = currentSlug.split("/");
  baseParts.pop();

  for (const part of pathPart.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  let resolvedSlug = baseParts.join("/");
  if (resolvedSlug.endsWith(".md")) {
    resolvedSlug = resolvedSlug.slice(0, -3);
  }

  return {
    slug: resolvedSlug,
    anchor: anchorPart || undefined,
  };
}

function extractHeadingIds(markdown: string): Set<string> {
  const html = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
      {markdown}
    </ReactMarkdown>,
  );
  const ids = new Set<string>();
  for (const match of html.matchAll(/<h[1-6]\s+id="([^"]+)"/g)) {
    ids.add(match[1]);
  }
  return ids;
}

function collectDocs(): DocRecord[] {
  return listMarkdownFiles(DOCS_ROOT).map((filePath) => {
    const relPath = toPosixPath(path.relative(DOCS_ROOT, filePath));
    const text = fs.readFileSync(filePath, "utf8");
    return {
      relPath,
      slug: slugFromFilePath(filePath),
      text,
      headingIds: extractHeadingIds(text),
    };
  });
}

function collectActiveNodeTypes(): Set<string> {
  const nodeIndex = fs.readFileSync(NODES_INDEX, "utf8");
  const startToken = "export const nodeTypes: Record<string, ComponentType<any>> = {";
  const start = nodeIndex.indexOf(startToken);
  const end = nodeIndex.indexOf("\n};", start);
  if (start < 0 || end < 0) {
    throw new Error("Could not locate nodeTypes registry in src/nodes/index.ts");
  }

  const body = nodeIndex.slice(start + startToken.length, end);
  const types = new Set<string>();
  for (const match of body.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z0-9_]+))\s*:/gm)) {
    const type = match[1] ?? match[2];
    if (type) types.add(type);
  }
  return types;
}

function collectInternalLinkIssues(docs: DocRecord[]): LinkIssue[] {
  const docsBySlug = new Map(docs.map((doc) => [doc.slug.toLowerCase(), doc]));
  const issues: LinkIssue[] = [];

  for (const doc of docs) {
    for (const match of doc.text.matchAll(/(?<!!)\]\(([^)]+)\)/g)) {
      const href = match[1];
      const resolved = resolveDocLink(doc.slug, href);
      if (!resolved) continue;
      if (!docsBySlug.has(resolved.slug.toLowerCase())) {
        issues.push({
          file: doc.relPath,
          href,
          resolved: resolved.slug,
        });
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.href.localeCompare(b.href) ||
    a.resolved.localeCompare(b.resolved),
  );
}

function collectBrokenAnchorIssues(docs: DocRecord[]): AnchorIssue[] {
  const docsBySlug = new Map(docs.map((doc) => [doc.slug.toLowerCase(), doc]));
  const issues: AnchorIssue[] = [];

  for (const doc of docs) {
    for (const match of doc.text.matchAll(/(?<!!)\]\(([^)]+)\)/g)) {
      const href = match[1];
      const resolved = resolveDocLink(doc.slug, href);
      if (!resolved?.anchor) continue;

      const targetDoc = docsBySlug.get(resolved.slug.toLowerCase());
      if (!targetDoc) continue;
      if (!targetDoc.headingIds.has(resolved.anchor)) {
        issues.push({
          file: doc.relPath,
          href,
          target: targetDoc.slug,
          anchor: resolved.anchor,
        });
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.href.localeCompare(b.href) ||
    a.target.localeCompare(b.target),
  );
}

function collectFenceIssues(docs: DocRecord[]): FenceIssue[] {
  const issues: FenceIssue[] = [];

  for (const doc of docs) {
    for (const match of doc.text.matchAll(/```(nodegraph|curve|bounds|snippet)\n([\s\S]*?)\n```/g)) {
      const lang = match[1];
      const body = match[2].trim();

      try {
        if (lang === "nodegraph") {
          const parsed = JSON.parse(body) as { nodes?: unknown; edges?: unknown };
          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            throw new Error("nodegraph fences must define nodes[] and edges[]");
          }
          continue;
        }

        if (lang === "bounds") {
          const parsed = JSON.parse(body) as { min?: unknown; max?: unknown };
          if (typeof parsed.min !== "number" || typeof parsed.max !== "number") {
            throw new Error("bounds fences must define numeric min/max");
          }
          continue;
        }

        if (lang === "curve") {
          const lines = body.split("\n");
          const pointsJson =
            lines[0] && !lines[0].trim().startsWith("[") && !lines[0].trim().startsWith("{")
              ? lines.slice(1).join("\n").trim()
              : body;
          const parsed = JSON.parse(pointsJson);
          if (!Array.isArray(parsed)) {
            throw new Error("curve fences must parse to an array");
          }
          continue;
        }

        const lines = body.split("\n");
        const snippetJson =
          lines[0] && !lines[0].trim().startsWith("{") && !lines[0].trim().startsWith("[")
            ? lines.slice(1).join("\n").trim()
            : body;
        const parsed = JSON.parse(snippetJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("snippet fences must parse to a JSON object");
        }
      } catch (error) {
        issues.push({
          file: doc.relPath,
          lang,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.lang.localeCompare(b.lang) ||
    a.message.localeCompare(b.message),
  );
}

function collectSnippetTypeIssues(docs: DocRecord[], activeNodeTypes: Set<string>): SnippetTypeIssue[] {
  const issues: SnippetTypeIssue[] = [];

  for (const doc of docs) {
    for (const match of doc.text.matchAll(/```snippet\r?\n([\s\S]*?)\r?\n```/g)) {
      const body = match[1].trim();
      const lines = body.split(/\r?\n/);
      const hasHeader =
        !!lines[0] &&
        !lines[0].trim().startsWith("{") &&
        !lines[0].trim().startsWith("[");
      const label = hasHeader ? lines[0].trim() : doc.slug;
      const snippetJson = hasHeader ? lines.slice(1).join("\n").trim() : body;
      const parsed = JSON.parse(snippetJson) as Record<string, unknown>;
      const { nodes } = jsonToGraph(parsed);

      for (const node of nodes) {
        const type = String(node.type ?? "");
        if (isLegacyTypeKey(type)) {
          issues.push({ file: doc.relPath, label, type, reason: "legacy" });
          continue;
        }
        if (!activeNodeTypes.has(type)) {
          issues.push({ file: doc.relPath, label, type, reason: "unregistered" });
        }
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.label.localeCompare(b.label) ||
    a.type.localeCompare(b.type) ||
    a.reason.localeCompare(b.reason),
  );
}

describe("docs content integrity", () => {
  const docs = collectDocs();
  const activeNodeTypes = collectActiveNodeTypes();

  it("keeps internal markdown links pointed at real docs pages", () => {
    expect(collectInternalLinkIssues(docs)).toEqual([]);
  });

  it("keeps internal heading links pointed at rendered heading ids", () => {
    expect(collectBrokenAnchorIssues(docs)).toEqual([]);
  });

  it("keeps custom docs fences parseable", () => {
    expect(collectFenceIssues(docs)).toEqual([]);
  });

  it("keeps runnable snippet fences on active, non-legacy node types", () => {
    expect(collectSnippetTypeIssues(docs, activeNodeTypes)).toEqual([]);
  });
});
