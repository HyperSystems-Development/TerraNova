/**
 * Import transformer: Hytale native JSON → TerraNova internal format.
 *
 * Reverses all structural transformations performed by internalToHytale.ts:
 * type renames, Inputs[]→named handles, field renames, $NodeId stripping, etc.
 */

import {
  HYTALE_TO_INTERNAL_TYPES,
  HYTALE_ARRAY_TO_NAMED,
  CLAMP_FIELD_REVERSE,
  NORMALIZER_FIELDS_EXPORT,
} from "./translationMaps";
import { DEFAULT_WORLD_HEIGHT } from "@/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// interface V2Asset {
//   Type: string;
//   [key: string]: unknown;
// }

interface ImportContext {
  parentField?: string;
  /** Collected $NodeEditorMetadata from root, if any */
  metadata?: Record<string, unknown>;
}

/** Side-channel storage for import metadata */
export interface ImportMetadata {
  nodeEditorMetadata?: Record<string, unknown>;
  comments: Record<string, string>;
  nodeIds: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/** Detect whether a JSON object is in Hytale native format (has $NodeId). */
export function isHytaleNativeFormat(json: unknown): boolean {
  return typeof json === "object" && json !== null && "$NodeId" in (json as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// function stripCategoryPrefix(type: string): string {
//   const idx = type.indexOf(":");
//   return idx >= 0 ? type.substring(idx + 1) : type;
// }

// ---------------------------------------------------------------------------
// Per-type field reverse transformers
// ---------------------------------------------------------------------------

function reverseNoiseFields(
  asset: Record<string, unknown>,
  hytaleType: string,
): Record<string, unknown> {
  const result = { ...asset };

  // Scale → Frequency (inverse) for 2D
  if ("Scale" in result && (hytaleType === "SimplexNoise2D" || hytaleType === "CellNoise2D")) {
    const scale = result.Scale as number;
    result.Frequency = scale !== 0 ? 1 / scale : 1;
    delete result.Scale;
  }

  // ScaleXZ + ScaleY → Frequency for SimplexNoise3D
  if ("ScaleXZ" in result && hytaleType === "SimplexNoise3D") {
    const scale = result.ScaleXZ as number;
    result.Frequency = scale !== 0 ? 1 / scale : 1;
    delete result.ScaleXZ;
    delete result.ScaleY;
  }

  // ScaleX + ScaleZ → Frequency for CellNoise2D
  if ("ScaleX" in result && hytaleType === "CellNoise2D") {
    const scale = result.ScaleX as number;
    result.Frequency = scale !== 0 ? 1 / scale : 1;
    delete result.ScaleX;
    delete result.ScaleZ;
  }

  // ScaleX + ScaleY + ScaleZ → Frequency for CellNoise3D
  if ("ScaleX" in result && hytaleType === "CellNoise3D") {
    const scale = result.ScaleX as number;
    result.Frequency = scale !== 0 ? 1 / scale : 1;
    delete result.ScaleX;
    delete result.ScaleY;
    delete result.ScaleZ;
  }

  // Persistence → Gain
  if ("Persistence" in result) {
    result.Gain = result.Persistence;
    delete result.Persistence;
  }

  // Seed: string → number (if it parses as a number, keep as string for new format)
  // Actually, keep as string since we're updating defaults to string
  // But for backwards compat, leave as-is

  return result;
}

function reverseClampFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  for (const [hytale, internal] of Object.entries(CLAMP_FIELD_REVERSE)) {
    if (hytale in result) {
      result[internal] = result[hytale];
      delete result[hytale];
    }
  }
  return result;
}

function reverseSmoothFields(
  asset: Record<string, unknown>,
  hytaleType: string,
): Record<string, unknown> {
  const result = { ...asset };

  if (hytaleType === "SmoothFloor" || hytaleType === "SmoothCeiling") {
    // V2 uses Limit + SmoothRange → internal Threshold + Smoothness
    if ("Limit" in result) {
      result.Threshold = result.Limit;
      delete result.Limit;
    }
    if ("SmoothRange" in result) {
      result.Smoothness = result.SmoothRange;
      delete result.SmoothRange;
    }
  } else {
    // SmoothClamp/SmoothMin/SmoothMax: Range → Smoothness
    if ("Range" in result) {
      result.Smoothness = result.Range;
      delete result.Range;
    }
  }
  return result;
}

function reverseNormalizerFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const { nested } = NORMALIZER_FIELDS_EXPORT;

  // Rebuild nested objects from flat fields
  for (const [rangeKey, fieldMap] of Object.entries(nested)) {
    const rangeObj: Record<string, number> = {};
    let hasAny = false;
    for (const [subKey, flatKey] of Object.entries(fieldMap)) {
      if (flatKey in result) {
        rangeObj[subKey] = result[flatKey] as number;
        delete result[flatKey];
        hasAny = true;
      }
    }
    if (hasAny) {
      result[rangeKey] = rangeObj;
    }
  }

  return result;
}

function reverseScaleFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("ScaleX" in result && "ScaleY" in result && "ScaleZ" in result) {
    result.Scale = {
      x: result.ScaleX as number,
      y: result.ScaleY as number,
      z: result.ScaleZ as number,
    };
    delete result.ScaleX;
    delete result.ScaleY;
    delete result.ScaleZ;
  }
  return result;
}

function reverseSliderFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("SlideX" in result || "SlideY" in result || "SlideZ" in result) {
    result.Translation = {
      x: (result.SlideX as number) ?? 0,
      y: (result.SlideY as number) ?? 0,
      z: (result.SlideZ as number) ?? 0,
    };
    delete result.SlideX;
    delete result.SlideY;
    delete result.SlideZ;
  }
  return result;
}

function reverseRotatorFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("SpinAngle" in result) {
    result.AngleDegrees = result.SpinAngle;
    delete result.SpinAngle;
  }
  // NewYAxis contains Point3D data — keep it so the recursive field processing
  // can detect it and convert it to a Constant vector child node.
  return result;
}

function reverseFastGradientWarpFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // Hytale uses "Seed", internal uses "WarpSeed"
  if ("Seed" in result) {
    result.WarpSeed = result.Seed;
    delete result.Seed;
  }
  // Hytale uses "2D", internal uses "Is2D"
  if ("2D" in result) {
    result.Is2D = result["2D"];
    delete result["2D"];
  }
  return result;
}

function reverseAmplitudeConstantFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("Value" in result) {
    result.Scale = result.Value;
    delete result.Value;
  }
  result.Offset = 0;
  return result;
}

function reversePowFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // If Exponent === 2, this was Square
  delete result.Exponent;
  return result;
}

function reverseColumnLinearFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("MinY" in result && "MaxY" in result) {
    result.Range = {
      Min: result.MinY as number,
      Max: result.MaxY as number,
    };
    result.StepSize = 1;
    delete result.MinY;
    delete result.MaxY;
  }
  delete result.ResultCap;
  delete result.TopDownOrder;
  delete result.RelativeToPosition;
  delete result.BaseHeightName;
  return result;
}

function reversePrefabPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("WeightedPrefabPaths" in result && Array.isArray(result.WeightedPrefabPaths)) {
    // Preserve the full array — only strip $NodeId from each entry
    result.WeightedPrefabPaths = (result.WeightedPrefabPaths as Record<string, unknown>[]).map(
      ({ $NodeId: _, ...rest }) => rest,
    );
  }
  return result;
}

function reverseColumnPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("ColumnBlocks" in result && Array.isArray(result.ColumnBlocks)) {
    const blocks = result.ColumnBlocks as Record<string, unknown>[];
    if (blocks.length > 0) {
      const first = blocks[0];
      result.Height = first.Y ?? 0;
      const mat = first.Material;
      if (mat && typeof mat === "object" && "Solid" in (mat as Record<string, unknown>)) {
        result.Material = (mat as Record<string, unknown>).Solid;
      } else {
        result.Material = mat;
      }
    }
    delete result.ColumnBlocks;
  }
  return result;
}

function reverseBoxPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("Range" in result) {
    result.Size = result.Range;
    delete result.Range;
  }
  // Unwrap material object
  if (result.Material && typeof result.Material === "object" && "Solid" in (result.Material as Record<string, unknown>)) {
    result.Material = (result.Material as Record<string, unknown>).Solid;
  }
  return result;
}

function reversePositionOffsetFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("OffsetX" in result || "OffsetY" in result || "OffsetZ" in result) {
    result.Offset = {
      x: (result.OffsetX as number) ?? 0,
      y: (result.OffsetY as number) ?? 0,
      z: (result.OffsetZ as number) ?? 0,
    };
    delete result.OffsetX;
    delete result.OffsetY;
    delete result.OffsetZ;
  }
  return result;
}

function reverseCacheFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  delete result.Capacity;
  delete result.ExportAs;
  return result;
}

function reverseMesh2DPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("PointGenerator" in result && typeof result.PointGenerator === "object") {
    const pg = result.PointGenerator as Record<string, unknown>;
    result.Resolution = (pg.ScaleX as number) ?? (pg.Spacing as number) ?? 8;
    result.Jitter = pg.Jitter ?? 0.4;
    delete result.PointGenerator;
  }
  delete result.PointsY;
  return result;
}

function reverseSpaceAndDepthFields(
  asset: Record<string, unknown>,
  ctx: ImportContext,
  metadata: ImportMetadata,
): Record<string, unknown> {
  const result = { ...asset };
  if ("Layers" in result && Array.isArray(result.Layers)) {
    const layers = result.Layers as Record<string, unknown>[];

    if (layers.length > 2) {
      // 3+ layers: preserve the original data as opaque passthrough.
      // Store the raw Layers array, LayerContext, and MaxExpectedDepth
      // so the export path can emit them verbatim.
      result.__rawLayers = result.Layers;
      result.__rawLayerContext = result.LayerContext;
      result.__rawMaxExpectedDepth = result.MaxExpectedDepth;
      delete result.Layers;
      delete result.LayerContext;
      delete result.MaxExpectedDepth;
    } else if (layers.length >= 2) {
      // 2-layer case: flatten to DepthThreshold/Empty/Solid as before
      const emptyLayer = layers[0];
      const solidLayer = layers[1];
      result.DepthThreshold = (emptyLayer.Thickness as number) ?? 2;

      // Reverse-transform the Material child nodes
      const emptyMat = emptyLayer.Material;
      if (emptyMat && typeof emptyMat === "object" && "Type" in (emptyMat as Record<string, unknown>)) {
        result.Empty = transformNodeToInternal(emptyMat as Record<string, unknown>, { ...ctx, parentField: "Material" }, metadata);
      } else {
        result.Empty = unwrapMaterial(emptyMat) ?? emptyMat;
      }

      const solidMat = solidLayer.Material;
      if (solidMat && typeof solidMat === "object" && "Type" in (solidMat as Record<string, unknown>)) {
        result.Solid = transformNodeToInternal(solidMat as Record<string, unknown>, { ...ctx, parentField: "Material" }, metadata);
      } else {
        result.Solid = unwrapMaterial(solidMat) ?? solidMat;
      }

      // Preserve the actual MaxExpectedDepth instead of discarding it
      if ("MaxExpectedDepth" in result) {
        result.__originalMaxExpectedDepth = result.MaxExpectedDepth;
      }

      delete result.Layers;
      delete result.LayerContext;
      delete result.MaxExpectedDepth;
    } else {
      // 0-1 layers: still clean up Hytale-only fields
      delete result.Layers;
      delete result.LayerContext;
      delete result.MaxExpectedDepth;
    }
  }
  return result;
}

function reverseFieldFunctionPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // Positions → PositionProvider
  if ("Positions" in result) {
    result.PositionProvider = result.Positions;
    delete result.Positions;
  }
  // Delimiters → Threshold (take Min from first delimiter)
  if ("Delimiters" in result && Array.isArray(result.Delimiters)) {
    const delimiters = result.Delimiters as Record<string, unknown>[];
    if (delimiters.length > 0) {
      result.Threshold = delimiters[0].Min ?? 0;
    }
    delete result.Delimiters;
  }
  // Rename FieldFunction → DensityFunction
  if ("FieldFunction" in result) {
    result.DensityFunction = result.FieldFunction;
    delete result.FieldFunction;
  }
  return result;
}

