import type { Node, Edge } from "@xyflow/react";
import type { BiomeSectionData, BiomeConfig } from "@/stores/editorStore";

/* ── Section summaries ─────────────────────────────────────────────── */

export interface SectionSummary {
  key: string;
  label: string;
  nodeCount: number;
  edgeCount: number;
  rootTypeChain: string;
  color: string;
}

const SECTION_COLORS: Record<string, string> = {
  Terrain: "#5B8DBF",
  MaterialProvider: "#C87D3A",
  EnvironmentProvider: "#7DB350",
  TintProvider: "#76A26A",
};

function getSectionColor(key: string): string {
  if (key in SECTION_COLORS) return SECTION_COLORS[key];
  if (key.startsWith("Props[")) return "#C76B6B";
  return "#8C8878";
}

function getSectionLabel(key: string): string {
  if (key === "MaterialProvider") return "Materials";
  if (key === "EnvironmentProvider") return "Atmosphere";
  if (key === "TintProvider") return "Tint";
  if (key.startsWith("Props[")) {
    const m = /\[(\d+)\]/.exec(key);
    return m ? `Prop ${m[1]}` : key;
  }
  return key;
}

export function getSectionSummary(key: string, data: BiomeSectionData): SectionSummary {
  return {
    key,
    label: getSectionLabel(key),
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    rootTypeChain: getRootTypeChain(data.nodes, data.edges),
    color: getSectionColor(key),
  };
}

/* ── Root-node discovery ───────────────────────────────────────────── */

/**
 * Root nodes are those that have no outgoing edges (i.e., nothing downstream
 * consumes them). In a left-to-right graph, these are the rightmost nodes.
 */
export function findRootNodes(nodes: Node[], edges: Edge[]): Node[] {
  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  const roots = nodes.filter((n) => !sourcesWithOutgoing.has(n.id));
  return roots.length > 0 ? roots : nodes.slice(0, 1);
}

/* ── Type chain ────────────────────────────────────────────────────── */

/**
 * BFS upstream from the first root node, collecting type names.
 * Produces a chain like "CacheOnce → Conditional → Blend".
 */
export function getRootTypeChain(
  nodes: Node[],
  edges: Edge[],
  maxDepth = 4,
): string {
  const roots = findRootNodes(nodes, edges);
  if (roots.length === 0) return "";

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // Build adjacency: target → sources (upstream)
  const upstream = new Map<string, string[]>();
  for (const e of edges) {
    const list = upstream.get(e.target) ?? [];
    list.push(e.source);
    upstream.set(e.target, list);
  }

  const chain: string[] = [];
  let current = roots[0];
  for (let depth = 0; depth < maxDepth && current; depth++) {
    const type = getNodeType(current);
    if (type) chain.push(type);

    const parents = upstream.get(current.id);
    if (!parents || parents.length === 0) break;
    current = nodeById.get(parents[0]) ?? (null as unknown as Node);
  }

  return chain.join(" \u2192 ");
}

function getNodeType(node: Node): string {
  const data = node.data as Record<string, unknown>;
  return (data.type as string) ?? "";
}

/* ── Prop summaries ────────────────────────────────────────────────── */

export interface PropSummaryEntry {
  index: number;
  runtime: number;
  skip: boolean;
  positionsType: string;
  positionsParams: string;
  assignmentsType: string;
  nodeCount: number;
}

export function getPropSummaries(
  biomeConfig: BiomeConfig,
  biomeSections: Record<string, BiomeSectionData>,
): PropSummaryEntry[] {
  const entries: PropSummaryEntry[] = [];

  for (let i = 0; i < biomeConfig.propMeta.length; i++) {
    const meta = biomeConfig.propMeta[i];
    const sectionKey = `Props[${i}]`;
    const section = biomeSections[sectionKey];
    if (!section) continue;

    const posRoot = section.nodes.find(
      (n) => (n.data as Record<string, unknown>)._biomeField === "Positions",
    );
    const asgnRoot = section.nodes.find(
      (n) => (n.data as Record<string, unknown>)._biomeField === "Assignments",
    );

    entries.push({
      index: i,
      runtime: meta.Runtime,
      skip: meta.Skip,
      positionsType: posRoot ? getNodeType(posRoot) : "—",
      positionsParams: posRoot ? extractFieldSummary(posRoot) : "",
      assignmentsType: asgnRoot ? getNodeType(asgnRoot) : "—",
      nodeCount: section.nodes.length,
    });
  }

  return entries;
}

function extractFieldSummary(node: Node): string {
  const data = node.data as Record<string, unknown>;
  const fields = (data.fields as Record<string, unknown>) ?? {};
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.join(", ");
}

