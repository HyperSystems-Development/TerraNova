import { normalizeImport } from "@/utils/fileTypeDetection";
import { jsonToGraph } from "@/utils/jsonToGraph";
import type { ClipboardData } from "@/utils/clipboard";

export interface ParsedDocSnippet {
  label?: string;
  difficulty?: string;
  snippetJson: string;
}

export interface WalkthroughStep {
  title: string;
  content: string;
}

export interface DocTreeFilterNode {
  type: "file" | "folder";
  slug: string;
  children?: DocTreeFilterNode[];
}

export function parseSnippetFence(value: string): ParsedDocSnippet {
  const lines = value.trim().split("\n");
  let label: string | undefined;
  let difficulty: string | undefined;
  let snippetJson = value.trim();

  if (lines.length > 0 && !lines[0].trim().startsWith("{") && !lines[0].trim().startsWith("[")) {
    const header = lines[0].trim();
    const diffMatch = /\[([^\]]+)\]/.exec(header);
    difficulty = diffMatch?.[1];
    label = header.replace(/\[[^\]]+\]/, "").trim();
    snippetJson = lines.slice(1).join("\n").trim();
  }

  return { label, difficulty, snippetJson };
}

export function stripDocComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

export function extractWalkthroughSteps(markdown: string): WalkthroughStep[] {
  if (!markdown.includes("<!-- walkthrough -->")) return [];
  const cleaned = stripDocComments(markdown);
  return cleaned
    .split(/^##\s+/m)
    .slice(1)
    .map((part) => {
      const [titleLine, ...rest] = part.split("\n");
      return {
        title: titleLine.trim(),
        content: rest.join("\n").trim(),
      };
    })
    .filter((step) => step.title.length > 0);
}

export function getDefaultDocSlug(folderSlug: string, slugs: string[]): string | null {
  const preferred = slugs.find((slug) => slug.toLowerCase() === `${folderSlug}/readme`.toLowerCase());
  if (preferred) return preferred;

  const index = slugs.find((slug) => slug.toLowerCase() === `${folderSlug}/index`.toLowerCase());
  if (index) return index;

  return slugs.find((slug) => slug.startsWith(`${folderSlug}/`)) ?? null;
}

export function filterDocTree(
  nodes: DocTreeFilterNode[],
  allowedSlugs: ReadonlySet<string>,
): DocTreeFilterNode[] {
  const filtered: DocTreeFilterNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      if (allowedSlugs.has(node.slug)) filtered.push(node);
      continue;
    }

    const childNodes = filterDocTree(node.children ?? [], allowedSlugs);
    if (childNodes.length > 0) {
      filtered.push({ ...node, children: childNodes });
    }
  }

  return filtered;
}

export function findFirstFileSlug(nodes: DocTreeFilterNode[]): string | null {
  for (const node of nodes) {
    if (node.type === "file") return node.slug;
    const childMatch = findFirstFileSlug(node.children ?? []);
    if (childMatch) return childMatch;
  }
  return null;
}

export interface DocSnippetGraphData {
  clipboardData: ClipboardData;
  outputNodeId: string | null;
}

export function buildSnippetGraphData(
  snippetJson: string,
  idPrefix = "doc_snippet",
): DocSnippetGraphData {
  const parsed = JSON.parse(snippetJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Snippet must be a JSON object.");
  }

  const normalized = normalizeImport(parsed as Record<string, unknown>);
  const { nodes, edges } = jsonToGraph(normalized, 0, 0, idPrefix);
  const outputNodeId = nodes[nodes.length - 1]?.id ?? null;

  const preparedNodes = nodes.map((node) => {
    const data = (node.data as Record<string, unknown>) ?? {};
    return {
      ...node,
      selected: true,
      data: node.id === outputNodeId
        ? { ...data, _outputNode: true }
        : data,
    };
  });

  return {
    outputNodeId,
    clipboardData: {
      version: "1",
      nodes: preparedNodes,
      edges: structuredClone(edges),
    },
  };
}
