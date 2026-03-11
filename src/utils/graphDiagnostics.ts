import type { Node, Edge } from "@xyflow/react";
import type { BaseNodeData } from "@/nodes/shared/BaseNode";
import { HANDLE_REGISTRY, findHandleDef } from "@/nodes/handleRegistry";
import { FIELD_CONSTRAINTS, OUTPUT_RANGES } from "@/schema/constraints";
import { validateFields } from "@/schema/validation";
import { isLegacyTypeKey } from "@/nodes/shared/legacyTypes";
import { getEvalStatus } from "@/utils/densityEvaluator";
import { EvalStatus } from "@/schema/types";
import {
  cloneDelimiterRecords,
  readDelimiterEnvironmentReference,
  validateEnvironmentDelimiters,
} from "@/utils/environmentDelimiters";
import type { AssetReferenceKind } from "@/utils/environmentAssetLookup";
import connectionsData from "@/data/connections.json";

// ── Hytale known environment names (from Server/Environments/) ──────────────

export const HYTALE_KNOWN_ENVIRONMENTS = new Set([
  // Zone 0
  "Env_Zone0",
  // Zone 1
  "Env_Zone1", "Env_Zone1_Autumn", "Env_Zone1_Azure", "Env_Zone1_Caves",
  "Env_Zone1_Caves_Forests", "Env_Zone1_Caves_Goblins", "Env_Zone1_Caves_Mountains",
  "Env_Zone1_Caves_Plains", "Env_Zone1_Caves_Rats", "Env_Zone1_Caves_Spiders",
  "Env_Zone1_Caves_Swamps", "Env_Zone1_Caves_Volcanic_T1", "Env_Zone1_Caves_Volcanic_T2",
  "Env_Zone1_Caves_Volcanic_T3", "Env_Zone1_Dungeons", "Env_Zone1_Encounters",
  "Env_Zone1_Forests", "Env_Zone1_Graveyard", "Env_Zone1_Kweebec",
  "Env_Zone1_Mage_Towers", "Env_Zone1_Mineshafts", "Env_Zone1_Mountains",
  "Env_Zone1_Plains", "Env_Zone1_Shores", "Env_Zone1_Swamps", "Env_Zone1_Trork",
  // Zone 2
  "Env_Zone2", "Env_Zone2_Caves", "Env_Zone2_Caves_Deserts", "Env_Zone2_Caves_Goblins",
  "Env_Zone2_Caves_Plateaus", "Env_Zone2_Caves_Rats", "Env_Zone2_Caves_Savanna",
  "Env_Zone2_Caves_Scarak", "Env_Zone2_Caves_Scrub", "Env_Zone2_Caves_Volcanic_T1",
  "Env_Zone2_Caves_Volcanic_T2", "Env_Zone2_Caves_Volcanic_T3", "Env_Zone2_Deserts",
  "Env_Zone2_Dungeons", "Env_Zone2_Encounters", "Env_Zone2_Feran",
  "Env_Zone2_Mage_Towers", "Env_Zone2_Mineshafts", "Env_Zone2_Oasis",
  "Env_Zone2_Plateaus", "Env_Zone2_Savanna", "Env_Zone2_Scarak",
  "Env_Zone2_Scrub", "Env_Zone2_Shores",
  // Zone 3
  "Env_Zone3", "Env_Zone3_Caves", "Env_Zone3_Caves_Forests", "Env_Zone3_Caves_Glacial",
  "Env_Zone3_Caves_Mountains", "Env_Zone3_Caves_Spider", "Env_Zone3_Caves_Tundra",
  "Env_Zone3_Caves_Volcanic_T1", "Env_Zone3_Caves_Volcanic_T2", "Env_Zone3_Caves_Volcanic_T3",
  "Env_Zone3_Dungeons", "Env_Zone3_Encounters", "Env_Zone3_Forests",
  "Env_Zone3_Glacial", "Env_Zone3_Glacial_Henges", "Env_Zone3_Hedera",
  "Env_Zone3_Mage_Towers", "Env_Zone3_Mineshafts", "Env_Zone3_Mountains",
  "Env_Zone3_Outlander", "Env_Zone3_Shores", "Env_Zone3_Tundra",
  // Zone 4
  "Env_Zone4", "Env_Zone4_Caves", "Env_Zone4_Caves_Volcanic", "Env_Zone4_Crucible",
  "Env_Zone4_Dungeons", "Env_Zone4_Encounters", "Env_Zone4_Forests",
  "Env_Zone4_Jungles", "Env_Zone4_Mage_Towers", "Env_Zone4_Sewers",
  "Env_Zone4_Shores", "Env_Zone4_Volcanoes", "Env_Zone4_Wastes",
  // Unique / Special
  "Env_Creative_Hub", "Env_Default_Flat", "Env_Default_Void",
  "Env_Forgotten_Temple_Base", "Env_Forgotten_Temple_Exterior",
  "Env_Forgotten_Temple_Heart", "Env_Forgotten_Temple_Interior_Grand",
  "Env_Forgotten_Temple_Interior_Small", "Env_Forgotten_Temple_Interior_Tent",
  "Env_Portals_Hedera", "Env_Portals_Oasis",
  "Env_Temple_of_Gaia", "Env_Void",
  // Legacy / alias-style names observed in shipped biome assets
  "Zone1_Overground", "Zone1_Underground", "Zone1_Plains", "Zone3_Overground",
  // Hytale sentinel used for Default environment provider export
  "default",
]);

