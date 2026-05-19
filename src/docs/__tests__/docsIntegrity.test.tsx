/* @vitest-environment node */

import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { extractDocSourceContext } from "@/components/docs/docsPanelUtils";
import { DENSITY_TYPES, evaluateDensityGrid, findDensityRoot } from "@/utils/density";
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

type NodegraphLabelIssue = {
  file: string;
  label: string;
  nodeLabel: string;
  category: string;
  expected: string[];
};

type ConceptualNodegraphIssue = {
  file: string;
  label: string;
  category: string;
  nodeLabel: string;
};

type SourceContextIssue = {
  file: string;
  reason: "missing-source-context";
};

type TerrainSourcePoolIssue = {
  file: string;
  missing: Array<"Examples" | "Experimental" | "Generative">;
};

type TerrainExampleIssue = {
  file: string;
  label: string;
  reason:
    | "invalid-json"
    | "terrain-out-missing-input"
    | "terrain-out-has-no-density-ancestor"
    | "snippet-has-no-density-root"
    | "snippet-evaluates-non-finite"
    | "snippet-evaluates-empty";
  detail?: string;
};

type StalePreviewClaimIssue = {
  file: string;
  phrase: string;
  current: string;
};

type ResolvedDocLink = {
  slug: string;
  anchor?: string;
} | null;

const DOCS_ROOT = path.join(process.cwd(), "src", "docs");
const NODES_INDEX = path.join(process.cwd(), "src", "nodes", "index.ts");
const CUSTOM_FENCE_LANGS = ["nodegraph", "curve", "bounds", "snippet"] as const;
type CustomFenceLang = (typeof CUSTOM_FENCE_LANGS)[number];

const SOURCE_CONTEXT_DOCS = [
  "reference/README.md",
  "reference/node-effects.md",
  "glossary/README.md",
  "glossary/asset-node-editor-nodes.md",
  "guides/setup-data-flow-first-steps.md",
  "guides/understanding-basic-terrain-generation.md",
  "guides/world/node-combinations.md",
  "guides/world/biome-system.md",
  "guides/terrain/terrain-math-explained.md",
  "guides/terrain/terrain-types.md",
  "guides/terrain/terrain-types-advanced.md",
  "guides/terrain/terrain-types-expert.md",
  "troubleshooting.md",
  "walkthroughs/data-flow-first-steps.md",
  "walkthroughs/basic-terrain-generation.md",
  "walkthroughs/terrain-and-caves.md",
  "walkthroughs/sky-islands.md",
] as const;

const TERRAIN_EXAMPLE_DOCS = [
  "reference/terrain-types.md",
  "guides/understanding-basic-terrain-generation.md",
  "guides/world/node-combinations.md",
  "guides/terrain/terrain-math-explained.md",
  "guides/terrain/terrain-types.md",
  "guides/terrain/terrain-types-advanced.md",
  "guides/terrain/terrain-types-expert.md",
  "guides/terrain/terrain-experimental.md",
  "walkthroughs/basic-terrain-generation.md",
  "walkthroughs/terrain-and-caves.md",
  "walkthroughs/sky-islands.md",
] as const;

const DENSITY_NODEGRAPH_CATEGORIES = new Set([
  "density",
  "terrain",
  "generative",
  "filter",
  "math",
  "position",
  "shape",
]);

const NODEGRAPH_LABEL_CHECK_EXCLUDED_DOCS = new Set([
  "contributing.md",
  "templates/guide-template.md",
  "templates/walkthrough-template.md",
  "guides/setup-data-flow-first-steps.md",
  "walkthroughs/data-flow-first-steps.md",
]);

const NODEGRAPH_OUTPUT_LABELS = new Set([
  "Output",
  "Terrain Out",
]);

const NODEGRAPH_CATEGORY_PREFIXES: Record<string, string[]> = {
  assignment: ["Assignment"],
  blockmask: ["BlockMask"],
  curve: ["Curve"],
  directionality: ["Directionality"],
  environment: ["Environment"],
  material: ["Material"],
  pattern: ["Pattern"],
  position: ["Position"],
  prop: ["Prop"],
  scanner: ["Scanner"],
  tint: ["Tint"],
  vector: ["Vector"],
};

const CONCEPTUAL_NODEGRAPH_CATEGORIES = new Set([
  "biome",
  "scanner",
  "worldstruct",
]);

