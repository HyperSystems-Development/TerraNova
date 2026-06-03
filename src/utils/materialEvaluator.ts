/**
 * Material Graph Evaluator
 *
 * Walks the material node graph per-voxel to determine material assignments,
 * mirroring the density evaluator architecture. Falls back to depth-based
 * resolver when no material graph exists.
 *
 * Layout: densities[y * n * n + z * n + x]
 */

import type { Node, Edge } from "@xyflow/react";
import type { EvaluationContext } from "./densityEvaluator";
import type { VoxelMaterial } from "./voxelExtractor";
import { SOLID_THRESHOLD } from "./voxelExtractor";
import {
  matchMaterialName,
  getMaterialProperties,
} from "./materialResolver";
import { HASH_PRIME_A, HASH_PRIME_B, HASH_PRIME_C } from "@/constants";
import type {
  ConditionParameterType,
  LayerContextType,
} from "@/schema/material";

/* ── Interfaces ──────────────────────────────────────────────────── */

interface MaterialVoxelContext {
  x: number; y: number; z: number;       // world coordinates
  xi: number; yi: number; zi: number;     // grid indices
  isSolid: boolean;
  density: number;
  downwardDepth: number;
  upwardDepth: number;
  spaceAbove: number;
  spaceBelow: number;
  surfaceY: number;
}

interface ColumnContext {
  surfaceYi: number;
  bottomYi: number;
  spaceAbove: number;
  spaceBelow: number;
}

/* ── Result type ─────────────────────────────────────────────────── */

export interface MaterialGraphResult {
  materialIds: Uint8Array;
  palette: VoxelMaterial[];
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function getNodeType(node: Node): string {
  const data = node.data as Record<string, unknown>;
  return (data.type as string) ?? "";
}

function getNodeFields(node: Node): Record<string, unknown> {
  const data = node.data as Record<string, unknown>;
  return (data.fields as Record<string, unknown>) ?? {};
}

function hashSeed(seed: number | string | undefined): number {
  if (seed === undefined || seed === null) return 0;
  if (typeof seed === "number") return seed;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h;
}

/** Deterministic hash for world position → [0, 1) */
function positionHash(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const h = ((ix * HASH_PRIME_A + iy * HASH_PRIME_B + iz * HASH_PRIME_C) ^ seed) >>> 0;
  return h / 4294967296;
}

/** Parse material name from node fields */
function parseMaterialName(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.Solid === "string") return obj.Solid;
    if (typeof obj.Material === "string") return obj.Material;
  }
  return null;
}

/**
 * Look up a material input by trying multiple handle IDs (to handle
 * discrepancies between registry and component handle definitions).
 */
function getMaterialInputId(inputs: Map<string, string>, ...ids: string[]): string | undefined {
  for (const id of ids) {
    const src = inputs.get(id);
    if (src) return src;
  }
  return undefined;
}

/* ── Column context pre-computation ──────────────────────────────── */

function computeColumnContexts(
  densities: Float32Array,
  n: number,
  ys: number,
): ColumnContext[][] {
  const columns: ColumnContext[][] = new Array(n);
  for (let z = 0; z < n; z++) {
    columns[z] = new Array(n);
    for (let x = 0; x < n; x++) {
      let surfaceYi = -1;
      let bottomYi = -1;

      // Scan top-down for surface (first solid with air above)
      for (let y = ys - 1; y >= 0; y--) {
        const idx = y * n * n + z * n + x;
        if (densities[idx] >= SOLID_THRESHOLD) {
          if (y === ys - 1 || densities[(y + 1) * n * n + z * n + x] < SOLID_THRESHOLD) {
            surfaceYi = y;
            break;
          }
        }
      }

      // Scan bottom-up for lowest contiguous solid from surface
      if (surfaceYi >= 0) {
        bottomYi = surfaceYi;
        for (let y = surfaceYi - 1; y >= 0; y--) {
          const idx = y * n * n + z * n + x;
          if (densities[idx] >= SOLID_THRESHOLD) {
            bottomYi = y;
          } else {
            break;
          }
        }
      }

      // Count air above surface
      let spaceAbove = 0;
      if (surfaceYi >= 0) {
        for (let y = surfaceYi + 1; y < ys; y++) {
          const idx = y * n * n + z * n + x;
          if (densities[idx] < SOLID_THRESHOLD) {
            spaceAbove++;
          } else {
            break;
          }
        }
      } else {
        spaceAbove = ys;
      }

      // Count air below bottom solid
      let spaceBelow = 0;
      if (bottomYi > 0) {
        for (let y = bottomYi - 1; y >= 0; y--) {
          const idx = y * n * n + z * n + x;
          if (densities[idx] < SOLID_THRESHOLD) {
            spaceBelow++;
          } else {
            break;
          }
        }
      } else if (bottomYi === 0) {
        spaceBelow = 0;
      }

      columns[z][x] = { surfaceYi, bottomYi, spaceAbove, spaceBelow };
    }
  }
  return columns;
}