const connectionMatrix = connectionsData.connectionMatrix as Record<string, Record<string, number>>;

export type DiagnosticSeverity = "error" | "warning" | "info";
export type GraphDiagnosticCode =
  | "field-constraint"
  | "import-missing-name"
  | "asset-import-unknown-ref"
  | "env-delimiter-invalid-range"
  | "env-delimiter-missing-range"
  | "env-delimiter-overlap"
  | "env-delimiter-gap"
  | "env-delimiter-missing-environment"
  | "env-delimiter-unknown-environment"
  | "env-delimiter-unsupported-provider"
  | "biome-environment-missing-provider"
  | "biome-environment-unknown-ref"
  | "biome-environment-no-constants"
  | "biome-environment-missing-ref-name"
  | "biome-tint-missing-provider"
  | "biome-tint-missing-ref-name"
  | "biome-tint-unknown-ref"
  | "biome-name-missing";

export interface GraphDiagnostic {
  nodeId: string | null;
  message: string;
  severity: DiagnosticSeverity;
  biomeSection?: string | null;
  code?: GraphDiagnosticCode;
  field?: string | null;
  meta?: Record<string, unknown>;
}

const UNSUPPORTED_TYPES = new Set([
  "HeightAboveSurface",
  "SurfaceDensity",
  "TerrainBoolean",
  "TerrainMask",
  "BeardDensity",
  "ColumnDensity",
  "CaveDensity",
  "ImportedValue",
]);

function getNodeType(node: Node): string {
  return (node.data as BaseNodeData).type ?? "";
}

function getNodeFields(node: Node): Record<string, unknown> {
  return (node.data as BaseNodeData).fields ?? {};
}

type KnownAssetNameMap = Partial<Record<AssetReferenceKind, string[]>>;

function normalizeKnownName(name: string): string {
  return name.trim().toLowerCase();
}

function buildKnownAssetNameSets(knownAssetNames?: KnownAssetNameMap | null): Record<AssetReferenceKind, Set<string>> {
  const environmentNames = new Set<string>();
  for (const name of HYTALE_KNOWN_ENVIRONMENTS) {
    environmentNames.add(normalizeKnownName(name));
  }

  const sets: Record<AssetReferenceKind, Set<string>> = {
    environment: environmentNames,
    tint: new Set<string>(),
    material: new Set<string>(),
    prop: new Set<string>(),
  };

  if (!knownAssetNames) return sets;

  for (const kind of Object.keys(sets) as AssetReferenceKind[]) {
    const names = knownAssetNames[kind];
    if (!names) continue;
    for (const name of names) {
      if (typeof name === "string" && name.trim()) {
        sets[kind].add(normalizeKnownName(name));
      }
    }
  }

  return sets;
}