function reverseClusterPropFields(
  asset: Record<string, unknown>,
  ctx: ImportContext,
  metadata: ImportMetadata,
): Record<string, unknown> {
  const result = { ...asset };
  if ("WeightedProps" in result && result.WeightedProps != null) {
    const wp = result.WeightedProps;
    const props: unknown[] = [];

    if (Array.isArray(wp)) {
      // Array format (correct Hytale format)
      for (const entry of wp) {
        const childProp = (entry as Record<string, unknown>).ColumnProp;
        if (childProp && typeof childProp === "object" && "Type" in (childProp as Record<string, unknown>)) {
          props.push(transformNodeToInternal(childProp as Record<string, unknown>, { ...ctx, parentField: "Prop" }, metadata));
        } else {
          props.push(childProp);
        }
      }
    } else if (typeof wp === "object") {
      // Object format (legacy/fallback)
      for (const entry of Object.values(wp as Record<string, Record<string, unknown>>)) {
        const childProp = entry.ColumnProp;
        if (childProp && typeof childProp === "object" && "Type" in (childProp as Record<string, unknown>)) {
          props.push(transformNodeToInternal(childProp as Record<string, unknown>, { ...ctx, parentField: "Prop" }, metadata));
        } else {
          props.push(childProp);
        }
      }
    }

    result.Props = props;
    delete result.WeightedProps;
  }
  // Preserve Range, Seed, and DistanceCurve for round-trip fidelity.
  // These were previously deleted, causing data loss on re-export.
  return result;
}

function reverseDirectionalityFields(
  asset: Record<string, unknown>,
  hytaleType: string,
): Record<string, unknown> {
  if (hytaleType === "Random") {
    const result = { ...asset };
    // Random → Uniform, strip Seed and Pattern (not part of internal format)
    delete result.Seed;
    delete result.Pattern;
    return result;
  }
  return asset;
}

// ---------------------------------------------------------------------------
// Curve point reverse transform
// ---------------------------------------------------------------------------

function reverseCurvePoints(points: unknown[]): unknown[] {
  return points.map((pt) => {
    if (pt && typeof pt === "object" && "In" in (pt as Record<string, unknown>)) {
      const obj = pt as Record<string, unknown>;
      return { x: obj.In ?? 0, y: obj.Out ?? 0 };
    }
    return pt;
  });
}

// ---------------------------------------------------------------------------
// Recursive $NodeId stripping for non-typed nested structures
// ---------------------------------------------------------------------------

function stripNodeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripNodeIds(item));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "$NodeId") continue;
      result[k] = stripNodeIds(v);
    }
    return result;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Material object → string unwrapping
// ---------------------------------------------------------------------------