/* ── Root finding ────────────────────────────────────────────────── */

const MATERIAL_TYPES = new Set([
  "Material:Constant", "Material:Solid", "Material:Empty", "Material:Imported",
  "Material:Queue", "Material:FieldFunction", "Material:Striped",
  "Material:DownwardDepth", "Material:UpwardDepth",
  "Material:DownwardSpace", "Material:UpwardSpace",
  "Material:Surface", "Material:Cave", "Material:Cluster",
  "Material:Exported", "Material:Solidity", "Material:TerrainDensity",
  "Material:SpaceAndDepth", "Material:WeightedRandom",
  "Material:HeightGradient", "Material:NoiseSelector", "Material:NoiseSelectorMaterial",
  "Material:Conditional", "Material:Blend",
  "Material:ConstantThickness", "Material:NoiseThickness",
  "Material:RangeThickness", "Material:WeightedThickness",
]);

function findMaterialRoot(nodes: Node[], edges: Edge[]): Node | null {
  const materialNodes = nodes.filter(n => MATERIAL_TYPES.has(n.type ?? ""));
  if (materialNodes.length === 0) return null;

  // Terminal material node: no outgoing edges to other material nodes
  const sourcesWithMaterialTarget = new Set<string>();
  for (const e of edges) {
    const targetNode = nodes.find(n => n.id === e.target);
    if (targetNode && MATERIAL_TYPES.has(targetNode.type ?? "")) {
      sourcesWithMaterialTarget.add(e.source);
    }
  }

  // A terminal is a material node that is not a source feeding into another material node
  const terminals = materialNodes.filter(n => !sourcesWithMaterialTarget.has(n.id));

  // Prefer non-layer, non-leaf terminal nodes
  const preferred = terminals.filter(n => {
    const t = n.type ?? "";
    return !t.includes("Thickness") && t !== "Material:Exported";
  });

  return preferred[0] ?? terminals[0] ?? materialNodes[0] ?? null;
}

/* ── Condition evaluation ────────────────────────────────────────── */

function stripConditionType(type: string): string {
  return type.replace(/^Condition:/, "");
}

/** Build nested condition JSON from wired Condition:* graph nodes (preview). */
function buildConditionAssetFromNode(
  nodeId: string,
  nodeById: Map<string, Node>,
  inputEdges: Map<string, Map<string, string>>,
  ancestors: Set<string>,
): Record<string, unknown> | null {
  if (ancestors.has(nodeId)) return null;
  ancestors.add(nodeId);

  const node = nodeById.get(nodeId);
  if (!node) {
    ancestors.delete(nodeId);
    return null;
  }

  const rawType = stripConditionType(node.type ?? getNodeType(node));
  const fields = getNodeFields(node);
  const inputs = inputEdges.get(nodeId) ?? new Map<string, string>();
  const asset: Record<string, unknown> = { Type: rawType, ...fields };

  const nestedId = inputs.get("Condition");
  if (nestedId) {
    const nested = buildConditionAssetFromNode(nestedId, nodeById, inputEdges, ancestors);
    if (nested) asset.Condition = nested;
  }

  const conditions: unknown[] = [];
  for (let i = 0; i < 16; i++) {
    const childId = inputs.get(`Conditions[${i}]`) ?? (i === 0 ? inputs.get("Conditions") : undefined);
    if (!childId) break;
    const child = buildConditionAssetFromNode(childId, nodeById, inputEdges, ancestors);
    if (child) conditions.push(child);
  }
  if (conditions.length > 0) asset.Conditions = conditions;

  ancestors.delete(nodeId);
  return asset;
}