function getImportedAssetKind(node: Node): AssetReferenceKind | null {
  const rfType = node.type ?? "";
  if (rfType === "Environment:Imported") return "environment";
  if (rfType === "Tint:Imported") return "tint";
  if (rfType === "Material:Imported") return "material";
  if (rfType === "Prop:Imported") return "prop";
  return null;
}

function getAssetKindLabel(kind: AssetReferenceKind): string {
  switch (kind) {
    case "environment":
      return "Environment";
    case "tint":
      return "Tint";
    case "material":
      return "Material";
    case "prop":
      return "Prop";
  }
}

function isEnvironmentDensityDelimitedNode(node: Node): boolean {
  const rfType = node.type ?? "";
  const data = node.data as BaseNodeData;
  return rfType === "Environment:DensityDelimited"
    || (data.type === "DensityDelimited" && data._biomeField === "EnvironmentProvider");
}

/** Extract Min/Max from a nested range object like { Min: -1, Max: 1 } */
function getRangeValues(obj: unknown): [number, number] | undefined {
  if (obj && typeof obj === "object" && "Min" in (obj as Record<string, unknown>) && "Max" in (obj as Record<string, unknown>)) {
    const r = obj as { Min: number; Max: number };
    if (typeof r.Min === "number" && typeof r.Max === "number") {
      return [r.Min, r.Max];
    }
  }
  return undefined;
}