const PREVIEW_STALE_CLAIM_RULES: Array<{
  pattern: RegExp;
  current: string;
}> = [
  {
    pattern: /`GradientWarp`[^.\n]*(?:returns\s+`?0(?:\.0)?`?|completely absent|only appears in-game|test exclusively in-game)/i,
    current: "`GradientWarp` is approximated in preview through finite-difference gradient sampling.",
  },
  {
    pattern: /`VectorWarp`[^.\n]*(?:returns\s+`?0(?:\.0)?`?|invisible)/i,
    current: "`VectorWarp` is approximated in preview from the vector provider direction and connected magnitude.",
  },
  {
    pattern: /`BaseHeight`[^.\n]*returns\s+`?0(?:\.0)?`?/i,
    current: "`BaseHeight` reads the named content field in the preview evaluator.",
  },
  {
    pattern: /`CellWallDistance`[^.\n]*(?:returns\s+`?0(?:\.0)?`?|Double\.MAX_VALUE)/i,
    current: "`CellWallDistance` reads the side-channel populated by upstream cell-noise evaluation, with a zero fallback.",
  },
  {
    pattern: /`Terrain`[^.\n]*(?:preview returns\s+`?0(?:\.0)?`?|returns\s+`?0(?:\.0)?`?)/i,
    current: "`Terrain` is previewed as an approximation of base height minus Y.",
  },
  {
    pattern: /`YSampled`[^.\n]*hardcoded\s*-?4/i,
    current: "`YSampled` uses the configured sample distance.",
  },
  {
    pattern: /`MultiMix`[^.\n]*(?:index overflow|>4 inputs[^.\n]*banding|breaks after four)/i,
    current: "`MultiMix` sorts configured keys and is not limited to four density bands.",
  },
];

const TERRAIN_SOURCE_POOL_DOCS = [
  "reference/README.md",
  "reference/node-effects.md",
  "reference/reading-the-graph.md",
  "reference/curves.md",
  "glossary/README.md",
  "glossary/asset-node-editor-nodes.md",
  "guides/setup-data-flow-first-steps.md",
  "guides/understanding-basic-terrain-generation.md",
  "guides/world/node-combinations.md",
  "guides/world/biome-system.md",
  "guides/terrain/terrain-math-explained.md",
  "guides/terrain/terrain-types.md",
  "walkthroughs/data-flow-first-steps.md",
  "walkthroughs/basic-terrain-generation.md",
  "walkthroughs/terrain-and-caves.md",
] as const;

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