/* ── Material layer extraction ─────────────────────────────────────── */

export interface MaterialLayer {
  nodeId: string;
  material: string;
  role: string;
  depth?: number;
  parentType: string;
  layerIndex?: number;
  layerType?: string;
  thickness?: number | string;
  color?: string; // Color override for editor
}

export const MATERIAL_COLORS: Record<string, string> = {
  stone: "#808080",
  dirt: "#8B4513",
  grass: "#228B22",
  sand: "#C2B280",
  gravel: "#A0A0A0",
  clay: "#B87333",
  snow: "#FFFAFA",
  ice: "#B0E0E6",
  bedrock: "#404040",
  sandstone: "#D2B48C",
  obsidian: "#1C1C2E",
  mud: "#6B4423",
  moss: "#4A7A4A",
  water: "#4169E1",
  lava: "#FF4500",
  // Hytale-specific material names
  Rock_Stone: "#7a7a7a",
  Rock_Granite: "#9e8b7e",
  Rock_Slate: "#5c5c6e",
  Rock_Limestone: "#c4b99a",
  Rock_Basalt: "#3d3d3d",
  Rock_Sandstone: "#d2b48c",
  Soil_Dirt: "#8b6914",
  Soil_Mud: "#6b4423",
  Soil_Clay: "#b87333",
  Soil_Sand: "#c2b280",
  Soil_Gravel: "#a0a0a0",
  Soil_Moss: "#4a7a4a",
  Grass: "#4caf50",
  Snow: "#e8e8f0",
  Ice: "#b0e0e6",
  Bedrock: "#2a2a2a",
  Water: "#4169e1",
  Lava: "#ff4500",
};

/**
 * Fuzzy-match a material name to a color from the palette.
 */
export function matchMaterialColor(name: string): string {
  // Exact match
  if (MATERIAL_COLORS[name]) return MATERIAL_COLORS[name];

  // Case-insensitive
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(MATERIAL_COLORS)) {
    if (key.toLowerCase() === lower) return color;
  }

  // Substring match
  for (const [key, color] of Object.entries(MATERIAL_COLORS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return color;
    }
  }

  return "#808080";
}

/**
 * Normalize a Material field that may be either a plain string ("stone")
 * or the Hytale object form ({ Solid: "stone", Fluid: "", SolidBottomUp: false }).
 */
function resolveMaterialField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.Solid === "string" && obj.Solid.length > 0) return obj.Solid;
  }
  return "unknown";
}

/**
 * Walk the MaterialProvider graph from root to extract material layers.
 * Handles Conditional, SpaceAndDepth (V1 Solid/Empty + V2 Layers[]),
 * HeightGradient, and Constant nodes.
 */