function resolveSpaceAndDepthConditionMet(
  fields: Record<string, unknown>,
  inputs: Map<string, string>,
  nodeById: Map<string, Node>,
  inputEdges: Map<string, Map<string, string>>,
  ctx: MaterialVoxelContext,
): boolean {
  const condNodeId = getMaterialInputId(inputs, "Condition");
  if (condNodeId) {
    const condAsset = buildConditionAssetFromNode(condNodeId, nodeById, inputEdges, new Set());
    return condAsset ? evaluateCondition(condAsset, ctx) : false;
  }
  const embedded = fields.Condition;
  if (embedded) return evaluateCondition(embedded, ctx);
  return true;
}

function getContextValue(param: ConditionParameterType, ctx: MaterialVoxelContext): number {
  switch (param) {
    case "SPACE_ABOVE_FLOOR": return ctx.spaceAbove;
    case "SPACE_BELOW_CEILING": return ctx.spaceBelow;
    default: return 0;
  }
}

function evaluateCondition(condition: unknown, ctx: MaterialVoxelContext): boolean {
  if (!condition || typeof condition !== "object") return true;
  const c = condition as Record<string, unknown>;
  const type = c.Type as string | undefined;

  switch (type) {
    case "AlwaysTrueCondition":
      return true;

    case "SmallerThanCondition":
      return getContextValue(c.ContextToCheck as ConditionParameterType, ctx) <
        Number(c.Threshold ?? 0);

    case "GreaterThanCondition":
      return getContextValue(c.ContextToCheck as ConditionParameterType, ctx) >
        Number(c.Threshold ?? 0);

    case "EqualsCondition":
      return getContextValue(c.ContextToCheck as ConditionParameterType, ctx) ===
        Number(c.Value ?? 0);

    case "AndCondition": {
      const conditions = c.Conditions as unknown[] | undefined;
      return conditions ? conditions.every(sub => evaluateCondition(sub, ctx)) : true;
    }

    case "OrCondition": {
      const conditions = c.Conditions as unknown[] | undefined;
      return conditions ? conditions.some(sub => evaluateCondition(sub, ctx)) : false;
    }

    case "NotCondition":
      return !evaluateCondition(c.Condition, ctx);

    default:
      return true;
  }
}

/* ── Main evaluator ──────────────────────────────────────────────── */

/**
 * Evaluate the material node graph for a 3D density volume.
 * Returns null if no material graph is found.
 */