function unwrapMaterial(value: unknown): unknown {
  if (
    value && typeof value === "object" && !Array.isArray(value) &&
    "Solid" in (value as Record<string, unknown>) &&
    !("Type" in (value as Record<string, unknown>))
  ) {
    return (value as Record<string, unknown>).Solid;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Inputs[] → named handle conversion
// ---------------------------------------------------------------------------

function distributeInputs(
  inputs: unknown[],
  internalType: string,
  _ctx: ImportContext,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const handleNames = HYTALE_ARRAY_TO_NAMED[internalType];
  if (!handleNames) {
    // No named handles — keep as Inputs[]
    result.Inputs = inputs;
    return result;
  }

  for (let i = 0; i < inputs.length; i++) {
    if (i < handleNames.length) {
      result[handleNames[i]] = inputs[i];
    } else {
      // Overflow — shouldn't happen for known types, but keep as array
      if (!result.Inputs) result.Inputs = [];
      (result.Inputs as unknown[]).push(inputs[i]);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Infer category from Hytale $NodeId prefix
// ---------------------------------------------------------------------------

function inferCategoryFromNodeId(nodeId: string): string | undefined {
  if (nodeId.includes("DensityNode") || nodeId.includes(".Density")) return "density";
  if (nodeId.includes("MaterialProvider")) return "material";
  if (nodeId.includes("SADMP")) return "sadLayer";
  if (nodeId.includes("Curve")) return "curve";
  if (nodeId.includes("CurvePoint")) return "curvePoint";
  if (nodeId.includes(".Pattern")) return "pattern";
  if (nodeId.includes(".Scanner")) return "scanner";
  if (nodeId.includes(".Assignments")) return "assignment";
  if (nodeId.includes("Positions")) return "position";
  if (nodeId.includes("VectorProvider") || nodeId.includes("Point3D")) return "vector";
  if (nodeId.includes("Prop")) return "prop";
  if (nodeId.includes(".Directionality")) return "directionality";
  if (nodeId.includes(".EnvironmentProvider")) return "environment";
  if (nodeId.includes(".TintProvider")) return "tint";
  if (nodeId.includes(".BlockMask")) return "blockMask";
  return undefined;
}

// ---------------------------------------------------------------------------
// Standalone FieldFunction MaterialProvider with Delimiters → Materials[]
// ---------------------------------------------------------------------------

/**
 * Reverse a standalone FieldFunction MaterialProvider (with Delimiters array)
 * into the internal format with separate Materials[] and DelimiterRanges[].
 *
 * Hytale:                              Internal:
 * FieldFunction {                 →    FieldFunction {
 *   FieldFunction: <density>,           FieldFunction: <density>,
 *   Delimiters: [                       Materials: [matA, matB, ...],
 *     {From:0, To:25, Material:matA},   DelimiterRanges: [{From:0,To:25}, ...],
 *     {From:25, To:40, Material:matB},  ExportAs: ...
 *   ],                                }
 *   ExportAs: ...
 * }
 */
function reverseFieldFunctionMaterialDelimiters(
  asset: Record<string, unknown>,
  ctx: ImportContext,
  metadata: ImportMetadata,
): Record<string, unknown> {
  const output: Record<string, unknown> = { Type: "FieldFunction" };

  // Transform the density subtree
  const densityTree = asset.FieldFunction as Record<string, unknown> | undefined;
  if (densityTree && typeof densityTree === "object" && "Type" in densityTree) {
    output.FieldFunction = transformNodeToInternal(densityTree, { ...ctx, parentField: "FieldFunction" }, metadata);
  }

  // Process Delimiters: extract Materials and ranges
  const delimiters = asset.Delimiters as Record<string, unknown>[];
  const materials: unknown[] = [];
  const delimiterRanges: Record<string, unknown>[] = [];

  for (const delimiter of delimiters) {
    // Extract and transform the Material
    const materialValue = delimiter.Material;
    if (materialValue && typeof materialValue === "object" && "Type" in (materialValue as Record<string, unknown>)) {
      materials.push(
        transformNodeToInternal(materialValue as Record<string, unknown>, { ...ctx, parentField: "Material" }, metadata),
      );
    } else {
      const unwrapped = unwrapMaterial(materialValue);
      if (typeof unwrapped === "string") {
        materials.push({ Type: "Constant", Material: unwrapped });
      } else if (unwrapped && typeof unwrapped === "object") {
        materials.push(stripNodeIds(unwrapped));
      } else {
        materials.push({ Type: "Constant", Material: "Air" });
      }
    }

    // Collect the range
    delimiterRanges.push({
      From: delimiter.From ?? 0,
      To: delimiter.To ?? 1000,
    });
  }

  output.Materials = materials;
  output.DelimiterRanges = delimiterRanges;

  // Preserve ExportAs if present
  if ("ExportAs" in asset) {
    output.ExportAs = asset.ExportAs;
  }

  return output;
}

// ---------------------------------------------------------------------------
// Queue[FieldFunction] → Conditional chain reverse transform
// ---------------------------------------------------------------------------

/**
 * Reverse a Hytale Queue of FieldFunction entries (with Delimiters) back into
 * a nested Conditional chain for TerraNova's internal material model.
 *
 * Hytale:                              Internal:
 * Queue: [                              Conditional(T=0.7, cond=noise1,
 *   FieldFunction(ff=noise1,              true=MatA,
 *     delim=[{0.7,1000,MatA}]),           false=Conditional(T=0.45,
 *   FieldFunction(ff=noise2,                cond=noise2,
 *     delim=[{0.45,1000,MatB}]),            true=MatB,
 *   MatD  // fallback                       false=MatD))
 * ]
 */
function reverseQueueFieldFunctionChain(
  queueArray: Record<string, unknown>[],
  ctx: ImportContext,
  metadata: ImportMetadata,
): Record<string, unknown> {
  // Separate FieldFunction entries from fallback
  const ffEntries: Record<string, unknown>[] = [];
  let fallback: Record<string, unknown> | undefined;

  for (const item of queueArray) {
    if (item.Type === "FieldFunction" && "Delimiters" in item) {
      ffEntries.push(item);
    } else {
      // Last non-FieldFunction entry is the fallback
      fallback = item;
    }
  }

  // Build chain bottom-up: start with fallback as innermost FalseInput
  let result: Record<string, unknown>;

  if (fallback) {
    if ("Type" in fallback) {
      const imported = transformNodeToInternal(fallback, { ...ctx, parentField: "Material" }, metadata);
      result = typeof imported === "string" ? { Type: "Constant", Material: imported } : imported;
    } else {
      // Material leaf node
      const mat = unwrapMaterial(fallback);
      if (typeof mat === "string") {
        result = { Type: "Constant", Material: mat };
      } else {
        result = fallback;
      }
    }
  } else {
    result = { Type: "Constant", Material: "Air" };
  }

  // Iterate FieldFunction entries in reverse to build nested Conditionals
  for (let i = ffEntries.length - 1; i >= 0; i--) {
    const ff = ffEntries[i];
    const delimiters = ff.Delimiters as Record<string, unknown>[];

    if (!delimiters || delimiters.length === 0) continue;

    const delimiter = delimiters[0]; // Use first delimiter
    const threshold = delimiter.From as number;

    // Import density tree from FieldFunction field
    let condition: Record<string, unknown> | string;
    const densityTree = ff.FieldFunction as Record<string, unknown> | undefined;
    if (densityTree && typeof densityTree === "object" && "Type" in densityTree) {
      condition = transformNodeToInternal(densityTree, { ...ctx, parentField: "Condition" }, metadata);
    } else {
      condition = { Type: "Constant", Value: 0 };
    }

    // Import material from Delimiter
    let trueInput: Record<string, unknown> | string;
    const materialValue = delimiter.Material;
    if (materialValue && typeof materialValue === "object" && "Type" in (materialValue as Record<string, unknown>)) {
      trueInput = transformNodeToInternal(materialValue as Record<string, unknown>, { ...ctx, parentField: "Material" }, metadata);
    } else {
      const unwrapped = unwrapMaterial(materialValue);
      if (typeof unwrapped === "string") {
        trueInput = { Type: "Constant", Material: unwrapped };
      } else if (unwrapped && typeof unwrapped === "object") {
        trueInput = unwrapped as Record<string, unknown>;
      } else {
        trueInput = { Type: "Constant", Material: "Air" };
      }
    }

    result = {
      Type: "Conditional",
      Threshold: threshold,
      Condition: condition,
      TrueInput: trueInput,
      FalseInput: result,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main recursive transformer
// ---------------------------------------------------------------------------

function transformNodeToInternal(
  asset: Record<string, unknown>,
  ctx: ImportContext,
  metadata: ImportMetadata,
): Record<string, unknown> | string {
  // Material leaf: { $NodeId, Solid: "name" } without Type → unwrap to string
  if (!("Type" in asset) && "Solid" in asset) {
    return asset.Solid as string;
  }

  const hytaleType = asset.Type as string;
  const nodeId = asset.$NodeId as string | undefined;

  // Collect metadata
  if (nodeId) {
    if (asset.$Comment) {
      metadata.comments[nodeId] = asset.$Comment as string;
    }
  }

  // Determine category for field transforms
  const category = nodeId
    ? inferCategoryFromNodeId(nodeId)
    : (ctx.parentField ? inferCategoryFromParent(ctx.parentField) : "density");

  // Detect Abs(SimplexNoise) compound → collapse to SimplexRidgeNoise
  if (hytaleType === "Abs" && "Inputs" in asset && Array.isArray(asset.Inputs)) {
    const rawInputs = asset.Inputs as Record<string, unknown>[];
    if (rawInputs.length === 1 && rawInputs[0]?.Type) {
      const innerType = rawInputs[0].Type as string;
      if (innerType === "SimplexNoise2D" || innerType === "SimplexNoise3D") {
        const ridgeType = innerType === "SimplexNoise2D" ? "SimplexRidgeNoise2D" : "SimplexRidgeNoise3D";
        // Process inner node, override its type to ridge
        const inner = transformNodeToInternal(rawInputs[0], ctx, metadata);
        if (typeof inner === "object") {
          (inner as Record<string, unknown>).Type = ridgeType;
          return inner;
        }
      }
    }
  }

  // Detect Normalizer(YValue) compound → collapse to GradientDensity
  if (hytaleType === "Normalizer" && "Inputs" in asset && Array.isArray(asset.Inputs)) {
    const rawInputs = asset.Inputs as Record<string, unknown>[];
    if (rawInputs.length === 1 && rawInputs[0]?.Type === "YValue") {
      const fromMin = (asset.FromMin as number) ?? 0;
      const fromMax = (asset.FromMax as number) ?? DEFAULT_WORLD_HEIGHT;
      return {
        Type: "GradientDensity",
        FromY: fromMax,
        ToY: fromMin,
      };
    }
  }

  // Detect SpaceAndDepth with Layers → reverse to flat DepthThreshold/Solid/Empty
  if (hytaleType === "SpaceAndDepth" && category === "material" &&
      "Layers" in asset && Array.isArray(asset.Layers)) {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type" || key === "$NodeId" || key === "$Comment" || key === "$NodeEditorMetadata" || key === "Skip") continue;
      fields[key] = value;
    }
    const reversed = reverseSpaceAndDepthFields(fields, ctx, metadata);
    return { Type: "SpaceAndDepth", ...reversed };
  }

  // Detect Cluster prop with WeightedProps → reverse to flat Props array
  if (hytaleType === "Cluster" && category === "prop" &&
      "WeightedProps" in asset) {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type" || key === "$NodeId" || key === "$Comment" || key === "$NodeEditorMetadata" || key === "Skip") continue;
      fields[key] = value;
    }
    const reversed = reverseClusterPropFields(fields, ctx, metadata);
    return { Type: "Cluster", ...reversed };
  }

  // Detect standalone FieldFunction MaterialProvider with Delimiters → expand to Materials[]
  if (hytaleType === "FieldFunction" && category === "material" &&
      "Delimiters" in asset && Array.isArray(asset.Delimiters)) {
    return reverseFieldFunctionMaterialDelimiters(asset, ctx, metadata);
  }

  // Detect Queue[FieldFunction(Delimiters)] → reverse to Conditional chain
  if (hytaleType === "Queue" && category === "material" &&
      "Queue" in asset && Array.isArray(asset.Queue)) {
    const queueArray = asset.Queue as Record<string, unknown>[];
    if (queueArray.length >= 2 &&
        queueArray[0]?.Type === "FieldFunction" && "Delimiters" in queueArray[0]) {
      return reverseQueueFieldFunctionChain(queueArray, ctx, metadata);
    }
  }

  // Detect Mix with $Comment "Conditional(Threshold=X)" → recover density Conditional
  if (hytaleType === "Mix" && asset.$Comment && typeof asset.$Comment === "string") {
    const commentMatch = (asset.$Comment as string).match(/^Conditional\(Threshold=([-\d.]+)\)$/);
    if (commentMatch && "Inputs" in asset && Array.isArray(asset.Inputs)) {
      const threshold = parseFloat(commentMatch[1]);
      const rawInputs = asset.Inputs as Record<string, unknown>[];
      if (rawInputs.length >= 3) {
        // Inputs[0]=FalseInput, Inputs[1]=TrueInput, Inputs[2]=StepFactor(contains Condition)
        const falseInput = rawInputs[0] && typeof rawInputs[0] === "object" && "Type" in rawInputs[0]
          ? transformNodeToInternal(rawInputs[0], { ...ctx, parentField: "FalseInput" }, metadata)
          : rawInputs[0];
        const trueInput = rawInputs[1] && typeof rawInputs[1] === "object" && "Type" in rawInputs[1]
          ? transformNodeToInternal(rawInputs[1], { ...ctx, parentField: "TrueInput" }, metadata)
          : rawInputs[1];

        // Recover Condition from step function: Clamp → Multiplier → Sum → first input
        let condition: unknown = { Type: "Constant", Value: 0 };
        try {
          const clampInputs = rawInputs[2]?.Inputs as Record<string, unknown>[] | undefined;
          const multiplier = clampInputs?.[0];
          const mulInputs = (multiplier as Record<string, unknown>)?.Inputs as Record<string, unknown>[] | undefined;
          const sumNode = mulInputs?.[0];
          const sumInputs = (sumNode as Record<string, unknown>)?.Inputs as Record<string, unknown>[] | undefined;
          const conditionNode = sumInputs?.[0];
          if (conditionNode && typeof conditionNode === "object" && "Type" in conditionNode) {
            condition = transformNodeToInternal(conditionNode as Record<string, unknown>, { ...ctx, parentField: "Condition" }, metadata);
          }
        } catch {
          // Fallback: leave condition as default Constant
        }

        return {
          Type: "Conditional",
          Threshold: threshold,
          Condition: condition,
          TrueInput: trueInput,
          FalseInput: falseInput,
        };
      }
    }
  }

  // Map type name
  let internalType = HYTALE_TO_INTERNAL_TYPES[hytaleType] ?? hytaleType;

  // Cube disambiguation: Hytale "Cube" with an Input field is math x^3 → CubeMath.
  // Hytale "Cube" without Input (has Curve) is the shape SDF → stays as "Cube".
  if (hytaleType === "Cube" && category === "density") {
    const hasInput = "Input" in asset || ("Inputs" in asset && Array.isArray(asset.Inputs) && asset.Inputs.length > 0);
    if (hasInput) {
      internalType = "CubeMath";
    }
  }

  // Build output
  const output: Record<string, unknown> = {
    Type: internalType,
  };

  // Switch → Conditional (density context only)
  if (hytaleType === "Switch" && category === "density") {
    output.Type = "Conditional";
  }

  // Collect all non-meta fields (strip all $-prefixed Hytale editor metadata)
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(asset)) {
    if (key === "Type" || key === "Skip" || key.startsWith("$")) {
      continue;
    }
    fields[key] = value;
  }

  // Handle Inputs[] → named handles
  let processedFields = fields;
  if ("Inputs" in fields && Array.isArray(fields.Inputs)) {
    const inputs = (fields.Inputs as unknown[]).map((input) => {
      if (input && typeof input === "object" && "Type" in (input as Record<string, unknown>)) {
        return transformNodeToInternal(input as Record<string, unknown>, { ...ctx, parentField: "Input" }, metadata);
      }
      return input;
    });
    const { Inputs: _, ...rest } = processedFields;
    const resolvedType = output.Type as string;
    processedFields = { ...rest, ...distributeInputs(inputs, resolvedType, ctx) };
  }

  // Apply per-type reverse field transformations
  // Noise types
  if (["SimplexNoise2D", "SimplexNoise3D", "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
       "CellNoise2D", "CellNoise3D"].includes(hytaleType)) {
    processedFields = reverseNoiseFields(processedFields, hytaleType);
  }

  // Floor / Ceiling: V2 "Limit" → internal "Floor"/"Ceiling"
  if (hytaleType === "Floor" && "Limit" in processedFields) {
    processedFields.Floor = processedFields.Limit;
    delete processedFields.Limit;
  }
  if (hytaleType === "Ceiling" && "Limit" in processedFields) {
    processedFields.Ceiling = processedFields.Limit;
    delete processedFields.Limit;
  }

  // Clamp / SmoothClamp
  if (hytaleType === "Clamp" || hytaleType === "SmoothClamp") {
    processedFields = reverseClampFields(processedFields);
  }

  // Smooth* field renames: Range→Smoothness, SmoothRange→Threshold
  if (["SmoothClamp", "SmoothMin", "SmoothMax", "SmoothFloor", "SmoothCeiling"].includes(hytaleType)) {
    processedFields = reverseSmoothFields(processedFields, hytaleType);
  }

  // Normalizer
  if (hytaleType === "Normalizer") {
    processedFields = reverseNormalizerFields(processedFields);
  }

  // Scale → ScaledPosition
  if (hytaleType === "Scale" && category === "density") {
    processedFields = reverseScaleFields(processedFields);
  }

  // Slider → TranslatedPosition
  if (hytaleType === "Slider" && category === "density") {
    processedFields = reverseSliderFields(processedFields);
  }

  // Rotator → RotatedPosition
  if (hytaleType === "Rotator" && category === "density") {
    processedFields = reverseRotatorFields(processedFields);
  }

  // Plane: PlaneNormal → Normal, IsAnchored stays
  if (hytaleType === "Plane") {
    if ("PlaneNormal" in processedFields) {
      processedFields.Normal = processedFields.PlaneNormal;
      delete processedFields.PlaneNormal;
    }
  }

  // FastGradientWarp: convert Hytale field names to internal names
  if (hytaleType === "FastGradientWarp") {
    processedFields = reverseFastGradientWarpFields(processedFields);
  }

  // AmplitudeConstant → LinearTransform
  if (hytaleType === "AmplitudeConstant") {
    processedFields = reverseAmplitudeConstantFields(processedFields);
  }

  // Pow → Square (if Exponent=2)
  if (hytaleType === "Pow") {
    processedFields = reversePowFields(processedFields);
  }

  // YOverride / XOverride / ZOverride: Value → OverrideY / OverrideX / OverrideZ
  if (hytaleType === "YOverride" && "Value" in processedFields) {
    processedFields.OverrideY = processedFields.Value;
    delete processedFields.Value;
  }
  if (hytaleType === "XOverride" && "Value" in processedFields) {
    processedFields.OverrideX = processedFields.Value;
    delete processedFields.Value;
  }
  if (hytaleType === "ZOverride" && "Value" in processedFields) {
    processedFields.OverrideZ = processedFields.Value;
    delete processedFields.Value;
  }

  // Cache
  if (hytaleType === "Cache" && category === "density") {
    processedFields = reverseCacheFields(processedFields);
  }

  // ColumnLinear scanner
  if (hytaleType === "ColumnLinear" && category === "scanner") {
    processedFields = reverseColumnLinearFields(processedFields);
  }

  // Prefab prop
  if (hytaleType === "Prefab" && category === "prop") {
    processedFields = reversePrefabPropFields(processedFields);
  }

  // Column prop
  if (hytaleType === "Column" && category === "prop") {
    processedFields = reverseColumnPropFields(processedFields);
  }

  // Box prop
  if (hytaleType === "Box" && category === "prop") {
    processedFields = reverseBoxPropFields(processedFields);
  }

  // Position Offset
  if (internalType === "Offset" && category === "position") {
    processedFields = reversePositionOffsetFields(processedFields);
  }

  // Mesh2D position → reverse PointGenerator nesting
  if (hytaleType === "Mesh2D" && category === "position") {
    processedFields = reverseMesh2DPositionFields(processedFields);
  }

  // FieldFunction position → reverse to DensityBased with PositionProvider/Threshold
  if (hytaleType === "FieldFunction" && category === "position") {
    processedFields = reverseFieldFunctionPositionFields(processedFields);
    output.Type = "DensityBased";
  }

  // Directionality: Random → Uniform
  if (category === "directionality") {
    processedFields = reverseDirectionalityFields(processedFields, hytaleType);
    if (hytaleType === "Random") {
      output.Type = "Uniform";
    }
  }

  // Environment: Constant → Default only for the literal "default" sentinel.
  // Real Hytale biomes mostly use Constant with named env assets (Env_*), and
  // those must stay Constant to round-trip without losing references.
  if (hytaleType === "Constant" && category === "environment") {
    const envName = processedFields.Environment;
    if (typeof envName !== "string" || envName.toLowerCase() === "default") {
      output.Type = "Default";
      delete processedFields.Environment;
    } else {
      output.Type = "Constant";
    }
  }

  // PositionsCellNoise: flatten ReturnType/DistanceFunction enum objects to strings
  if (internalType === "PositionsCellNoise") {
    if (processedFields.ReturnType && typeof processedFields.ReturnType === "object") {
      const rt = processedFields.ReturnType as Record<string, unknown>;
      processedFields.ReturnType = (rt.Type as string) ?? "Distance";
      if (rt.Type === "Curve" && rt.Curve) {
        processedFields.ReturnCurve = rt.Curve;
      }
    }
    // Normalize: when ReturnType is the string "Curve" with a top-level Curve field,
    // rename Curve → ReturnCurve so both Hytale format variants use the same field name.
    if (processedFields.ReturnType === "Curve" && processedFields.Curve) {
      processedFields.ReturnCurve = processedFields.Curve;
      delete processedFields.Curve;
    }
    if (processedFields.DistanceFunction && typeof processedFields.DistanceFunction === "object") {
      const df = processedFields.DistanceFunction as Record<string, unknown>;
      processedFields.DistanceFunction = (df.Type as string) ?? "Euclidean";
    }
  }

  // Process remaining fields recursively
  for (const [key, value] of Object.entries(processedFields)) {
    // Curve points
    if (key === "Points" && Array.isArray(value)) {
      output[key] = reverseCurvePoints(value);
      continue;
    }

    // Material unwrapping (non-typed objects with Solid)
    if (key === "Material") {
      const unwrapped = unwrapMaterial(value);
      if (typeof unwrapped === "string") {
        output[key] = unwrapped;
        continue;
      }
    }

    // Detect Point3D objects: no Type field, has X/Y/Z numeric fields.
    // Convert to a typed Constant vector so jsonToGraph creates a proper child node.
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      !("Type" in (value as Record<string, unknown>)) &&
      "X" in (value as Record<string, unknown>)
    ) {
      const pt = value as Record<string, unknown>;
      if (typeof pt.X === "number" || typeof pt.Y === "number" || typeof pt.Z === "number") {
        output[key] = {
          Type: "Constant",
          Value: { x: (pt.X as number) ?? 0, y: (pt.Y as number) ?? 0, z: (pt.Z as number) ?? 0 },
        };
        continue;
      }
    }

    // Nested asset object
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      "Type" in (value as Record<string, unknown>)
    ) {
      output[key] = transformNodeToInternal(value as Record<string, unknown>, { ...ctx, parentField: key }, metadata);
      continue;
    }

    // Array of nested assets
    if (
      Array.isArray(value) && value.length > 0 &&
      typeof value[0] === "object" && value[0] !== null &&
      "Type" in value[0]
    ) {
      output[key] = value.map((item) =>
        transformNodeToInternal(item as Record<string, unknown>, { ...ctx, parentField: key }, metadata),
      );
      continue;
    }

    // Array of material-like objects (no Type, has Solid)
    if (
      Array.isArray(value) && value.length > 0 &&
      typeof value[0] === "object" && value[0] !== null &&
      "Solid" in value[0] && !("Type" in value[0])
    ) {
      output[key] = value.map((item) => unwrapMaterial(stripNodeIds(item)));
      continue;
    }

    // Named-map of nested assets (V2 StringCodecMapCodec: { "key1": {Type:...}, "key2": {Type:...} })
    // Convert to array and recursively transform each entry.
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      !("Type" in (value as Record<string, unknown>))
    ) {
      const entries = Object.values(value as Record<string, unknown>);
      if (
        entries.length > 0 &&
        entries.every((e) => e && typeof e === "object" && "Type" in (e as Record<string, unknown>))
      ) {
        output[key] = entries.map((item) =>
          transformNodeToInternal(item as Record<string, unknown>, { ...ctx, parentField: key }, metadata),
        );
        continue;
      }
    }

    // Pass through — strip $NodeId from non-typed nested structures
    if (Array.isArray(value)) {
      output[key] = stripNodeIds(value);
    } else if (value && typeof value === "object" && !("Type" in (value as Record<string, unknown>))) {
      output[key] = stripNodeIds(value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function inferCategoryFromParent(parentField: string): string {
  const map: Record<string, string> = {
    Density: "density",
    DensityFunction: "density",
    Input: "density",
    InputA: "density",
    InputB: "density",
    Condition: "density",
    TrueInput: "density",
    FalseInput: "density",
    Factor: "density",
    Offset: "density",
    WarpSource: "density",
    WarpVector: "density",
    Amplitude: "density",
    YProvider: "density",
    Inputs: "density",
    MaterialProvider: "material",
    Solid: "material",
    Empty: "material",
    Low: "material",
    High: "material",
    Material: "material",
    Materials: "material",
    Curve: "curve",
    Pattern: "pattern",
    SubPattern: "pattern",
    Floor: "pattern",
    Ceiling: "pattern",
    Surface: "pattern",
    PositionProvider: "position",
    Positions: "position",
    Scanner: "scanner",
    ChildScanner: "scanner",
    Prop: "prop",
    Assignments: "assignment",
    Top: "assignment",
    Bottom: "assignment",
    Layers: "sadLayer",
    Queue: "material",
    Directionality: "directionality",
    EnvironmentProvider: "environment",
    TintProvider: "tint",
    VectorProvider: "vector",
    NewYAxis: "vector",
  };
  return map[parentField] ?? "density";
}

// ---------------------------------------------------------------------------
// Top-level import function
// ---------------------------------------------------------------------------

/**
 * Transform a Hytale-native JSON asset tree into TerraNova internal format.
 * Returns the transformed asset and collected metadata.
 */
export function hytaleToInternal(
  json: Record<string, unknown>,
): { asset: Record<string, unknown>; metadata: ImportMetadata } {
  const metadata: ImportMetadata = {
    comments: {},
    nodeIds: {},
  };

  // Collect $NodeEditorMetadata from root
  if ("$NodeEditorMetadata" in json) {
    metadata.nodeEditorMetadata = json.$NodeEditorMetadata as Record<string, unknown>;
  }

  const result = transformNodeToInternal(json, {}, metadata);

  // The result should be an object (not string) for a root node
  if (typeof result === "string") {
    return { asset: { Type: "Constant", Material: result }, metadata };
  }

  return { asset: result, metadata };
}

// ---------------------------------------------------------------------------
// Fluid extraction from Solidity Empty branch
// ---------------------------------------------------------------------------

/**
 * Inspect the Empty branch of a Solidity MaterialProvider for fluid info.
 * Handles two shapes:
 *  1. Direct SimpleHorizontal (Eldritch Spirelands deployed format)
 *  2. Queue wrapping a SimpleHorizontal (TheUnderworld format — fluid is last Queue entry)
 *
 * Returns { level, material } if a non-boilerplate fluid is found, else null.
 */
function extractFluidInfo(
  emptyBranch: Record<string, unknown>,
): { level: number; material: string } | null {
  // Direct SimpleHorizontal
  if (emptyBranch.Type === "SimpleHorizontal" && "TopY" in emptyBranch) {
    const mat = emptyBranch.Material as Record<string, unknown> | undefined;
    if (mat && mat.Type === "Constant") {
      const inner = mat.Material as Record<string, unknown> | undefined;
      if (inner && typeof inner === "object" && "Fluid" in inner) {
        return { level: emptyBranch.TopY as number, material: inner.Fluid as string };
      }
    }
    return null;
  }

  // Queue wrapping SimpleHorizontal(s) — check each entry
  if (emptyBranch.Type === "Queue" && Array.isArray(emptyBranch.Queue)) {
    for (const entry of emptyBranch.Queue as Record<string, unknown>[]) {
      if (entry.Type === "SimpleHorizontal" && "TopY" in entry) {
        const mat = entry.Material as Record<string, unknown> | undefined;
        if (mat && mat.Type === "Constant") {
          const inner = mat.Material as Record<string, unknown> | undefined;
          if (inner && typeof inner === "object" && "Fluid" in inner) {
            return { level: entry.TopY as number, material: inner.Fluid as string };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Transform a Hytale-native biome wrapper into TerraNova internal format.
 */
export function hytaleToInternalBiome(
  json: Record<string, unknown>,
): { wrapper: Record<string, unknown>; metadata: ImportMetadata } {
  const metadata: ImportMetadata = {
    comments: {},
    nodeIds: {},
  };

  if ("$NodeEditorMetadata" in json) {
    metadata.nodeEditorMetadata = json.$NodeEditorMetadata as Record<string, unknown>;
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(json)) {
    // Strip all $-prefixed Hytale editor metadata ($NodeId, $Comment, $Position, $Title, $WorkspaceID, $Groups, etc.)
    if (key.startsWith("$")) {
      continue;
    }

    if (key === "Terrain" && value && typeof value === "object") {
      const terrain = { ...(value as Record<string, unknown>) };
      delete terrain.$NodeId;
      if (terrain.Density && typeof terrain.Density === "object" && "Type" in (terrain.Density as Record<string, unknown>)) {
        const result = transformNodeToInternal(terrain.Density as Record<string, unknown>, { parentField: "Density" }, metadata);
        terrain.Density = result;
      }
      // Strip Runtime $NodeId
      if (terrain.Runtime && typeof terrain.Runtime === "object") {
        const rt = terrain.Runtime as Record<string, unknown>;
        delete rt.$NodeId;
      }
      output[key] = terrain;
      continue;
    }

    if (key === "MaterialProvider" && value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
      const mp = value as Record<string, unknown>;
      if (mp.Type === "Solidity" && mp.Solid && typeof mp.Solid === "object") {
        // Unwrap Solidity envelope — transform the Solid child as the actual provider.
        output[key] = transformNodeToInternal(mp.Solid as Record<string, unknown>, { parentField: "MaterialProvider" }, metadata);
        // Extract fluid info from Empty branch if present (non-boilerplate)
        if (mp.Empty && typeof mp.Empty === "object") {
          const fluidInfo = extractFluidInfo(mp.Empty as Record<string, unknown>);
          if (fluidInfo) {
            output.FluidLevel = fluidInfo.level;
            output.FluidMaterial = fluidInfo.material;
          } else {
            // Preserve original Empty branch for lossless round-trip
            // (complex Empty branches that don't match known fluid patterns)
            output._originalEmptyBranch = mp.Empty;
          }
        }
      } else {
        output[key] = transformNodeToInternal(mp, { parentField: "MaterialProvider" }, metadata);
      }
      continue;
    }

    if (key === "Props" && Array.isArray(value)) {
      output[key] = value.map((prop) => {
        if (!prop || typeof prop !== "object") return prop;
        const propObj: Record<string, unknown> = {};
        for (const [pk, pv] of Object.entries(prop as Record<string, unknown>)) {
          if (pk === "$NodeId") continue;
          if ((pk === "Positions" || pk === "Assignments" || pk === "Prop") &&
              pv && typeof pv === "object" && "Type" in (pv as Record<string, unknown>)) {
            propObj[pk] = transformNodeToInternal(pv as Record<string, unknown>, { parentField: pk }, metadata);
          } else {
            propObj[pk] = pv;
          }
        }
        return propObj;
      });
      continue;
    }

    if ((key === "EnvironmentProvider" || key === "TintProvider") &&
        value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
      output[key] = transformNodeToInternal(value as Record<string, unknown>, { parentField: key }, metadata);
      continue;
    }

    // Pass through non-typed fields
    output[key] = value;
  }

  return { wrapper: output, metadata };
}