export function analyzeGraph(
  nodes: Node[],
  edges: Edge[],
  knownAssetNames?: KnownAssetNameMap | null,
): GraphDiagnostic[] {
  if (nodes.length === 0) return [];

  const diagnostics: GraphDiagnostic[] = [];
  const knownAssetSets = buildKnownAssetNameSets(knownAssetNames);

  // Build lookup maps
  const incomingByTarget = new Map<string, Set<string>>();
  const outgoingBySource = new Map<string, Set<string>>();
  const adjacency = new Map<string, Set<string>>(); // target → set of sources

  for (const edge of edges) {
    // Target handle tracking
    if (!incomingByTarget.has(edge.target)) incomingByTarget.set(edge.target, new Set());
    incomingByTarget.get(edge.target)!.add(edge.targetHandle ?? "Input");

    // Outgoing tracking
    if (!outgoingBySource.has(edge.source)) outgoingBySource.set(edge.source, new Set());
    outgoingBySource.get(edge.source)!.add(edge.target);

    // Adjacency (directed: source → target)
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    adjacency.get(edge.source)!.add(edge.target);
  }

  // 1. Disconnected required inputs
  for (const node of nodes) {
    const type = getNodeType(node);
    const handles = HANDLE_REGISTRY[type];
    if (!handles) continue;

    const connectedHandles = incomingByTarget.get(node.id) ?? new Set();
    const inputHandles = handles.filter((h) => h.type === "target");
    const showIdx = inputHandles.length >= 2;
    for (let idx = 0; idx < inputHandles.length; idx++) {
      const handle = inputHandles[idx];
      if (!connectedHandles.has(handle.id)) {
        const label = showIdx ? `[${idx}] ${handle.label}` : handle.label;
        diagnostics.push({
          nodeId: node.id,
          message: `${type}: input "${label}" is disconnected`,
          severity: "warning",
        });
      }
    }
  }

  // 2. Unsupported preview types
  for (const node of nodes) {
    const type = getNodeType(node);
    if (UNSUPPORTED_TYPES.has(type)) {
      diagnostics.push({
        nodeId: node.id,
        message: `${type}: not supported in preview (returns 0)`,
        severity: "info",
      });
    }
  }

  // 2b. Legacy node warnings
  for (const node of nodes) {
    const type = getNodeType(node);
    // Density nodes use bare type; for others, the node.type from ReactFlow includes the prefix
    const nodeTypeKey = node.type ?? type;
    if (isLegacyTypeKey(nodeTypeKey)) {
      diagnostics.push({
        nodeId: node.id,
        message: `${type}: legacy type not present in the Hytale pre-release API`,
        severity: "warning",
      });
    }
  }

  // 3. Cycle detection — Kahn's algorithm
  //    Use an array (not Set) for adjacency so parallel edges between the same
  //    node pair (e.g. Noise → Sum.InputA AND Noise → Sum.InputB) are preserved.
  //    Each edge must decrement in-degree exactly once.
  const kahnAdj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    kahnAdj.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    kahnAdj.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let sorted = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted++;
    const neighbors = kahnAdj.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }
  }

  if (sorted < nodes.length) {
    // Some nodes are in a cycle
    const cycleNodes = nodes.filter((n) => (inDegree.get(n.id) ?? 0) > 0);
    for (const node of cycleNodes) {
      diagnostics.push({
        nodeId: node.id,
        message: `${getNodeType(node)}: part of a cycle`,
        severity: "error",
      });
    }
  }

  // 4. Dead nodes — BFS backward from terminal nodes
  // Terminals are nodes with no outgoing edges that have at least one incoming edge (true sinks)
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const terminals = nodes.filter((n) => !outgoingBySource.has(n.id) && nodesWithIncoming.has(n.id));

  // Build reverse adjacency: target → sources
  const reverseAdj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, new Set());
    reverseAdj.get(edge.target)!.add(edge.source);
  }

  const reachable = new Set<string>();
  const bfsQueue = terminals.map((n) => n.id);
  while (bfsQueue.length > 0) {
    const current = bfsQueue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const parents = reverseAdj.get(current);
    if (parents) {
      for (const parent of parents) {
        if (!reachable.has(parent)) bfsQueue.push(parent);
      }
    }
  }

  // Only report dead nodes if there are actual terminal sinks
  if (terminals.length > 0) {
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        diagnostics.push({
          nodeId: node.id,
          message: `${getNodeType(node)}: unreachable (dead node)`,
          severity: "warning",
        });
      }
    }
  }

  // 5. Clamp Min > Max warning
  for (const node of nodes) {
    const type = getNodeType(node);
    if (type === "Clamp" || type === "SmoothClamp") {
      const fields = getNodeFields(node);
      const min = typeof fields.Min === "number" ? fields.Min : undefined;
      const max = typeof fields.Max === "number" ? fields.Max : undefined;
      if (min !== undefined && max !== undefined && min > max) {
        diagnostics.push({
          nodeId: node.id,
          message: `${type}: Min (${min}) exceeds Max (${max}) — empty range`,
          severity: "warning",
        });
      }
    }
  }

  // 6. Normalizer inverted range
  for (const node of nodes) {
    const type = getNodeType(node);
    if (type === "Normalizer") {
      const fields = getNodeFields(node);
      const sourceRange = getRangeValues(fields.SourceRange);
      if (sourceRange && sourceRange[0] >= sourceRange[1]) {
        diagnostics.push({
          nodeId: node.id,
          message: `Normalizer: SourceRange Min (${sourceRange[0]}) >= Max (${sourceRange[1]}) — inverted input range`,
          severity: "warning",
        });
      }
    }
  }

  // 7. Empty Sum/Product inputs
  const MULTI_INPUT_TYPES = new Set(["Sum", "Product"]);
  for (const node of nodes) {
    const type = getNodeType(node);
    if (MULTI_INPUT_TYPES.has(type)) {
      const connectedHandles = incomingByTarget.get(node.id);
      if (!connectedHandles || connectedHandles.size === 0) {
        diagnostics.push({
          nodeId: node.id,
          message: `${type}: no inputs connected`,
          severity: "warning",
        });
      }
    }
  }

  // 8. Field constraint violations (bridge per-field validation into graph diagnostics)
  for (const node of nodes) {
    const type = getNodeType(node);
    const constraints = FIELD_CONSTRAINTS[type];
    if (!constraints) continue;

    const fields = getNodeFields(node);
    const issues = validateFields(fields, constraints);
    for (const issue of issues) {
      const isMissingImportName = type === "Imported" && issue.field === "Name";
      diagnostics.push({
        nodeId: node.id,
        message: `${type}.${issue.field}: ${issue.message}`,
        severity: issue.severity,
        code: isMissingImportName ? "import-missing-name" : "field-constraint",
        field: issue.field,
      });
    }
  }

  // 8b. Imported asset reference validation
  for (const node of nodes) {
    const assetKind = getImportedAssetKind(node);
    if (!assetKind) continue;

    const fields = getNodeFields(node);
    const importName = typeof fields.Name === "string" ? fields.Name.trim() : "";
    const knownNames = knownAssetSets[assetKind];

    if (!importName || knownNames.size === 0) continue;
    if (knownNames.has(normalizeKnownName(importName))) continue;

    diagnostics.push({
      nodeId: node.id,
      message: `${getAssetKindLabel(assetKind)} Imported references unknown asset "${importName}"`,
      severity: "warning",
      code: "asset-import-unknown-ref",
      field: "Name",
      meta: { assetKind, importName },
    });
  }

  // 8c. Environment:DensityDelimited delimiter validation
  for (const node of nodes) {
    if (!isEnvironmentDensityDelimitedNode(node)) continue;
    const fields = getNodeFields(node);
    const delimiters = Array.isArray(fields.Delimiters)
      ? cloneDelimiterRecords(fields.Delimiters)
      : [];
    const issues = validateEnvironmentDelimiters(delimiters, Array.from(knownAssetSets.environment));

    for (const issue of issues) {
      const delimiter =
        issue.delimiterIndex !== undefined && issue.delimiterIndex >= 0 && issue.delimiterIndex < delimiters.length
          ? delimiters[issue.delimiterIndex]
          : null;
      const environmentReference = delimiter ? readDelimiterEnvironmentReference(delimiter) : null;
      const code =
        issue.kind === "invalid-range"
          ? "env-delimiter-invalid-range"
          : issue.kind === "missing-range"
            ? "env-delimiter-missing-range"
            : issue.kind === "overlap"
              ? "env-delimiter-overlap"
              : issue.kind === "gap"
                ? "env-delimiter-gap"
                : issue.kind === "missing-environment"
                  ? "env-delimiter-missing-environment"
                  : issue.kind === "unknown-environment"
                    ? "env-delimiter-unknown-environment"
                    : "env-delimiter-unsupported-provider";

      diagnostics.push({
        nodeId: node.id,
        message: `Environment:DensityDelimited ${issue.message}`,
        severity: issue.severity,
        code,
        field: "Delimiters",
        meta: {
          delimiterIndex: issue.delimiterIndex ?? null,
          issueKind: issue.kind,
          providerType: environmentReference?.providerType ?? null,
          rawType: environmentReference?.rawType ?? null,
        },
      });
    }
  }

  // 9. Cross-category connection validation
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceType = sourceNode.type ?? getNodeType(sourceNode);
    const targetType = targetNode.type ?? getNodeType(targetNode);
    const sh = edge.sourceHandle ?? "output";
    const th = edge.targetHandle ?? "Input";

    const sourceDef = findHandleDef(sourceType, sh);
    const targetDef = findHandleDef(targetType, th);
    if (!sourceDef || !targetDef) continue;
    if (sourceDef.category === targetDef.category) continue;

    // Check the connection matrix
    const allowed = (connectionMatrix[sourceDef.category]?.[targetDef.category] ?? 0) > 0;
    if (!allowed) {
      diagnostics.push({
        nodeId: targetNode.id,
        message: `Invalid cross-category connection: ${sourceDef.category} → ${targetDef.category} (${getNodeType(sourceNode)} → ${getNodeType(targetNode)}.${th})`,
        severity: "warning",
      });
    }
  }

  // 10. Output range mismatch hints
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceType = getNodeType(sourceNode);
    const targetType = getNodeType(targetNode);
    const sourceRange = OUTPUT_RANGES[sourceType];
    if (!sourceRange) continue;

    // Check Clamp/SmoothClamp targets: only warn if source is entirely outside clamp range
    if (targetType === "Clamp" || targetType === "SmoothClamp") {
      const fields = getNodeFields(targetNode);
      const clampMin = typeof fields.Min === "number" ? fields.Min : undefined;
      const clampMax = typeof fields.Max === "number" ? fields.Max : undefined;
      if (clampMin !== undefined && clampMax !== undefined) {
        // Source entirely below clamp range — output will always be clampMin
        if (sourceRange[1] < clampMin) {
          diagnostics.push({
            nodeId: targetNode.id,
            message: `${sourceType} output [${sourceRange[0]}, ${sourceRange[1]}] is entirely below Min (${clampMin}) — output will always be ${clampMin}`,
            severity: "info",
          });
        }
        // Source entirely above clamp range — output will always be clampMax
        if (sourceRange[0] > clampMax) {
          diagnostics.push({
            nodeId: targetNode.id,
            message: `${sourceType} output [${sourceRange[0]}, ${sourceRange[1]}] is entirely above Max (${clampMax}) — output will always be ${clampMax}`,
            severity: "info",
          });
        }
      }
    }

    // Check Normalizer targets: source range vs SourceRange.Min/Max
    if (targetType === "Normalizer") {
      const fields = getNodeFields(targetNode);
      const srcRange = getRangeValues(fields.SourceRange);
      if (srcRange) {
        // Source entirely outside normalizer's expected input range
        if (sourceRange[1] < srcRange[0] || sourceRange[0] > srcRange[1]) {
          diagnostics.push({
            nodeId: targetNode.id,
            message: `${sourceType} output [${sourceRange[0]}, ${sourceRange[1]}] is entirely outside Normalizer input range [${srcRange[0]}, ${srcRange[1]}]`,
            severity: "info",
          });
        }
      }
    }
  }

  return diagnostics;
}