export function evaluateMaterialGraph(
  nodes: Node[],
  edges: Edge[],
  densities: Float32Array,
  resolution: number,
  ySlices: number,
  rangeMin: number,
  rangeMax: number,
  yMin: number,
  yMax: number,
  densityCtx?: EvaluationContext,
): MaterialGraphResult | null {
  const root = findMaterialRoot(nodes, edges);
  if (!root) return null;

  const n = resolution;
  const ys = ySlices;
  const totalSize = n * n * ys;
  const materialIds = new Uint8Array(totalSize);

  // Build palette dynamically
  const palette: VoxelMaterial[] = [];
  const nameToIndex = new Map<string, number>();

  function getOrAddMaterial(name: string): number {
    let idx = nameToIndex.get(name);
    if (idx !== undefined) return idx;
    idx = palette.length;
    nameToIndex.set(name, idx);
    const pbr = getMaterialProperties(name);
    palette.push({
      name,
      color: matchMaterialName(name),
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity,
    });
    return idx;
  }

  // Ensure at least one fallback material
  getOrAddMaterial("Stone");

  // Build edge lookup: targetId → Map<handleId, sourceNodeId>
  const inputEdges = new Map<string, Map<string, string>>();
  for (const e of edges) {
    const map = inputEdges.get(e.target) ?? new Map<string, string>();
    const handle = e.targetHandle ?? "Input";
    map.set(handle, e.source);
    inputEdges.set(e.target, map);
  }

  const nodeById = new Map(nodes.map(nd => [nd.id, nd]));

  // Pre-compute column contexts
  const columns = computeColumnContexts(densities, n, ys);

  // World coordinate mapping
  const stepXZ = (rangeMax - rangeMin) / n;
  const stepY = (yMax - yMin) / Math.max(1, ys);

  // Cycle detection
  const visiting = new Set<string>();

  /** Evaluate a material node, returning the material name or null */
  function evaluateNode(nodeId: string, ctx: MaterialVoxelContext): string | null {
    if (visiting.has(nodeId)) return null;
    visiting.add(nodeId);

    const node = nodeById.get(nodeId);
    if (!node) {
      visiting.delete(nodeId);
      return null;
    }

    const type = node.type ?? getNodeType(node);
    const fields = getNodeFields(node);
    const inputs = inputEdges.get(nodeId) ?? new Map<string, string>();

    let result: string | null = null;

    switch (type) {
      // ── Leaf nodes (return material name) ─────────────────────────

      case "Material:Constant":
      case "Material:Solid": {
        result = parseMaterialName(fields.Material) ?? "Stone";
        break;
      }

      case "Material:Empty": {
        result = null; // air
        break;
      }

      case "Material:Imported": {
        result = parseMaterialName(fields.Material);
        break;
      }

      case "Material:Solidity":
      case "Material:TerrainDensity": {
        result = null; // context nodes, not material sources
        break;
      }

      // ── Filter nodes (conditional pass-through) ───────────────────

      case "Material:DownwardDepth": {
        const maxDepth = Number(fields.MaxDepth ?? fields.Depth ?? 1);
        if (ctx.downwardDepth <= maxDepth) {
          const inputId = getMaterialInputId(inputs, "Input");
          result = inputId ? evaluateNode(inputId, ctx) : null;
        }
        break;
      }

      case "Material:UpwardDepth": {
        const maxDepth = Number(fields.MaxDepth ?? fields.Depth ?? 1);
        if (ctx.upwardDepth <= maxDepth) {
          const inputId = getMaterialInputId(inputs, "Input");
          result = inputId ? evaluateNode(inputId, ctx) : null;
        }
        break;
      }

      case "Material:DownwardSpace": {
        const maxSpace = Number(fields.MaxSpace ?? fields.Space ?? 1);
        if (ctx.spaceBelow <= maxSpace) {
          const inputId = getMaterialInputId(inputs, "Input");
          result = inputId ? evaluateNode(inputId, ctx) : null;
        }
        break;
      }

      case "Material:UpwardSpace": {
        const maxSpace = Number(fields.MaxSpace ?? fields.Space ?? 1);
        if (ctx.spaceAbove <= maxSpace) {
          const inputId = getMaterialInputId(inputs, "Input");
          result = inputId ? evaluateNode(inputId, ctx) : null;
        }
        break;
      }

      case "Material:Surface":
      case "Material:Cave":
      case "Material:Cluster":
      case "Material:Exported": {
        const inputId = getMaterialInputId(inputs, "Input");
        result = inputId ? evaluateNode(inputId, ctx) : null;
        break;
      }

      // ── Combinator nodes ──────────────────────────────────────────

      case "Material:Queue": {
        // Evaluate entries in order; first non-null wins
        for (let i = 0; i < 16; i++) {
          const entryId = getMaterialInputId(inputs, `Queue[${i}]`, `Entries[${i}]`);
          if (!entryId) break;
          const mat = evaluateNode(entryId, ctx);
          if (mat !== null) {
            result = mat;
            break;
          }
        }
        break;
      }

      case "Material:FieldFunction": {
        // Evaluate density input; if >= 0.5 → Materials[1], else Materials[0]
        let densityVal = 0;
        const densityInputId = inputs.get("FieldFunction");
        if (densityInputId && densityCtx) {
          densityCtx.clearMemo();
          densityVal = densityCtx.evaluate(densityInputId, ctx.x, ctx.y, ctx.z);
        }
        const matIdx = densityVal >= 0.5 ? 1 : 0;
        const matId = getMaterialInputId(inputs, `Materials[${matIdx}]`);
        result = matId ? evaluateNode(matId, ctx) : null;
        break;
      }

      case "Material:Striped": {
        const seed = hashSeed(fields.Seed as string | number | undefined);
        const thickness = Math.max(1, Number(fields.Thickness ?? 1));
        const stripeIndex = Math.floor((ctx.y + seed) / thickness) % 2;
        const idx = stripeIndex < 0 ? stripeIndex + 2 : stripeIndex; // handle negative modulo
        const matId = getMaterialInputId(inputs, `Materials[${idx}]`);
        result = matId ? evaluateNode(matId, ctx) : null;
        break;
      }

      case "Material:Conditional": {
        // Evaluate density condition
        let condVal = 0;
        const condId = inputs.get("Condition");
        if (condId && densityCtx) {
          densityCtx.clearMemo();
          condVal = densityCtx.evaluate(condId, ctx.x, ctx.y, ctx.z);
        }
        const threshold = Number(fields.Threshold ?? 0.5);
        const selectedId = condVal >= threshold
          ? getMaterialInputId(inputs, "TrueInput")
          : getMaterialInputId(inputs, "FalseInput");
        result = selectedId ? evaluateNode(selectedId, ctx) : null;
        break;
      }

      case "Material:Blend": {
        // Discrete blend: evaluate factor, pick A or B
        let factorVal = 0.5;
        const factorId = inputs.get("Factor");
        if (factorId && densityCtx) {
          densityCtx.clearMemo();
          factorVal = densityCtx.evaluate(factorId, ctx.x, ctx.y, ctx.z);
        }
        const selectedId = factorVal >= 0.5
          ? getMaterialInputId(inputs, "InputB")
          : getMaterialInputId(inputs, "InputA");
        result = selectedId ? evaluateNode(selectedId, ctx) : null;
        break;
      }

      case "Material:HeightGradient": {
        const range = fields.Range as { Min?: number; Max?: number } | undefined;
        const rangeMinY = Number(range?.Min ?? yMin);
        const rangeMaxY = Number(range?.Max ?? yMax);
        const mid = (rangeMinY + rangeMaxY) / 2;
        const selectedId = ctx.y >= mid
          ? getMaterialInputId(inputs, "High")
          : getMaterialInputId(inputs, "Low");
        result = selectedId ? evaluateNode(selectedId, ctx) : null;
        break;
      }

      case "Material:WeightedRandom": {
        // Use world coordinate hash to select between inputs
        const h = positionHash(ctx.x, ctx.y, ctx.z, 0);
        // Try up to 16 entries
        let count = 0;
        for (let i = 0; i < 16; i++) {
          const entryId = getMaterialInputId(inputs, `Entries[${i}]`);
          if (!entryId) break;
          count++;
        }
        if (count > 0) {
          const selected = Math.floor(h * count);
          const entryId = getMaterialInputId(inputs, `Entries[${selected}]`);
          result = entryId ? evaluateNode(entryId, ctx) : null;
        }
        break;
      }

      case "Material:NoiseSelector":
      case "Material:NoiseSelectorMaterial": {
        // Count connected inputs and use hash to pick one
        let count = 0;
        for (let i = 0; i < 16; i++) {
          if (!getMaterialInputId(inputs, `Inputs[${i}]`)) break;
          count++;
        }
        if (count > 0) {
          const h = positionHash(ctx.x, ctx.y, ctx.z, 42);
          const selected = Math.floor(h * count);
          const selectedId = getMaterialInputId(inputs, `Inputs[${selected}]`);
          result = selectedId ? evaluateNode(selectedId, ctx) : null;
        }
        break;
      }

      // ── SpaceAndDepth V2 (layer accumulation) ─────────────────────

      case "Material:SpaceAndDepth": {
        if (!resolveSpaceAndDepthConditionMet(fields, inputs, nodeById, inputEdges, ctx)) {
          break;
        }

        const layerContext = (fields.LayerContext as LayerContextType) ?? "DEPTH_INTO_FLOOR";
        const isFloor = layerContext === "DEPTH_INTO_FLOOR";
        const depth = isFloor ? ctx.downwardDepth : ctx.upwardDepth;

        // Walk layers, accumulating thickness
        let accumulated = 0;
        for (let i = 0; i < 16; i++) {
          const layerId = getMaterialInputId(inputs, `Layers[${i}]`);
          if (!layerId) break;

          const layerNode = nodeById.get(layerId);
          if (!layerNode) continue;

          const layerType = layerNode.type ?? getNodeType(layerNode);
          const layerFields = getNodeFields(layerNode);
          const layerInputs = inputEdges.get(layerId) ?? new Map<string, string>();

          let thickness = 1;
          switch (layerType) {
            case "Material:ConstantThickness":
            case "Layer:ConstantThickness":
              thickness = Number(layerFields.Thickness ?? 1);
              break;

            case "Material:RangeThickness":
            case "Layer:RangeThickness": {
              const rMin = Number(layerFields.RangeMin ?? 1);
              const rMax = Number(layerFields.RangeMax ?? 3);
              const seed = hashSeed(layerFields.Seed as string | number | undefined);
              const h = positionHash(ctx.x, 0, ctx.z, seed);
              thickness = Math.round(rMin + h * (rMax - rMin));
              break;
            }

            case "Material:WeightedThickness":
            case "Layer:WeightedThickness": {
              const entries = layerFields.PossibleThicknesses as
                Array<{ Weight: number; Thickness: number }> | undefined;
              if (entries && entries.length > 0) {
                const seed = hashSeed(layerFields.Seed as string | number | undefined);
                const h = positionHash(ctx.x, 0, ctx.z, seed);
                let totalW = 0;
                for (const e of entries) totalW += (e.Weight ?? 1);
                const t = h * totalW;
                let cum = 0;
                for (const e of entries) {
                  cum += (e.Weight ?? 1);
                  if (t < cum) {
                    thickness = e.Thickness ?? 1;
                    break;
                  }
                }
              }
              break;
            }

            case "Material:NoiseThickness":
            case "Layer:NoiseThickness": {
              // Evaluate density input for thickness
              const noiseId = layerInputs.get("ThicknessFunctionXZ");
              if (noiseId && densityCtx) {
                densityCtx.clearMemo();
                const noiseVal = densityCtx.evaluate(noiseId, ctx.x, 0, ctx.z);
                thickness = Math.max(1, Math.round(Math.abs(noiseVal)));
              }
              break;
            }
          }

          const prevAccumulated = accumulated;
          accumulated += thickness;

          // Check if this voxel's depth falls within this layer
          if (depth >= prevAccumulated && depth < accumulated) {
            // Evaluate this layer's material input
            const matId = getMaterialInputId(layerInputs, "Material");
            if (matId) {
              result = evaluateNode(matId, ctx);
            }
            break;
          }
        }
        break;
      }

      // ── Layer sub-types (when evaluated directly) ─────────────────

      case "Material:ConstantThickness":
      case "Material:RangeThickness":
      case "Material:WeightedThickness":
      case "Material:NoiseThickness":
      case "Layer:ConstantThickness":
      case "Layer:RangeThickness":
      case "Layer:WeightedThickness":
      case "Layer:NoiseThickness": {
        // If evaluated directly (not via SpaceAndDepth), just pass through Material
        const matId = getMaterialInputId(inputs, "Material");
        result = matId ? evaluateNode(matId, ctx) : null;
        break;
      }

      default:
        // Unknown material type — try Input handle
        const fallbackId = getMaterialInputId(inputs, "Input", "Inputs[0]");
        result = fallbackId ? evaluateNode(fallbackId, ctx) : null;
        break;
    }

    visiting.delete(nodeId);
    return result;
  }

  // Evaluate each solid voxel
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const col = columns[z][x];
      if (col.surfaceYi < 0) continue; // all-air column

      for (let y = 0; y < ys; y++) {
        const idx = y * n * n + z * n + x;
        const density = densities[idx];
        if (density < SOLID_THRESHOLD) continue; // air

        // Compute world coordinates
        const wx = rangeMin + x * stepXZ;
        const wy = yMin + y * stepY;
        const wz = rangeMin + z * stepXZ;

        // Build voxel context
        const voxelCtx: MaterialVoxelContext = {
          x: wx, y: wy, z: wz,
          xi: x, yi: y, zi: z,
          isSolid: true,
          density,
          downwardDepth: Math.max(0, col.surfaceYi - y),
          upwardDepth: Math.max(0, y - col.bottomYi),
          spaceAbove: col.spaceAbove,
          spaceBelow: col.spaceBelow,
          surfaceY: yMin + col.surfaceYi * stepY,
        };

        visiting.clear();
        const matName = evaluateNode(root.id, voxelCtx);

        if (matName) {
          materialIds[idx] = getOrAddMaterial(matName);
        }
        // else materialIds[idx] stays 0 (Stone fallback)
      }
    }
  }

  return { materialIds, palette };
}
