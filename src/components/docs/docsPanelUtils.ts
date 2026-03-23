import { normalizeImport } from "@/utils/fileTypeDetection";
import { jsonToGraph } from "@/utils/jsonToGraph";
import type { ClipboardData } from "@/utils/clipboard";
import type { DocNodeGraphProps } from "./DocNodeGraph";

export interface ParsedDocSnippet {
  label?: string;
  difficulty?: string;
  snippetJson: string;
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

export function getDefaultDocSlug(folderSlug: string, slugs: string[]): string | null {
  const preferred = slugs.find((slug) => slug.toLowerCase() === `${folderSlug}/readme`.toLowerCase());
  if (preferred) return preferred;

  const index = slugs.find((slug) => slug.toLowerCase() === `${folderSlug}/index`.toLowerCase());
  if (index) return index;

  return slugs.find((slug) => slug.startsWith(`${folderSlug}/`)) ?? null;
}

export interface DocSnippetGraphData {
  clipboardData: ClipboardData;
  outputNodeId: string | null;
}

const DOC_GRAPH_CATEGORY_PREFIX: Record<string, string> = {
  Curve: "curve",
  Material: "material",
  Pattern: "scanner",
  Scanner: "scanner",
  Prop: "prop",
  Position: "position",
  Assignment: "material",
  Vector: "position",
  Environment: "framework",
  Tint: "framework",
  BlockMask: "framework",
  Directionality: "framework",
};

function inferDocGraphCategory(typeName: string): string {
  const [prefix, bareType] = typeName.includes(":") ? typeName.split(":", 2) : [null, typeName];
  if (prefix && DOC_GRAPH_CATEGORY_PREFIX[prefix]) {
    return DOC_GRAPH_CATEGORY_PREFIX[prefix];
  }

  const name = bareType.toLowerCase();
  if (name.includes("noise") || name.includes("cell")) return "generative";
  if (name.includes("warp") || name.includes("clamp") || name.includes("sample") || name.includes("cache")) return "filter";
  if (name.includes("height") || name.includes("value") || name.includes("override") || name.includes("anchor")) return "position";
  if (name.includes("terrain") || name.includes("export") || name.includes("import")) return "terrain";
  if (name.includes("ellipsoid") || name.includes("plane") || name.includes("cylinder") || name.includes("cuboid") || name.includes("shell")) return "shape";
  return "math";
}

function summarizeNodeFields(fields: Record<string, unknown>): string | undefined {
  const summary = Object.entries(fields)
    .filter(([key, value]) => key !== "Skip" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean"))
    .slice(0, 2)
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(" • ");

  return summary || undefined;
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

export function buildSnippetDocNodeGraph(
  snippetJson: string,
  idPrefix = "doc_snippet_preview",
): DocNodeGraphProps {
  const { clipboardData, outputNodeId } = buildSnippetGraphData(snippetJson, idPrefix);
  const { nodes, edges } = clipboardData;
  const yValues = nodes.map((node) => node.position.y);
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 0;
  const height = Math.max(200, Math.min(360, Math.round((yMax - yMin) + 180)));

  return {
    height,
    clipboardData,
    outputNodeId,
    nodes: nodes.map((node) => {
      const data = (node.data as Record<string, unknown>) ?? {};
      const type = typeof data.type === "string" ? data.type : node.type;
      const fields = ((data.fields as Record<string, unknown> | undefined) ?? {});
      return {
        id: node.id,
        label: String(type ?? "Node"),
        category: inferDocGraphCategory(String(node.type ?? type ?? "Node")),
        sub: summarizeNodeFields(fields),
        x: node.position.x,
        y: node.position.y,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      label: edge.targetHandle && edge.targetHandle !== "input" ? edge.targetHandle : undefined,
    })),
  };
}

export interface DocTreeFileNode {
  type: "file";
  slug: string;
}

export interface DocTreeFolderNode {
  type: "folder";
  slug: string;
  children: DocTreeNode[];
}

export type DocTreeNode = DocTreeFileNode | DocTreeFolderNode;

export interface WalkthroughStep {
  title: string;
  content: string;
}

function isWalkthroughStepTitle(title: string): boolean {
  return /^Step\b/i.test(title);
}

export function stripDocComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

export function extractWalkthroughSteps(markdown: string): WalkthroughStep[] {
  const walkthroughMatch = /<!--\s*walkthrough\s*-->/.exec(markdown);
  if (!walkthroughMatch) return [];

  const afterWalkthrough = markdown.slice(walkthroughMatch.index + walkthroughMatch[0].length);
  const cleaned = stripDocComments(afterWalkthrough);
  const sections = cleaned.split(/^##\s+/m).slice(1);

  return sections.map((section) => {
    const newlineIndex = section.indexOf("\n");
    const title = newlineIndex >= 0 ? section.slice(0, newlineIndex).trim() : section.trim();
    const content = newlineIndex >= 0 ? section.slice(newlineIndex + 1).trim() : "";
    return { title, content };
  }).filter((section) => isWalkthroughStepTitle(section.title));
}

export function filterDocTree(nodes: DocTreeNode[], allowed: Set<string>): DocTreeNode[] {
  const result: DocTreeNode[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      if (allowed.has(node.slug)) result.push(node);
    } else {
      const filteredChildren = filterDocTree(node.children, allowed);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }
  return result;
}

export function findFirstFileSlug(nodes: DocTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.type === "file") return node.slug;
    const found = findFirstFileSlug(node.children);
    if (found) return found;
  }
  return null;
}

export function buildDocNodeGraphMarkdownBlock(
  graph: DocNodeGraphProps | string,
): string {
  const body = typeof graph === "string"
    ? graph.trim()
    : JSON.stringify(graph, null, 2);
  return `\`\`\`nodegraph\n${body}\n\`\`\``;
}