/** Walk a provider node tree and collect all string environment references */
function collectEnvRefs(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const refs: string[] = [];

  if (typeof obj.Environment === "string") {
    refs.push(obj.Environment);
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) refs.push(...collectEnvRefs(item));
    } else if (val && typeof val === "object") {
      refs.push(...collectEnvRefs(val));
    }
  }
  return refs;
}

/**
 * Analyze a biome config for Hytale-specific issues:
 * - Unknown EnvironmentProvider references
 * - Missing TintProvider
 * - TintProvider with a single-color only (no gradient)
 */
export function analyzeBiome(
  biomeConfig: Record<string, unknown> | null,
  knownAssetNames?: KnownAssetNameMap | null,
): GraphDiagnostic[] {
  if (!biomeConfig) return [];
  const diags: GraphDiagnostic[] = [];
  const knownAssetSets = buildKnownAssetNameSets(knownAssetNames);

  // Check EnvironmentProvider references
  const envProvider = biomeConfig.EnvironmentProvider;
  if (!envProvider) {
    diags.push({
      nodeId: null,
      message: "Biome has no EnvironmentProvider - worldgen will use the default environment",
      severity: "warning",
      biomeSection: "EnvironmentProvider",
      code: "biome-environment-missing-provider",
      field: "EnvironmentProvider",
    });
  } else {
    const envProviderRecord = envProvider as Record<string, unknown>;
    const envProviderType = typeof envProviderRecord.Type === "string" ? envProviderRecord.Type : null;
    const envProviderName = typeof envProviderRecord.Name === "string" ? envProviderRecord.Name.trim() : "";
    if ((envProviderType === "Imported" || envProviderType === "Exported") && !envProviderName) {
      diags.push({
        nodeId: null,
        message: `EnvironmentProvider ${envProviderType} is missing a Name reference`,
        severity: "warning",
        biomeSection: "EnvironmentProvider",
        code: "biome-environment-missing-ref-name",
        field: "Name",
        meta: { providerType: envProviderType },
      });
    }
    const refs = collectEnvRefs(envProvider);
    for (const ref of refs) {
      if (!knownAssetSets.environment.has(normalizeKnownName(ref))) {
        diags.push({
          nodeId: null,
          message: `EnvironmentProvider references unknown environment "${ref}" - not found in Hytale assets`,
          severity: "error",
          biomeSection: "EnvironmentProvider",
          code: "biome-environment-unknown-ref",
          field: "EnvironmentProvider",
          meta: { environment: ref },
        });
      }
    }
    if (
      refs.length === 0
      && envProviderType !== "Default"
      && envProviderType !== "Imported"
      && envProviderType !== "Exported"
    ) {
      diags.push({
        nodeId: null,
        message: "EnvironmentProvider has no environment constants - biome will have no environment",
        severity: "warning",
        biomeSection: "EnvironmentProvider",
        code: "biome-environment-no-constants",
        field: "EnvironmentProvider",
      });
    }
  }

  // Check TintProvider
  const tintProvider = biomeConfig.TintProvider;
  if (!tintProvider) {
    diags.push({
      nodeId: null,
      message: "Biome has no TintProvider - grass and foliage will use default color",
      severity: "info",
      biomeSection: "TintProvider",
      code: "biome-tint-missing-provider",
      field: "TintProvider",
    });
  } else {
    const tp = tintProvider as Record<string, unknown>;
    const tintProviderType = typeof tp.Type === "string" ? tp.Type : null;
    const tintProviderName = typeof tp.Name === "string" ? tp.Name.trim() : "";
    if (tintProviderType === "Imported" && !tintProviderName) {
      diags.push({
        nodeId: null,
        message: "TintProvider Imported is missing a Name reference",
        severity: "warning",
        biomeSection: "TintProvider",
        code: "biome-tint-missing-ref-name",
        field: "Name",
      });
    } else if (
      tintProviderType === "Imported"
      && tintProviderName
      && knownAssetSets.tint.size > 0
      && !knownAssetSets.tint.has(normalizeKnownName(tintProviderName))
    ) {
      diags.push({
        nodeId: null,
        message: `TintProvider Imported references unknown tint "${tintProviderName}"`,
        severity: "warning",
        biomeSection: "TintProvider",
        code: "biome-tint-unknown-ref",
        field: "Name",
        meta: { assetKind: "tint", importName: tintProviderName },
      });
    }
    // A Constant tint with a single color is valid but less interesting than DensityDelimited
    if (tp.Type === "Constant") {
      diags.push({
        nodeId: null,
        message: "TintProvider is a single Constant color - consider DensityDelimited for noise-varied grass tints",
        severity: "info",
        biomeSection: "TintProvider",
      });
    }
    // DensityDelimited with no delimiters
    if (tp.Type === "DensityDelimited") {
      const delimiters = tp.Delimiters;
      if (Array.isArray(delimiters) && delimiters.length === 0) {
        diags.push({
          nodeId: null,
          message: "TintProvider DensityDelimited has no delimiters - will produce no tint variation",
          severity: "warning",
          biomeSection: "TintProvider",
        });
      }
    }
    // Check that color values in tint constants are valid hex
    function checkTintColors(obj: unknown): void {
      if (!obj || typeof obj !== "object") return;
      const o = obj as Record<string, unknown>;
      if (o.Type === "Constant" && typeof o.Color === "string") {
        if (!/^#[0-9a-fA-F]{6}$/.test(o.Color)) {
          diags.push({
            nodeId: null,
            message: `TintProvider has invalid color value "${o.Color}" - must be a 6-digit hex color`,
            severity: "error",
            biomeSection: "TintProvider",
          });
        }
      }
      for (const val of Object.values(o)) {
        if (val && typeof val === "object") checkTintColors(val);
        if (Array.isArray(val)) val.forEach(checkTintColors);
      }
    }
    checkTintColors(tintProvider);
  }

  // Check biome Name
  if (!biomeConfig.Name || typeof biomeConfig.Name !== "string" || !(biomeConfig.Name as string).trim()) {
    diags.push({
      nodeId: null,
      message: "Biome has no Name - Hytale requires a non-empty Name field",
      severity: "error",
      biomeSection: "Terrain",
      code: "biome-name-missing",
      field: "Name",
    });
  }

  return diags;
}

/**
 * Compute a fidelity score for the graph: percentage of density nodes
 * with full (accurate) evaluation status.
 */
export function computeFidelityScore(nodes: Node[]): number {
  let faithful = 0;
  let total = 0;
  for (const node of nodes) {
    const type = getNodeType(node);
    if (!type) continue;
    total++;
    if (getEvalStatus(type) === EvalStatus.Full) faithful++;
  }
  return total === 0 ? 100 : Math.round((faithful / total) * 100);
}