export function extractMaterialLayers(
  nodes: Node[],
  edges: Edge[],
): MaterialLayer[] {
  const roots = findRootNodes(nodes, edges);
  if (roots.length === 0) {
    return [];
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency: target → { sourceHandle/targetHandle → sourceNode }
  const inputEdges = new Map<string, Map<string, string>>();
  for (const e of edges) {
    const map = inputEdges.get(e.target) ?? new Map<string, string>();
    // The targetHandle tells us which input slot (e.g., "TrueInput", "Solid")
    const handle = e.targetHandle ?? "Input";
    map.set(handle, e.source);
    inputEdges.set(e.target, map);
  }

  const layers: MaterialLayer[] = [];

  function walkLayer(layerNodeId: string, layerIndex: number, maxDepth?: number) {
    const layerNode = nodeById.get(layerNodeId);
    if (!layerNode) return;

    const layerType = getNodeType(layerNode);
    const layerData = layerNode.data as Record<string, unknown>;
    const layerFields = (layerData.fields as Record<string, unknown>) ?? {};
    const layerInputs = inputEdges.get(layerNodeId) ?? new Map<string, string>();

    // Extract thickness info
    let thickness: number | string | undefined;
    if (layerType === "ConstantThickness") {
      thickness = layerFields.Thickness as number | undefined;
    } else if (layerType === "RangeThickness") {
      const min = layerFields.RangeMin as number | undefined;
      const max = layerFields.RangeMax as number | undefined;
      thickness = min != null && max != null ? `${min}-${max}` : undefined;
    } else if (layerType === "NoiseThickness") {
      thickness = "noise";
    } else if (layerType === "WeightedThickness") {
      thickness = "weighted";
    }

    // Follow the Material edge from the layer node
    const materialSrc = layerInputs.get("Material");
    if (materialSrc) {
      const matNode = nodeById.get(materialSrc);
      if (matNode) {
        const matType = getNodeType(matNode);
        const matData = matNode.data as Record<string, unknown>;
        const matFields = (matData.fields as Record<string, unknown>) ?? {};

        if (matType === "Constant") {
          layers.push({
            nodeId: materialSrc,
            material: resolveMaterialField(matFields.Material),
            role: `Layer ${layerIndex}`,
            depth: maxDepth,
            parentType: layerType,
            layerIndex,
            layerType,
            thickness,
          });
        } else {
          // Non-constant material — walk it recursively
          walk(materialSrc, `Layer ${layerIndex}`, maxDepth, layerIndex, layerType, thickness);
        }
      }
    } else {
      // No material edge — show layer node itself
      layers.push({
        nodeId: layerNodeId,
        material: "unknown",
        role: `Layer ${layerIndex}`,
        depth: maxDepth,
        parentType: layerType,
        layerIndex,
        layerType,
        thickness,
      });
    }
  }

  function walk(nodeId: string, role: string, depth?: number, layerIndex?: number, layerType?: string, thickness?: number | string) {
    const node = nodeById.get(nodeId);
    if (!node) return;

    const type = getNodeType(node);
    const data = node.data as Record<string, unknown>;
    const fields = (data.fields as Record<string, unknown>) ?? {};
    const inputs = inputEdges.get(nodeId) ?? new Map<string, string>();

    if (type === "Constant") {
      layers.push({
        nodeId,
        material: resolveMaterialField(fields.Material),
        role,
        depth,
        parentType: type,
        layerIndex,
        layerType,
        thickness,
      });
    } else if (type === "SpaceAndDepth") {
      // V2: Check for Layers[i] edges
      const layerEdges = [...inputs.entries()]
        .filter(([handle]) => /^Layers\[\d+\]$/.test(handle))
        .sort(([a], [b]) => {
          const ai = parseInt(/\[(\d+)\]/.exec(a)![1]);
          const bi = parseInt(/\[(\d+)\]/.exec(b)![1]);
          return ai - bi;
        });

      if (layerEdges.length > 0) {
        // V2 Layers[] model
        const maxD = fields.MaxExpectedDepth as number | undefined;
        for (const [handle, srcId] of layerEdges) {
          const idx = parseInt(/\[(\d+)\]/.exec(handle)![1]);
          walkLayer(srcId, idx, maxD);
        }
      } else {
        // V1 backward compat: Solid/Empty model
        const dt = fields.DepthThreshold as number | undefined;
        const solidSrc = inputs.get("Solid");
        const emptySrc = inputs.get("Empty");
        if (solidSrc) walk(solidSrc, "Solid", dt);
        if (emptySrc) walk(emptySrc, "Empty", dt);
      }
    } else if (type === "HeightGradient") {
      const lowSrc = inputs.get("Low");
      const highSrc = inputs.get("High");
      if (lowSrc) walk(lowSrc, "Low", depth);
      if (highSrc) walk(highSrc, "High", depth);
    } else if (type === "Conditional") {
      const trueSrc = inputs.get("TrueInput");
      const falseSrc = inputs.get("FalseInput");
      if (trueSrc) walk(trueSrc, "True", depth);
      if (falseSrc) walk(falseSrc, "False", depth);
    } else if (type === "Queue") {
      for (const [handle, inputNodeId] of inputs.entries()) {
        walk(inputNodeId, `QueueInput(${handle})`, depth);
      }
    } else {
      // For any other node type, try to follow the generic "Input" edge
      const inputSrc = inputs.get("Input");
      if (inputSrc) walk(inputSrc, role, depth);
    }
  }

  walk(roots[0].id, "Root");
  return layers;
}

/* ── SpaceAndDepth node finder ─────────────────────────────────────── */

/**
 * Find the SpaceAndDepth node in a MaterialProvider section.
 * Returns the node and its edges, or null if not found.
 */
export function findSpaceAndDepthNode(
  nodes: Node[],
  edges: Edge[],
): { node: Node; isV2: boolean } | null {
  const sadNode = nodes.find((n) => getNodeType(n) === "SpaceAndDepth");
  if (!sadNode) return null;

  const inputs = edges.filter((e) => e.target === sadNode.id);
  const hasLayerEdges = inputs.some((e) => /^Layers\[\d+\]$/.test(e.targetHandle ?? ""));

  // Also check if the node has LayerContext set (V2 field) — matches node component logic
  const data = sadNode.data as Record<string, unknown>;
  const fields = (data.fields as Record<string, unknown>) ?? {};
  const hasLayerContext = fields.LayerContext != null;

  return { node: sadNode, isV2: hasLayerEdges || hasLayerContext };
}