function parseFenceOpener(line: string): { marker: "`" | "~"; length: number; lang: string } | null {
  const match = /^(?: {0,3}|\t?)(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return null;

  const markerText = match[1];
  const info = match[2].trim();
  const marker = markerText[0] as "`" | "~";
  return {
    marker,
    length: markerText.length,
    lang: info.split(/\s+/, 1)[0] ?? "",
  };
}

function isFenceCloser(line: string, marker: "`" | "~", minLength: number): boolean {
  const trimmed = line.trim();
  return trimmed.length >= minLength && [...trimmed].every((char) => char === marker);
}

function collectFenceBlocks(
  doc: DocRecord,
  lang: CustomFenceLang,
): Array<{ label: string; jsonText: string; body: string }> {
  const blocks: Array<{ label: string; jsonText: string; body: string }> = [];
  const lines = doc.text.split(/\r?\n/);
  let index = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const opener = parseFenceOpener(lines[lineIndex]);
    if (!opener) continue;

    const bodyLines: string[] = [];
    let closeIndex = lineIndex + 1;
    for (; closeIndex < lines.length; closeIndex += 1) {
      if (isFenceCloser(lines[closeIndex], opener.marker, opener.length)) break;
      bodyLines.push(lines[closeIndex]);
    }

    lineIndex = closeIndex;
    if (opener.lang !== lang) continue;

    index += 1;
    const body = bodyLines.join("\n").trim();
    const bodyTextLines = body.split(/\r?\n/);
    const hasHeader =
      lang === "snippet" &&
      !!bodyTextLines[0] &&
      !bodyTextLines[0].trim().startsWith("{") &&
      !bodyTextLines[0].trim().startsWith("[");
    const label = hasHeader ? bodyTextLines[0].trim() : `${lang} #${index}`;
    const jsonText = hasHeader ? bodyTextLines.slice(1).join("\n").trim() : body;
    blocks.push({ label, jsonText, body });
  }

  return blocks;
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
    for (const lang of CUSTOM_FENCE_LANGS) {
      for (const fence of collectFenceBlocks(doc, lang)) {
        const body = fence.body;
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
          let pointsJson = body;
          if (lines[0] && !lines[0].trim().startsWith("[") && !lines[0].trim().startsWith("{")) {
            pointsJson = lines.slice(1).join("\n").trim();
            const secondLine = lines[1]?.trim();
            if (secondLine?.startsWith("{") && !secondLine.startsWith("[")) {
              JSON.parse(secondLine) as { xLabel?: string; yLabel?: string };
              pointsJson = lines.slice(2).join("\n").trim();
            }
          }
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
    for (const fence of collectFenceBlocks(doc, "snippet")) {
      const parsed = JSON.parse(fence.jsonText) as Record<string, unknown>;
      const { nodes } = jsonToGraph(parsed);

      for (const node of nodes) {
        const type = String(node.type ?? "");
        if (isLegacyTypeKey(type)) {
          issues.push({ file: doc.relPath, label: fence.label, type, reason: "legacy" });
          continue;
        }
        if (!activeNodeTypes.has(type)) {
          issues.push({ file: doc.relPath, label: fence.label, type, reason: "unregistered" });
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

function collectSourceContextIssues(docs: DocRecord[]): SourceContextIssue[] {
  const docsByRelPath = new Map(docs.map((doc) => [doc.relPath, doc]));
  const issues: SourceContextIssue[] = [];

  for (const relPath of SOURCE_CONTEXT_DOCS) {
    const doc = docsByRelPath.get(relPath);
    if (!doc) {
      issues.push({ file: relPath, reason: "missing-source-context" });
      continue;
    }

    const sourceContext = extractDocSourceContext(doc.text);
    if (sourceContext.sourceAssets.length === 0 && !sourceContext.sourceStatus) {
      issues.push({ file: relPath, reason: "missing-source-context" });
    }
  }

  return issues.sort((a, b) => a.file.localeCompare(b.file));
}

function collectTerrainSourcePoolIssues(docs: DocRecord[]): TerrainSourcePoolIssue[] {
  const docsByRelPath = new Map(docs.map((doc) => [doc.relPath, doc]));
  const issues: TerrainSourcePoolIssue[] = [];

  for (const relPath of TERRAIN_SOURCE_POOL_DOCS) {
    const doc = docsByRelPath.get(relPath);
    if (!doc) {
      issues.push({
        file: relPath,
        missing: ["Examples", "Experimental", "Generative"],
      });
      continue;
    }

    const sourceAssets = extractDocSourceContext(doc.text).sourceAssets.join(" ");
    const missing = [
      !sourceAssets.includes("Examples/") ? "Examples" : null,
      !sourceAssets.includes("Experimental/") ? "Experimental" : null,
      !sourceAssets.includes("Generative/") ? "Generative" : null,
    ].filter(Boolean) as Array<"Examples" | "Experimental" | "Generative">;

    if (missing.length > 0) {
      issues.push({ file: relPath, missing });
    }
  }

  return issues.sort((a, b) => a.file.localeCompare(b.file));
}

function getDocNodeId(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const id = (node as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function getDocNodeLabel(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const label = (node as { label?: unknown }).label;
  return typeof label === "string" ? label.trim() : "";
}

function getDocNodeCategory(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const category = (node as { category?: unknown }).category;
  return typeof category === "string" ? category.trim().toLowerCase() : "";
}

function getDocEdgeSource(edge: unknown): string | null {
  if (!edge || typeof edge !== "object") return null;
  const typed = edge as { from?: unknown; source?: unknown };
  if (typeof typed.from === "string") return typed.from;
  if (typeof typed.source === "string") return typed.source;
  return null;
}

function getDocEdgeTarget(edge: unknown): string | null {
  if (!edge || typeof edge !== "object") return null;
  const typed = edge as { to?: unknown; target?: unknown };
  if (typeof typed.to === "string") return typed.to;
  if (typeof typed.target === "string") return typed.target;
  return null;
}

function normalizeDocNodeLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function collectNodeLabelCandidates(nodeLabel: string, category: string): string[] {
  const baseLabel = normalizeDocNodeLabel(nodeLabel).replace(/\s+/g, " ");
  const candidates = new Set<string>();
  if (baseLabel) candidates.add(baseLabel);

  const prefixes = NODEGRAPH_CATEGORY_PREFIXES[category] ?? [];
  for (const prefix of prefixes) {
    candidates.add(`${prefix}:${baseLabel}`);
  }

  return [...candidates];
}

function isConceptualNodegraph(parsed: unknown): boolean {
  return !!parsed && typeof parsed === "object" && (parsed as { kind?: unknown }).kind === "conceptual";
}

function collectNodegraphLabelIssues(docs: DocRecord[], activeNodeTypes: Set<string>): NodegraphLabelIssue[] {
  const issues: NodegraphLabelIssue[] = [];

  for (const doc of docs) {
    if (NODEGRAPH_LABEL_CHECK_EXCLUDED_DOCS.has(doc.relPath)) continue;
    for (const fence of collectFenceBlocks(doc, "nodegraph")) {
      const parsed = JSON.parse(fence.jsonText) as { nodes?: unknown };
      if (isConceptualNodegraph(parsed)) continue;
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];

      for (const node of nodes) {
        const nodeLabel = getDocNodeLabel(node);
        if (!nodeLabel) continue;

        const category = getDocNodeCategory(node);
        const normalizedLabel = normalizeDocNodeLabel(nodeLabel);
        if (NODEGRAPH_OUTPUT_LABELS.has(normalizedLabel)) continue;

        const candidates = collectNodeLabelCandidates(nodeLabel, category);
        if (candidates.some((candidate) => activeNodeTypes.has(candidate))) continue;

        issues.push({
          file: doc.relPath,
          label: fence.label,
          nodeLabel,
          category,
          expected: candidates,
        });
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.label.localeCompare(b.label) ||
    a.nodeLabel.localeCompare(b.nodeLabel) ||
    a.category.localeCompare(b.category),
  );
}

function collectConceptualNodegraphIssues(docs: DocRecord[]): ConceptualNodegraphIssue[] {
  const issues: ConceptualNodegraphIssue[] = [];

  for (const doc of docs) {
    for (const fence of collectFenceBlocks(doc, "nodegraph")) {
      const parsed = JSON.parse(fence.jsonText) as { nodes?: unknown };
      if (isConceptualNodegraph(parsed)) continue;
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];

      for (const node of nodes) {
        const category = getDocNodeCategory(node);
        if (!CONCEPTUAL_NODEGRAPH_CATEGORIES.has(category)) continue;

        issues.push({
          file: doc.relPath,
          label: fence.label,
          category,
          nodeLabel: getDocNodeLabel(node),
        });
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.label.localeCompare(b.label) ||
    a.category.localeCompare(b.category) ||
    a.nodeLabel.localeCompare(b.nodeLabel),
  );
}

function isTerrainOutNode(node: unknown): boolean {
  return /^terrain\s*out$/i.test(getDocNodeLabel(node));
}

function isDensityLikeDocNode(node: unknown): boolean {
  const label = normalizeDocNodeLabel(getDocNodeLabel(node));
  const category = getDocNodeCategory(node);
  return (
    DENSITY_NODEGRAPH_CATEGORIES.has(category) ||
    DENSITY_TYPES.has(label) ||
    DENSITY_TYPES.has(label.replace(/Accessor$/i, "")) ||
    /(?:Noise|BaseHeight|YSampled|CurveMapper|Constant|Sum|Multiplier|Min|Max)/.test(label)
  );
}

function buildIncomingEdgeMap(edges: unknown[]): Map<string, string[]> {
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    const source = getDocEdgeSource(edge);
    const target = getDocEdgeTarget(edge);
    if (!source || !target) continue;
    const sources = incoming.get(target) ?? [];
    sources.push(source);
    incoming.set(target, sources);
  }
  return incoming;
}

function hasDensityAncestor(targetId: string, nodesById: Map<string, unknown>, incoming: Map<string, string[]>): boolean {
  const queue = [...(incoming.get(targetId) ?? [])];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const node = nodesById.get(id);
    if (isDensityLikeDocNode(node)) return true;
    queue.push(...(incoming.get(id) ?? []));
  }

  return false;
}

function collectTerrainNodegraphIssues(doc: DocRecord): TerrainExampleIssue[] {
  const issues: TerrainExampleIssue[] = [];

  for (const fence of collectFenceBlocks(doc, "nodegraph")) {
    let parsed: { nodes?: unknown; edges?: unknown };
    try {
      parsed = JSON.parse(fence.jsonText) as { nodes?: unknown; edges?: unknown };
    } catch (error) {
      issues.push({
        file: doc.relPath,
        label: fence.label,
        reason: "invalid-json",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const edges = Array.isArray(parsed.edges) ? parsed.edges : [];
    const terrainOutNodes = nodes.filter(isTerrainOutNode);
    if (terrainOutNodes.length === 0) continue;

    const nodesById = new Map<string, unknown>();
    for (const node of nodes) {
      const id = getDocNodeId(node);
      if (id) nodesById.set(id, node);
    }
    const incoming = buildIncomingEdgeMap(edges);

    for (const outputNode of terrainOutNodes) {
      const outputId = getDocNodeId(outputNode);
      if (!outputId) continue;

      if ((incoming.get(outputId) ?? []).length === 0) {
        issues.push({
          file: doc.relPath,
          label: fence.label,
          reason: "terrain-out-missing-input",
          detail: outputId,
        });
        continue;
      }

      if (!hasDensityAncestor(outputId, nodesById, incoming)) {
        issues.push({
          file: doc.relPath,
          label: fence.label,
          reason: "terrain-out-has-no-density-ancestor",
          detail: outputId,
        });
      }
    }
  }

  return issues;
}

function collectTerrainSnippetIssues(doc: DocRecord): TerrainExampleIssue[] {
  const issues: TerrainExampleIssue[] = [];

  for (const fence of collectFenceBlocks(doc, "snippet")) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fence.jsonText) as Record<string, unknown>;
    } catch (error) {
      issues.push({
        file: doc.relPath,
        label: fence.label,
        reason: "invalid-json",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const { nodes, edges } = jsonToGraph(parsed);
    const root = findDensityRoot(nodes as Node[], edges as Edge[]);
    if (!root) {
      issues.push({
        file: doc.relPath,
        label: fence.label,
        reason: "snippet-has-no-density-root",
      });
      continue;
    }

    const values: number[] = [];
    for (const yLevel of [48, 64, 80]) {
      const grid = evaluateDensityGrid(nodes as Node[], edges as Edge[], 5, -32, 32, yLevel, root.id, {
        contentFields: {
          Base: 64,
          BaseHeight: 64,
          Bedrock: 0,
          Ceiling: 96,
          Surface: 64,
          Water: 48,
        },
      });
      values.push(...Array.from(grid.values));
    }

    if (values.some((value) => !Number.isFinite(value))) {
      issues.push({
        file: doc.relPath,
        label: fence.label,
        reason: "snippet-evaluates-non-finite",
      });
      continue;
    }

    if (values.every((value) => Math.abs(value) <= 1e-6)) {
      issues.push({
        file: doc.relPath,
        label: fence.label,
        reason: "snippet-evaluates-empty",
      });
    }
  }

  return issues;
}

function collectTerrainExampleIssues(docs: DocRecord[]): TerrainExampleIssue[] {
  const docsByRelPath = new Map(docs.map((doc) => [doc.relPath, doc]));
  const issues: TerrainExampleIssue[] = [];

  for (const relPath of TERRAIN_EXAMPLE_DOCS) {
    const doc = docsByRelPath.get(relPath);
    if (!doc) continue;
    issues.push(...collectTerrainNodegraphIssues(doc));
    issues.push(...collectTerrainSnippetIssues(doc));
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.label.localeCompare(b.label) ||
    a.reason.localeCompare(b.reason) ||
    (a.detail ?? "").localeCompare(b.detail ?? ""),
  );
}

function collectStalePreviewClaimIssues(docs: DocRecord[]): StalePreviewClaimIssue[] {
  const issues: StalePreviewClaimIssue[] = [];

  for (const doc of docs) {
    const lines = doc.text.split(/\r?\n/);
    for (const line of lines) {
      for (const rule of PREVIEW_STALE_CLAIM_RULES) {
        if (rule.pattern.test(line)) {
          issues.push({
            file: doc.relPath,
            phrase: line.trim(),
            current: rule.current,
          });
        }
      }
    }
  }

  return issues.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.phrase.localeCompare(b.phrase) ||
    a.current.localeCompare(b.current),
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

  it("keeps nodegraph diagram labels on real node types", () => {
    expect(collectNodegraphLabelIssues(docs, activeNodeTypes)).toEqual([]);
  });

  it("marks conceptual nodegraph diagrams explicitly", () => {
    expect(collectConceptualNodegraphIssues(docs)).toEqual([]);
  });

  it("keeps audited worldgen docs tagged with source context", () => {
    expect(collectSourceContextIssues(docs)).toEqual([]);
  });

  it("keeps terrain docs sourced from Examples, Experimental, and Generative biome folders", () => {
    expect(collectTerrainSourcePoolIssues(docs)).toEqual([]);
  });

  it("keeps terrain docs examples connected to real terrain density outputs", () => {
    expect(collectTerrainExampleIssues(docs)).toEqual([]);
  });

  it("keeps preview caveats aligned with current evaluator behavior", () => {
    expect(collectStalePreviewClaimIssues(docs)).toEqual([]);
  });
});
