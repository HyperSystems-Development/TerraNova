/**
 * Export transformer: TerraNova internal JSON → Hytale native JSON format.
 *
 * Handles all structural mismatches: type renames, named→array inputs,
 * field renames, $NodeId generation, curve point format, material wrapping, etc.
 */

import {
  INTERNAL_TO_HYTALE_TYPES,
  DENSITY_NAMED_TO_ARRAY,
  NODE_ID_PREFIX_RULES,
  FIELD_TO_CATEGORY,
  CLAMP_FIELD_MAP,
  NORMALIZER_FIELDS_EXPORT,
  SKIP_FIELD_CATEGORIES,
} from "./translationMaps";
import type { Node } from "@xyflow/react";
import { DEFAULT_WORLD_HEIGHT } from "@/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface V2Asset {
  Type: string;
  [key: string]: unknown;
}

interface TransformContext {
  parentField?: string;
  category?: string;
  reactFlowNodes?: Node[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateNodeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function inferCategory(parentField: string | undefined, type: string): string {
  if (parentField && parentField in FIELD_TO_CATEGORY) {
    return FIELD_TO_CATEGORY[parentField];
  }
  // Infer from type prefix for category:Type nodes (e.g., "Material:Constant")
  if (type.includes(":")) {
    const catPrefix = type.split(":")[0].toLowerCase();
    if (catPrefix === "material") return "material";
    if (catPrefix === "curve") return "curve";
    if (catPrefix === "pattern") return "pattern";
    if (catPrefix === "position") return "position";
    if (catPrefix === "scanner") return "scanner";
    if (catPrefix === "prop") return "prop";
    if (catPrefix === "assignment") return "assignment";
    if (catPrefix === "vector") return "vector";
  }
  return "density"; // default
}

function getNodeIdPrefix(category: string, hytaleType: string): string {
  const ruleKey = category as keyof typeof NODE_ID_PREFIX_RULES;
  const rule = NODE_ID_PREFIX_RULES[ruleKey];
  if (typeof rule === "function") {
    return rule(hytaleType);
  }
  return `${hytaleType}DensityNode`;
}

/** Strip category prefix from internal type names like "Material:Constant" → "Constant" */
function stripCategoryPrefix(type: string): string {
  const idx = type.indexOf(":");
  return idx >= 0 ? type.substring(idx + 1) : type;
}

// ---------------------------------------------------------------------------
// Per-type field transformers
// ---------------------------------------------------------------------------

function transformNoiseFields(
  asset: Record<string, unknown>,
  hytaleType: string,
): Record<string, unknown> {
  const result = { ...asset };

  // Frequency → Scale (inverse) for SimplexNoise2D only
  if ("Frequency" in result && hytaleType === "SimplexNoise2D") {
    const freq = result.Frequency as number;
    result.Scale = freq !== 0 ? 1 / freq : 1;
    delete result.Frequency;
  }

  // Frequency → ScaleXZ + ScaleY for 3D noise
  if ("Frequency" in result && (hytaleType === "SimplexNoise3D" || hytaleType === "CellNoise3D")) {
    const freq = result.Frequency as number;
    const scale = freq !== 0 ? 1 / freq : 1;
    if (hytaleType === "SimplexNoise3D") {
      result.ScaleXZ = scale;
      result.ScaleY = scale;
    } else {
      result.ScaleX = scale;
      result.ScaleY = scale;
      result.ScaleZ = scale;
    }
    delete result.Frequency;
  }

  // CellNoise2D: Frequency → ScaleX + ScaleZ
  if ("Frequency" in result && hytaleType === "CellNoise2D") {
    const freq = result.Frequency as number;
    const scale = freq !== 0 ? 1 / freq : 1;
    result.ScaleX = scale;
    result.ScaleZ = scale;
    delete result.Frequency;
  }

  // Gain → Persistence
  if ("Gain" in result) {
    result.Persistence = result.Gain;
    delete result.Gain;
  }

  // Seed: number → string
  if ("Seed" in result && typeof result.Seed === "number") {
    result.Seed = String(result.Seed);
  }

  // Strip Amplitude — not a valid field on any Hytale noise codec
  delete result.Amplitude;

  return result;
}

function transformClampFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  for (const [internal, hytale] of Object.entries(CLAMP_FIELD_MAP)) {
    if (internal in result) {
      result[hytale] = result[internal];
      delete result[internal];
    }
  }
  return result;
}

function transformSmoothFields(
  asset: Record<string, unknown>,
  hytaleType: string,
): Record<string, unknown> {
  const result = { ...asset };
  // All Smooth* types: Smoothness → Range
  if ("Smoothness" in result) {
    result.Range = result.Smoothness;
    delete result.Smoothness;
  }
  // SmoothFloor / SmoothCeiling: Threshold → SmoothRange
  if ((hytaleType === "SmoothFloor" || hytaleType === "SmoothCeiling") && "Threshold" in result) {
    result.SmoothRange = result.Threshold;
    delete result.Threshold;
  }
  return result;
}

function transformNormalizerFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const { nested } = NORMALIZER_FIELDS_EXPORT;

  for (const [rangeKey, fieldMap] of Object.entries(nested)) {
    const range = result[rangeKey] as Record<string, number> | undefined;
    if (range) {
      for (const [subKey, flatKey] of Object.entries(fieldMap)) {
        if (subKey in range) {
          result[flatKey] = range[subKey];
        }
      }
      delete result[rangeKey];
    }
  }

  return result;
}

function transformScaledPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const scale = result.Scale as { x: number; y: number; z: number } | undefined;
  if (scale && typeof scale === "object" && "x" in scale) {
    result.ScaleX = scale.x;
    result.ScaleY = scale.y;
    result.ScaleZ = scale.z;
    delete result.Scale;
  }
  return result;
}

function transformTranslatedPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const translation = result.Translation as { x: number; y: number; z: number } | undefined;
  if (translation && typeof translation === "object" && "x" in translation) {
    result.SlideX = translation.x;
    result.SlideY = translation.y;
    result.SlideZ = translation.z;
    delete result.Translation;
  }
  return result;
}

function transformRotatedPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("AngleDegrees" in result) {
    result.SpinAngle = result.AngleDegrees;
    // Only set default NewYAxis if not already provided (e.g. from a connected vector node)
    if (!("NewYAxis" in result)) {
      result.NewYAxis = { x: 0, y: 1, z: 0 }; // default up
    }
    delete result.AngleDegrees;
  }
  return result;
}

function transformDomainWarpFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("Amplitude" in result) {
    result.WarpFactor = result.Amplitude;
    delete result.Amplitude;
  }
  // Add default warp params if not present
  if (!("WarpScale" in result)) result.WarpScale = 1.0;
  if (!("WarpOctaves" in result)) result.WarpOctaves = 1;
  if (!("WarpLacunarity" in result)) result.WarpLacunarity = 2.0;
  if (!("WarpPersistence" in result)) result.WarpPersistence = 0.5;
  if (!("Seed" in result)) result.Seed = "A";
  return result;
}

function transformFastGradientWarpFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // Internal uses "WarpSeed", Hytale uses "Seed"
  if ("WarpSeed" in result) {
    result.Seed = result.WarpSeed;
    delete result.WarpSeed;
  }
  // Internal uses "Is2D", Hytale uses "2D"
  if ("Is2D" in result) {
    result["2D"] = result.Is2D;
    delete result.Is2D;
  }
  return result;
}

function transformLinearTransformFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // AmplitudeConstant uses Value as the scale multiplier
  if ("Scale" in result) {
    result.Value = result.Scale;
    delete result.Scale;
  }
  // Non-zero Offset is handled upstream by transformLinearTransformWithOffset()
  // (decomposes into Sum(AmplitudeConstant, Constant)). By this point Offset is always 0.
  delete result.Offset;
  return result;
}

function transformSquareFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // Square → Pow with Exponent=2
  result.Exponent = 2;
  return result;
}

function transformColumnLinearFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const range = result.Range as { Min: number; Max: number } | undefined;
  if (range && typeof range === "object") {
    result.MinY = range.Min;
    result.MaxY = range.Max;
    delete result.Range;
  }
  if ("StepSize" in result) {
    // Hytale doesn't have StepSize — scanner iterates every Y
    delete result.StepSize;
  }
  // Add defaults for Hytale-specific fields
  if (!("ResultCap" in result)) result.ResultCap = 0;
  if (!("TopDownOrder" in result)) result.TopDownOrder = false;
  if (!("RelativeToPosition" in result)) result.RelativeToPosition = false;
  if (!("BaseHeightName" in result)) result.BaseHeightName = "";
  return result;
}

function transformPrefabPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("WeightedPrefabPaths" in result && Array.isArray(result.WeightedPrefabPaths)) {
    // Preserved array from import — re-inject $NodeId into each entry
    result.WeightedPrefabPaths = (result.WeightedPrefabPaths as Record<string, unknown>[]).map(
      (entry) => ({
        $NodeId: generateNodeId("WeightedPath.Prefab.Prop"),
        ...entry,
      }),
    );
    if (!("LegacyPath" in result)) result.LegacyPath = false;
    if (!("LoadEntities" in result)) result.LoadEntities = true;
    if (!("MoldingDirection" in result)) result.MoldingDirection = "NONE";
    if (!("MoldingChildren" in result)) result.MoldingChildren = false;
  } else if ("Path" in result && typeof result.Path === "string") {
    // Legacy single-path format (backward compat)
    const path = result.Path as string;
    result.WeightedPrefabPaths = [
      {
        $NodeId: generateNodeId("WeightedPath.Prefab.Prop"),
        Path: path,
        Weight: 1,
      },
    ];
    result.LegacyPath = false;
    result.LoadEntities = true;
    delete result.Path;
  }
  if (!("MoldingDirection" in result)) result.MoldingDirection = "NONE";
  // Sanitize invalid MoldingDirection values — V2 only supports NONE|UP|DOWN|NORTH|SOUTH|EAST|WEST
  const VALID_MOLDING_DIRECTIONS = new Set(["NONE", "UP", "DOWN", "NORTH", "SOUTH", "EAST", "WEST"]);
  if (!VALID_MOLDING_DIRECTIONS.has(result.MoldingDirection as string)) {
    result.MoldingDirection = "NONE";
  }
  if (!("MoldingChildren" in result)) result.MoldingChildren = false;
  return result;
}

function transformColumnPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if ("Height" in result && "Material" in result) {
    const height = result.Height as number;
    const material = result.Material as string;
    result.ColumnBlocks = [
      {
        $NodeId: generateNodeId("Block.Column.Prop"),
        Y: height,
        Material: {
          $NodeId: generateNodeId("Material"),
          Solid: material,
        },
      },
    ];
    delete result.Height;
    delete result.Material;
  }
  return result;
}

function transformBoxPropFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  // Size → Range
  if ("Size" in result) {
    result.Range = result.Size;
    delete result.Size;
  }
  // Material string → material object
  if ("Material" in result && typeof result.Material === "string") {
    result.Material = {
      $NodeId: generateNodeId("Material"),
      Solid: result.Material,
    };
  }
  // Strip TerraNova-internal field that Hytale doesn't recognize
  delete result.BoxBlockType;
  return result;
}

function transformClusterPropFields(
  asset: Record<string, unknown>,
  ctx: TransformContext,
): Record<string, unknown> {
  const result = { ...asset };
  if ("Props" in result && Array.isArray(result.Props)) {
    const props = result.Props as V2Asset[];
    const weightedProps: Record<string, unknown>[] = [];
    for (let i = 0; i < props.length; i++) {
      const childProp = props[i];
      const transformed = childProp && typeof childProp === "object" && "Type" in childProp
        ? transformNode(childProp, { ...ctx, parentField: "Prop", category: "prop" })
        : childProp;
      weightedProps.push({
        Weight: 1.0,
        ColumnProp: transformed,
      });
    }
    result.WeightedProps = weightedProps;
    delete result.Props;
  }
  // Add required defaults
  if (!("Range" in result)) result.Range = 3;
  if (!("Seed" in result)) result.Seed = "A";
  return result;
}

function transformPositionOffsetFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const offset = result.Offset as { x: number; y: number; z: number } | undefined;
  if (offset && typeof offset === "object" && "x" in offset) {
    result.OffsetX = offset.x;
    result.OffsetY = offset.y;
    result.OffsetZ = offset.z;
    delete result.Offset;
  }
  return result;
}

function transformSpaceAndDepthFields(
  asset: Record<string, unknown>,
  ctx: TransformContext,
): Record<string, unknown> {
  const result = { ...asset };
  const depthThreshold = (result.DepthThreshold as number) ?? 2;

  // Transform child material nodes
  let emptyMaterial: unknown;
  if (result.Empty && typeof result.Empty === "object" && "Type" in (result.Empty as Record<string, unknown>)) {
    emptyMaterial = transformNode(result.Empty as V2Asset, { ...ctx, parentField: "Material", category: "material" });
  } else if (typeof result.Empty === "string") {
    emptyMaterial = wrapMaterialString(result.Empty as string);
  } else {
    emptyMaterial = result.Empty;
  }

  let solidMaterial: unknown;
  if (result.Solid && typeof result.Solid === "object" && "Type" in (result.Solid as Record<string, unknown>)) {
    solidMaterial = transformNode(result.Solid as V2Asset, { ...ctx, parentField: "Material", category: "material" });
  } else if (typeof result.Solid === "string") {
    solidMaterial = wrapMaterialString(result.Solid as string);
  } else {
    solidMaterial = result.Solid;
  }

  result.LayerContext = "DEPTH_INTO_FLOOR";
  result.MaxExpectedDepth = 16;
  result.Layers = [
    {
      $NodeId: generateNodeId("ConstantThickness.Layer"),
      Type: "ConstantThickness",
      Thickness: depthThreshold,
      Material: emptyMaterial,
    },
    {
      $NodeId: generateNodeId("ConstantThickness.Layer"),
      Type: "ConstantThickness",
      Thickness: 16 - depthThreshold,
      Material: solidMaterial,
    },
  ];

  delete result.DepthThreshold;
  delete result.Solid;
  delete result.Empty;
  return result;
}

function transformMesh2DPositionFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  const spacing = (result.Resolution as number) ?? 8;
  const jitter = (result.Jitter as number) ?? 0.4;
  result.PointGenerator = {
    $NodeId: generateNodeId("MeshPointGenerator"),
    Type: "Mesh",
    Jitter: jitter,
    ScaleX: spacing,
    ScaleY: spacing,
    ScaleZ: spacing,
    Seed: "A",
  };
  if (!("PointsY" in result)) result.PointsY = 0;
  delete result.Resolution;
  delete result.Jitter;
  return result;
}

function transformCacheFields(asset: Record<string, unknown>): Record<string, unknown> {
  const result = { ...asset };
  if (!("Capacity" in result)) result.Capacity = 1;
  return result;
}

function transformFractalNoiseToSimplex(
  asset: Record<string, unknown>,
  _internalType: string,
): Record<string, unknown> {
  const result = { ...asset };
  // FractalNoise2D/3D → SimplexNoise2D/3D with Octaves>1
  // Fields are already compatible, just need type change (handled by caller)
  return result;
}

function transformDensityBasedFields(
  asset: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...asset };
  // Rename DensityFunction → FieldFunction
  if ("DensityFunction" in result) {
    result.FieldFunction = result.DensityFunction;
    delete result.DensityFunction;
  }
  // PositionProvider → Positions (Hytale field name)
  if ("PositionProvider" in result) {
    result.Positions = result.PositionProvider;
    delete result.PositionProvider;
  } else {
    // Add default Mesh2D Positions if not present
    result.Positions = { Type: "Mesh2D", Resolution: 8, Jitter: 0.4 };
  }
  // Threshold → Delimiters array (Hytale uses Delimiters, not flat Threshold)
  if ("Threshold" in result) {
    const threshold = result.Threshold as number;
    result.Delimiters = [
      {
        $NodeId: generateNodeId("DelimiterFieldFunctionPP"),
        Min: threshold,
        Max: 1000.0,
      },
    ];
    delete result.Threshold;
  }
  return result;
}

function transformDirectionalityFields(
  asset: Record<string, unknown>,
  internalType: string,
): Record<string, unknown> {
  if (internalType === "Uniform") {
    const result = { ...asset };
    // Uniform → Random with required Seed and Pattern
    if (!("Seed" in result)) result.Seed = "A";
    if (!("Pattern" in result)) {
      result.Pattern = { Type: "Floor" };
    }
    return result;
  }
  return asset;
}

// ---------------------------------------------------------------------------
// Blend curve flattening
// ---------------------------------------------------------------------------

/**
 * Flatten a Blend curve (two Manual sub-curves) into a single Manual curve
 * by averaging the Y values at a 50/50 blend. Hytale only supports "Manual"
 * and "Floor" curve types — "Blend" is not a valid curve codec.
 */
function flattenBlendCurve(curve: Record<string, unknown>): Record<string, unknown> {
  const inputA = curve.InputA as Record<string, unknown> | undefined;
  const inputB = curve.InputB as Record<string, unknown> | undefined;

  if (!inputA || !inputB) {
    // Fallback: can't flatten without both inputs, return a passthrough
    return { Type: "Manual", Points: [[0, 0], [1, 1]] };
  }

  // Normalize points to [x, y] arrays — handles both [x,y] tuples and {x,y}/{In,Out} objects
  function normalizePoints(raw: unknown): number[][] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((pt: unknown) => {
        if (Array.isArray(pt) && pt.length === 2) return pt as number[];
        if (pt && typeof pt === "object") {
          const o = pt as Record<string, unknown>;
          const x = (o.x ?? o.In) as number | undefined;
          const y = (o.y ?? o.Out) as number | undefined;
          if (x != null && y != null) return [x, y];
        }
        return null;
      })
      .filter((pt): pt is number[] => pt !== null);
  }

  const pointsA = normalizePoints(inputA.Points);
  const pointsB = normalizePoints(inputB.Points);

  // Build lookup maps: x → y for each curve
  const mapA = new Map<number, number>();
  for (const pt of pointsA) {
    mapA.set(pt[0], pt[1]);
  }
  const mapB = new Map<number, number>();
  for (const pt of pointsB) {
    mapB.set(pt[0], pt[1]);
  }

  // Collect all unique X values, sorted
  const allX = [...new Set([...mapA.keys(), ...mapB.keys()])].sort((a, b) => a - b);

  // Linear interpolation helper
  function lerpFromPoints(pts: number[][], x: number): number {
    if (pts.length === 0) return 0;
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (x >= pts[i][0] && x <= pts[i + 1][0]) {
        const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]);
      }
    }
    return pts[pts.length - 1][1];
  }

  // Average both curves at each X
  const merged: number[][] = allX.map((x) => {
    const yA = mapA.has(x) ? mapA.get(x)! : lerpFromPoints(pointsA, x);
    const yB = mapB.has(x) ? mapB.get(x)! : lerpFromPoints(pointsB, x);
    const avg = (yA + yB) / 2;
    // Round to avoid floating-point noise
    return [x, Math.round(avg * 1000) / 1000];
  });

  return { Type: "Manual", Points: merged };
}

// ---------------------------------------------------------------------------
// Curve point transform
// ---------------------------------------------------------------------------

function transformCurvePoints(points: unknown[]): unknown[] {
  return points.map((pt) => {
    if (Array.isArray(pt) && pt.length === 2) {
      return {
        $NodeId: generateNodeId("CurvePoint"),
        In: pt[0],
        Out: pt[1],
      };
    }
    // Already object format { x, y }
    if (pt && typeof pt === "object" && ("x" in (pt as Record<string, unknown>) || "In" in (pt as Record<string, unknown>))) {
      const obj = pt as Record<string, unknown>;
      return {
        $NodeId: generateNodeId("CurvePoint"),
        In: obj.x ?? obj.In ?? 0,
        Out: obj.y ?? obj.Out ?? 0,
      };
    }
    return pt;
  });
}

// ---------------------------------------------------------------------------
// Material string → object wrapping
// ---------------------------------------------------------------------------

function wrapMaterialString(value: string): Record<string, unknown> {
  return {
    $NodeId: generateNodeId("Material"),
    Solid: value,
  };
}

// ---------------------------------------------------------------------------
// Named inputs → Inputs[] array conversion
// ---------------------------------------------------------------------------

function collectNamedInputs(
  asset: Record<string, unknown>,
  internalType: string,
  ctx: TransformContext,
): { inputs: unknown[]; remainingFields: Record<string, unknown> } {
  const handleNames = DENSITY_NAMED_TO_ARRAY[internalType];
  if (!handleNames) {
    return { inputs: [], remainingFields: asset };
  }

  const inputs: unknown[] = [];
  const remaining: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(asset)) {
    const handleIndex = handleNames.indexOf(key);
    if (handleIndex >= 0) {
      // This is a named density input — transform it and collect for Inputs[]
      if (value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
        inputs[handleIndex] = transformNode(value as V2Asset, { ...ctx, parentField: key, category: "density" });
      } else {
        inputs[handleIndex] = value;
      }
    } else {
      remaining[key] = value;
    }
  }

  // Filter out empty slots
  const compactInputs = inputs.filter((v) => v !== undefined);

  return { inputs: compactInputs, remainingFields: remaining };
}

// ---------------------------------------------------------------------------
// Flatten nested binary Sum trees back to flat Inputs[]
// ---------------------------------------------------------------------------

/**
 * On import, N-ary Sums are nested into balanced binary trees. On re-export,
 * flatten them back: if a Sum's InputA or InputB is itself a Sum (with no
 * extra fields), absorb its children into the flat list.
 */
function flattenSumInputs(
  fields: Record<string, unknown>,
  ctx: TransformContext,
): unknown[] {
  const result: unknown[] = [];

  function collect(node: unknown): void {
    if (
      node && typeof node === "object" &&
      "Type" in (node as Record<string, unknown>) &&
      (node as Record<string, unknown>).Type === "Sum"
    ) {
      const obj = node as Record<string, unknown>;
      // Check if this is a pure binary Sum (only Type + InputA + InputB)
      const keys = Object.keys(obj).filter((k) => k !== "Type");
      if (keys.length === 2 && "InputA" in obj && "InputB" in obj) {
        collect(obj.InputA);
        collect(obj.InputB);
        return;
      }
    }
    // Not a collapsible Sum — transform and push as leaf
    if (node && typeof node === "object" && "Type" in (node as Record<string, unknown>)) {
      result.push(transformNode(node as V2Asset, { ...ctx, parentField: "Input", category: "density" }));
    } else {
      result.push(node);
    }
  }

  if ("InputA" in fields) collect(fields.InputA);
  if ("InputB" in fields) collect(fields.InputB);

  return result;
}

// ---------------------------------------------------------------------------
// FieldFunction MaterialProvider with Materials[] → Delimiters format
// ---------------------------------------------------------------------------

/**
 * Convert the internal FieldFunction MaterialProvider (with Materials[] and
 * DelimiterRanges[]) back to the Hytale Delimiters format.
 *
 * Internal:                              Hytale:
 * FieldFunction {                   →    FieldFunction {
 *   FieldFunction: <density>,              FieldFunction: <density>,
 *   Materials: [matA, matB],               Delimiters: [
 *   DelimiterRanges: [{From, To}],           {From:0, To:25, Material:matA},
 *   ExportAs: ...                            {From:25, To:40, Material:matB},
 * }                                        ],
 *                                          ExportAs: ...
 *                                        }
 */
function transformFieldFunctionMaterialWithDelimiters(
  asset: V2Asset,
  ctx: TransformContext,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    $NodeId: generateNodeId("FieldFunctionMaterialProvider"),
    Type: "FieldFunction",
    Skip: false,
  };

  // Transform the density subtree
  const densityTree = asset.FieldFunction as V2Asset | undefined;
  if (densityTree && typeof densityTree === "object" && "Type" in densityTree) {
    output.FieldFunction = transformNode(densityTree, {
      ...ctx,
      parentField: "FieldFunction",
      category: "density",
    });
  }

  // Build Delimiters from Materials[] + DelimiterRanges[]
  const materials = asset.Materials as V2Asset[];
  const ranges = (asset.DelimiterRanges as Record<string, unknown>[]) ?? [];
  const delimiters: Record<string, unknown>[] = [];

  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const range = ranges[i] ?? {};

    let transformedMaterial: unknown;
    if (typeof mat === "string") {
      transformedMaterial = wrapMaterialString(mat);
    } else if (mat && typeof mat === "object" && "Type" in mat) {
      transformedMaterial = transformNode(mat, {
        ...ctx,
        parentField: "Material",
        category: "material",
      });
    } else {
      transformedMaterial = mat;
    }

    delimiters.push({
      $NodeId: generateNodeId("DelimiterFieldFunctionMP"),
      From: range.From ?? 0,
      To: range.To ?? 1000,
      Material: transformedMaterial,
    });
  }

  output.Delimiters = delimiters;

  // Pass through ExportAs if present
  if ("ExportAs" in asset) {
    output.ExportAs = asset.ExportAs;
  }

  return output;
}

// ---------------------------------------------------------------------------
// Material Conditional chain → Queue[FieldFunction(...)] transform
// ---------------------------------------------------------------------------

/**
 * Flatten a nested chain of Conditional material providers into a Hytale Queue
 * containing FieldFunction entries with Delimiters, plus a fallback entry.
 *
 * Internal:                              Hytale:
 * Conditional(T=0.7, cond=noise1,  →     Queue: [
 *   true=MatA,                             FieldFunction(ff=noise1, delim=[{0.7,1000,MatA}]),
 *   false=Conditional(T=0.45,              FieldFunction(ff=noise2, delim=[{0.45,1000,MatB}]),
 *     cond=noise2,                         MatD  // fallback
 *     true=MatB,                          ]
 *     false=MatD)))
 */
function transformMaterialConditionalChain(
  asset: V2Asset,
  ctx: TransformContext,
): Record<string, unknown> {
  // Walk the chain: extract (condition, threshold, trueInput) entries
  const entries: { condition: V2Asset; threshold: number; trueInput: V2Asset }[] = [];
  let current: V2Asset | Record<string, unknown> = asset;

  while (
    current &&
    typeof current === "object" &&
    "Type" in current &&
    stripCategoryPrefix(current.Type as string) === "Conditional"
  ) {
    const condition = current.Condition as V2Asset | undefined;
    const threshold = current.Threshold as number | undefined;
    const trueInput = current.TrueInput as V2Asset | undefined;
    const falseInput = current.FalseInput as V2Asset | Record<string, unknown> | undefined;

    if (condition && trueInput && threshold !== undefined) {
      entries.push({ condition, threshold, trueInput });
    }

    current = falseInput as V2Asset;
  }

  // `current` is now the final fallback (non-Conditional)
  const fallback = current as V2Asset | undefined;

  // Build Queue entries
  const queueItems: Record<string, unknown>[] = [];

  for (const entry of entries) {
    // Transform condition density function in density context
    const transformedCondition = transformNode(entry.condition, {
      ...ctx,
      parentField: "FieldFunction",
      category: "density",
    });

    // Transform trueInput material in material context
    let transformedMaterial: unknown;
    if (typeof entry.trueInput === "string") {
      transformedMaterial = wrapMaterialString(entry.trueInput as unknown as string);
    } else if (entry.trueInput && typeof entry.trueInput === "object" && "Type" in entry.trueInput) {
      transformedMaterial = transformNode(entry.trueInput, {
        ...ctx,
        parentField: "Material",
        category: "material",
      });
    } else if (typeof entry.trueInput === "string") {
      transformedMaterial = wrapMaterialString(entry.trueInput);
    } else {
      transformedMaterial = entry.trueInput;
    }

    const ffNode: Record<string, unknown> = {
      $NodeId: generateNodeId("FieldFunctionMaterialProvider"),
      Type: "FieldFunction",
      Skip: false,
      FieldFunction: transformedCondition,
      Delimiters: [
        {
          $NodeId: generateNodeId("DelimiterFieldFunctionMP"),
          From: entry.threshold,
          To: 1000,
          Material: transformedMaterial,
        },
      ],
    };

    queueItems.push(ffNode);
  }

  // Add fallback as last Queue entry
  if (fallback) {
    if (typeof fallback === "string") {
      // Plain material string — wrap as Constant material provider
      queueItems.push({
        $NodeId: generateNodeId("ConstantMaterialProvider"),
        Type: "Constant",
        Skip: false,
        Material: wrapMaterialString(fallback as unknown as string),
      });
    } else if (fallback && typeof fallback === "object" && "Type" in fallback) {
      queueItems.push(
        transformNode(fallback, { ...ctx, parentField: "Queue", category: "material" }),
      );
    }
  }

  // Wrap in Queue
  return {
    $NodeId: generateNodeId("QueueMaterialProvider"),
    Type: "Queue",
    Skip: false,
    Queue: queueItems,
  };
}

// ---------------------------------------------------------------------------
// LinearTransform with Offset → Sum(AmplitudeConstant, Constant) transform
// ---------------------------------------------------------------------------

/**
 * When LinearTransform has a non-zero Offset, decompose it into:
 *   Sum(AmplitudeConstant(Scale, Input), Constant(Offset))
 *
 * Internal:  LinearTransform(Scale=S, Offset=O, Input=X) → S * X + O
 * Hytale:    Sum(AmplitudeConstant(Value=S, Inputs=[X]), Constant(Value=O))
 */
function transformLinearTransformWithOffset(
  asset: V2Asset,
  ctx: TransformContext,
): Record<string, unknown> {
  const scale = (asset.Scale as number) ?? 1;
  const offset = asset.Offset as number;
  const input = asset.Input as V2Asset | undefined;

  // Build AmplitudeConstant node: Scale * Input
  const ampNode: Record<string, unknown> = {
    $NodeId: generateNodeId("AmplitudeConstantDensityNode"),
    Type: "AmplitudeConstant",
    Skip: false,
    Value: scale,
  };

  // Transform the Input subtree
  if (input && typeof input === "object" && "Type" in input) {
    ampNode.Inputs = [transformNode(input, { ...ctx, parentField: "Input", category: "density" })];
  }

  // Build Constant node for the Offset
  const constNode: Record<string, unknown> = {
    $NodeId: generateNodeId("ConstantDensityNode"),
    Type: "Constant",
    Skip: false,
    Value: offset,
  };

  // Wrap in Sum: AmplitudeConstant(Scale, Input) + Constant(Offset)
  return {
    $NodeId: generateNodeId("SumDensityNode"),
    Type: "Sum",
    Skip: false,
    Inputs: [ampNode, constNode],
  };
}

// ---------------------------------------------------------------------------
// GradientDensity → Normalizer(YValue) transform
// ---------------------------------------------------------------------------

/**
 * Convert GradientDensity (height ramp from Y=FromY to Y=ToY) into a
 * Normalizer wrapping a YValue density node.
 *
 * Internal:                              Hytale:
 * GradientDensity {                 →    Normalizer {
 *   FromY: 100,                            FromMin: <ToY>,  // bottom (value=0)
 *   ToY: 40                                FromMax: <FromY>, // top (value=1)
 * }                                        ToMin: 0.0, ToMax: 1.0,
 *                                          Inputs: [{ Type: "YValue" }]
 *                                        }
 */
function transformGradientDensity(
  asset: V2Asset,
): Record<string, unknown> {
  const fromY = (asset.FromY as number) ?? 0;
  const toY = (asset.ToY as number) ?? DEFAULT_WORLD_HEIGHT;

  return {
    $NodeId: generateNodeId("Normalizer.Density"),
    Type: "Normalizer",
    Skip: false,
    FromMin: toY,
    FromMax: fromY,
    ToMin: 0.0,
    ToMax: 1.0,
    Inputs: [
      {
        $NodeId: generateNodeId("YValue.Density"),
        Type: "YValue",
        Skip: false,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// HeightGradient → Queue[FieldFunction(YValue)] transform
// ---------------------------------------------------------------------------

/**
 * Convert HeightGradient material provider to a Hytale-valid Queue containing
 * a FieldFunction with YValue density + Delimiters, plus a Low material fallback.
 *
 * Internal:                              Hytale:
 * HeightGradient {                  →    Queue: [
 *   Range: {Min: 20, Max: 60},            FieldFunction {
 *   Low: Constant("Rock_Volcanic"),          FieldFunction: YValue {},
 *   High: Constant("Rock_Shale")             Delimiters: [{From: midpoint, To: 10000, Material: High}]
 * }                                        },
 *                                         Low  // fallback when Y < midpoint
 *                                       ]
 */
function transformHeightGradient(
  asset: V2Asset,
  ctx: TransformContext,
): Record<string, unknown> {
  const range = asset.Range as { Min: number; Max: number } | undefined;
  const min = range?.Min ?? 0;
  const max = range?.Max ?? 256;
  const midpoint = (min + max) / 2;

  // Transform High material (used in delimiter above midpoint)
  let transformedHigh: unknown;
  const highInput = asset.High as V2Asset | string | undefined;
  if (typeof highInput === "string") {
    transformedHigh = wrapMaterialString(highInput);
  } else if (highInput && typeof highInput === "object" && "Type" in highInput) {
    transformedHigh = transformNode(highInput, {
      ...ctx,
      parentField: "Material",
      category: "material",
    });
  } else {
    transformedHigh = {
      $NodeId: generateNodeId("ConstantMaterialProvider"),
      Type: "Constant",
      Skip: false,
      Material: wrapMaterialString("Air"),
    };
  }

  // Transform Low material (fallback)
  let transformedLow: Record<string, unknown>;
  const lowInput = asset.Low as V2Asset | string | undefined;
  if (typeof lowInput === "string") {
    transformedLow = {
      $NodeId: generateNodeId("ConstantMaterialProvider"),
      Type: "Constant",
      Skip: false,
      Material: wrapMaterialString(lowInput),
    };
  } else if (lowInput && typeof lowInput === "object" && "Type" in lowInput) {
    transformedLow = transformNode(lowInput, {
      ...ctx,
      parentField: "Material",
      category: "material",
    });
  } else {
    transformedLow = {
      $NodeId: generateNodeId("ConstantMaterialProvider"),
      Type: "Constant",
      Skip: false,
      Material: wrapMaterialString("Air"),
    };
  }

  // Build FieldFunction entry with YValue density and delimiter at midpoint
  const ffNode: Record<string, unknown> = {
    $NodeId: generateNodeId("FieldFunctionMaterialProvider"),
    Type: "FieldFunction",
    Skip: false,
    FieldFunction: {
      $NodeId: generateNodeId("YValue.Density"),
      Type: "YValue",
      Skip: false,
    },
    Delimiters: [
      {
        $NodeId: generateNodeId("DelimiterFieldFunctionMP"),
        From: midpoint,
        To: 10000,
        Material: transformedHigh,
      },
    ],
  };

  // Wrap in Queue: [FieldFunction(YValue), Low fallback]
  return {
    $NodeId: generateNodeId("QueueMaterialProvider"),
    Type: "Queue",
    Skip: false,
    Queue: [ffNode, transformedLow],
  };
}

// ---------------------------------------------------------------------------
// Density Conditional → Mix(FalseInput, TrueInput, StepFactor) transform
// ---------------------------------------------------------------------------

/**
 * Convert a density Conditional node into a Mix compound that Hytale understands.
 *
 * Internal:  Conditional { Threshold, Condition, TrueInput, FalseInput }
 * Hytale:    Mix(Inputs[0]=FalseInput, Inputs[1]=TrueInput,
 *                Inputs[2]=Clamp(0,1, Multiplier(Sum(Condition, Constant(-Threshold)), Constant(10000))))
 *
 * The steep step factor (×10000) gives binary switching behavior:
 *   Condition < Threshold → Factor≈0 → FalseInput
 *   Condition > Threshold → Factor≈1 → TrueInput
 */
function transformDensityConditional(
  asset: V2Asset,
  ctx: TransformContext,
): Record<string, unknown> {
  const threshold = (asset.Threshold as number) ?? 0;
  const condition = asset.Condition as V2Asset | undefined;
  const trueInput = asset.TrueInput as V2Asset | undefined;
  const falseInput = asset.FalseInput as V2Asset | undefined;

  // Recursively transform child density nodes
  const transformedCondition = condition && typeof condition === "object" && "Type" in condition
    ? transformNode(condition, { ...ctx, parentField: "Condition", category: "density" })
    : { $NodeId: generateNodeId("ConstantDensityNode"), Type: "Constant", Skip: false, Value: 0 };

  const transformedTrue = trueInput && typeof trueInput === "object" && "Type" in trueInput
    ? transformNode(trueInput, { ...ctx, parentField: "TrueInput", category: "density" })
    : { $NodeId: generateNodeId("ConstantDensityNode"), Type: "Constant", Skip: false, Value: 0 };

  const transformedFalse = falseInput && typeof falseInput === "object" && "Type" in falseInput
    ? transformNode(falseInput, { ...ctx, parentField: "FalseInput", category: "density" })
    : { $NodeId: generateNodeId("ConstantDensityNode"), Type: "Constant", Skip: false, Value: 0 };

  // Build step function: Clamp(0, 1, Multiplier(Sum(Condition, Constant(-Threshold)), Constant(10000)))
  const negThresholdNode: Record<string, unknown> = {
    $NodeId: generateNodeId("ConstantDensityNode"),
    Type: "Constant",
    Skip: false,
    Value: -threshold,
  };

  const sumNode: Record<string, unknown> = {
    $NodeId: generateNodeId("SumDensityNode"),
    Type: "Sum",
    Skip: false,
    Inputs: [transformedCondition, negThresholdNode],
  };

  const steepnessNode: Record<string, unknown> = {
    $NodeId: generateNodeId("ConstantDensityNode"),
    Type: "Constant",
    Skip: false,
    Value: 10000,
  };

  const multiplierNode: Record<string, unknown> = {
    $NodeId: generateNodeId("MultiplierDensityNode"),
    Type: "Multiplier",
    Skip: false,
    Inputs: [sumNode, steepnessNode],
  };

  const clampNode: Record<string, unknown> = {
    $NodeId: generateNodeId("ClampDensityNode"),
    Type: "Clamp",
    Skip: false,
    WallA: 1,
    WallB: 0,
    Inputs: [multiplierNode],
  };

  // Build Mix node: Inputs[0]=FalseInput, Inputs[1]=TrueInput, Inputs[2]=Factor(step)
  return {
    $NodeId: generateNodeId("Mix.Density"),
    Type: "Mix",
    Skip: false,
    $Comment: `Conditional(Threshold=${threshold})`,
    Inputs: [transformedFalse, transformedTrue, clampNode],
  };
}

// ---------------------------------------------------------------------------
// Main recursive transformer
// ---------------------------------------------------------------------------

export function transformNode(asset: V2Asset, ctx: TransformContext = {}): Record<string, unknown> {
  const internalType = stripCategoryPrefix(asset.Type);
  const category = inferCategory(ctx.parentField, asset.Type);

  // Vector:Constant → Point3D format (Hytale uses { $NodeId: "Point3D-...", X, Y, Z } without Type)
  // Detect by category prefix OR by value shape (for nodes in fields like Range/Offset
  // where field-based category inference defaults to "density").
  const isVectorConstant = internalType === "Constant" && (
    category === "vector" ||
    (asset.Value != null && typeof asset.Value === "object" &&
     !Array.isArray(asset.Value) && "x" in (asset.Value as Record<string, unknown>))
  );
  if (isVectorConstant) {
    const val = asset.Value as { x: number; y: number; z: number } | undefined;
    return {
      $NodeId: generateNodeId("Point3D"),
      X: val?.x ?? 0,
      Y: val?.y ?? 0,
      Z: val?.z ?? 0,
    };
  }

  // Material Conditional → Queue[FieldFunction(...)] — Hytale has no Conditional in material registry
  if (internalType === "Conditional" && category === "material") {
    return transformMaterialConditionalChain(asset, ctx);
  }

  // Density Conditional → Mix(FalseInput, TrueInput, StepFactor) — Switch is not a valid Hytale density type
  if (internalType === "Conditional" && category === "density") {
    return transformDensityConditional(asset, ctx);
  }

  // FieldFunction MaterialProvider with Materials[] → Delimiters format
  if (internalType === "FieldFunction" && category === "material" &&
      "Materials" in asset && Array.isArray(asset.Materials)) {
    return transformFieldFunctionMaterialWithDelimiters(asset, ctx);
  }

  // HeightGradient → Queue[FieldFunction(YValue, Delimiters), LowFallback] — HeightGradient is not a valid Hytale type
  if (internalType === "HeightGradient" && category === "material") {
    return transformHeightGradient(asset, ctx);
  }

  // GradientDensity → Normalizer(YValue) — Hytale's Gradient is a directional derivative, not a height ramp
  if (internalType === "GradientDensity") {
    return transformGradientDensity(asset);
  }

  // Cluster prop → WeightedProps format — Hytale uses WeightedProps map, not Props array
  if (internalType === "Cluster" && category === "prop") {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type") continue;
      fields[key] = value;
    }
    const clusterFields = transformClusterPropFields(fields, ctx);
    return {
      $NodeId: generateNodeId("Cluster.Prop"),
      Type: "Cluster",
      Skip: false,
      ...clusterFields,
    };
  }

  // SpaceAndDepth → Layers[] format — Hytale uses LayerContext + MaxExpectedDepth + Layers array
  if (internalType === "SpaceAndDepth" && category === "material") {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type") continue;
      fields[key] = value;
    }
    const layerFields = transformSpaceAndDepthFields(fields, ctx);
    return {
      $NodeId: generateNodeId("SpaceAndDepthMaterialProvider"),
      Type: "SpaceAndDepth",
      Skip: false,
      ...layerFields,
    };
  }

  // LinearTransform with non-zero Offset → Sum(AmplitudeConstant(Scale, Input), Constant(Offset))
  // Hytale's AmplitudeConstant has no Offset field, so we decompose into Sum
  if (internalType === "LinearTransform" && asset.Offset !== undefined && asset.Offset !== 0) {
    return transformLinearTransformWithOffset(asset, ctx);
  }

  // Prop Conditional → emit TrueInput only (lossy) — Hytale has no Conditional in prop registry
  if (internalType === "Conditional" && category === "prop") {
    const trueInput = asset.TrueInput as V2Asset;
    if (trueInput) {
      return transformNode(trueInput, { ...ctx, parentField: "Prop" });
    }
  }

  // Flatten Blend curves before processing — Hytale only supports Manual and Floor
  if (category === "curve" && internalType === "Blend") {
    const flattened = flattenBlendCurve(asset as unknown as Record<string, unknown>);
    return transformNode(flattened as V2Asset, ctx);
  }

  // Map type name
  let hytaleType: string;
  if (internalType === "FractalNoise2D") {
    hytaleType = "SimplexNoise2D";
  } else if (internalType === "FractalNoise3D") {
    hytaleType = "SimplexNoise3D";
  } else {
    hytaleType = INTERNAL_TO_HYTALE_TYPES[internalType] ?? internalType;
  }

  // Framework-specific types pass through without $NodeId/Skip injection
  const FRAMEWORK_TYPES = new Set(["Positions", "DecimalConstants", "DensityConstants"]);
  if (FRAMEWORK_TYPES.has(hytaleType)) {
    const output: Record<string, unknown> = { Type: hytaleType };
    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type") continue;
      output[key] = value;
    }
    return output;
  }

  // Generate $NodeId
  const nodeIdPrefix = getNodeIdPrefix(category, hytaleType);
  const nodeId = generateNodeId(nodeIdPrefix);

  // Start building output
  const output: Record<string, unknown> = {
    $NodeId: nodeId,
    Type: hytaleType,
  };

  // Collect fields (excluding Type)
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(asset)) {
    if (key === "Type") continue;
    fields[key] = value;
  }

  // Apply per-type field transformations
  let transformedFields = fields;

  // Noise types
  if (["SimplexNoise2D", "SimplexNoise3D", "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
       "CellNoise2D", "CellNoise3D"].includes(hytaleType) ||
      ["SimplexNoise2D", "SimplexNoise3D", "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
       "VoronoiNoise2D", "VoronoiNoise3D"].includes(internalType)) {
    transformedFields = transformNoiseFields(transformedFields, hytaleType);
  }

  // FractalNoise → SimplexNoise with Octaves
  if (internalType === "FractalNoise2D" || internalType === "FractalNoise3D") {
    transformedFields = transformFractalNoiseToSimplex(transformedFields, internalType);
    transformedFields = transformNoiseFields(transformedFields, hytaleType);
  }

  // Clamp / SmoothClamp
  if (hytaleType === "Clamp" || hytaleType === "SmoothClamp") {
    transformedFields = transformClampFields(transformedFields);
  }

  // Smooth* field renames: Smoothness→Range, Threshold→SmoothRange
  if (["SmoothClamp", "SmoothMin", "SmoothMax", "SmoothFloor", "SmoothCeiling"].includes(hytaleType)) {
    transformedFields = transformSmoothFields(transformedFields, hytaleType);
  }

  // Normalizer
  if (hytaleType === "Normalizer") {
    transformedFields = transformNormalizerFields(transformedFields);
  }

  // Scale (ScaledPosition)
  if (internalType === "ScaledPosition") {
    transformedFields = transformScaledPositionFields(transformedFields);
  }

  // Slider (TranslatedPosition)
  if (internalType === "TranslatedPosition") {
    transformedFields = transformTranslatedPositionFields(transformedFields);
  }

  // Rotator (RotatedPosition)
  if (internalType === "RotatedPosition") {
    transformedFields = transformRotatedPositionFields(transformedFields);
  }

  // FastGradientWarp (DomainWarp)
  if (internalType === "DomainWarp2D" || internalType === "DomainWarp3D") {
    transformedFields = transformDomainWarpFields(transformedFields);
  }

  // FastGradientWarp: convert internal field names to Hytale names
  if (internalType === "FastGradientWarp") {
    transformedFields = transformFastGradientWarpFields(transformedFields);
  }

  // AmplitudeConstant (LinearTransform)
  if (internalType === "LinearTransform") {
    transformedFields = transformLinearTransformFields(transformedFields);
  }

  // Pow (Square)
  if (internalType === "Square") {
    transformedFields = transformSquareFields(transformedFields);
  }

  // YOverride / XOverride / ZOverride: OverrideY/X/Z → Value (reverse of import rename)
  if (hytaleType === "YOverride" && "OverrideY" in transformedFields) {
    transformedFields.Value = transformedFields.OverrideY;
    delete transformedFields.OverrideY;
  }
  if (hytaleType === "XOverride" && "OverrideX" in transformedFields) {
    transformedFields.Value = transformedFields.OverrideX;
    delete transformedFields.OverrideX;
  }
  if (hytaleType === "ZOverride" && "OverrideZ" in transformedFields) {
    transformedFields.Value = transformedFields.OverrideZ;
    delete transformedFields.OverrideZ;
  }

  // Cache
  if (hytaleType === "Cache") {
    transformedFields = transformCacheFields(transformedFields);
  }

  // ColumnLinear scanner
  if (internalType === "ColumnLinear" && category === "scanner") {
    transformedFields = transformColumnLinearFields(transformedFields);
  }

  // Prefab prop
  if (internalType === "Prefab" && category === "prop") {
    transformedFields = transformPrefabPropFields(transformedFields);
  }

  // Column prop
  if (internalType === "Column" && category === "prop") {
    transformedFields = transformColumnPropFields(transformedFields);
  }

  // Box prop
  if (internalType === "Box" && category === "prop") {
    transformedFields = transformBoxPropFields(transformedFields);
  }

  // Position Offset
  if (internalType === "Offset" && category === "position") {
    transformedFields = transformPositionOffsetFields(transformedFields);
  }

  // Mesh2D position → PointGenerator nesting
  if (internalType === "Mesh2D" && category === "position") {
    transformedFields = transformMesh2DPositionFields(transformedFields);
  }

  // Directionality: Uniform → Random
  if (category === "directionality") {
    transformedFields = transformDirectionalityFields(transformedFields, internalType);
    if (internalType === "Uniform") {
      hytaleType = "Random";
      output.Type = "Random";
    }
  }

  // DensityBased → FieldFunction (position provider)
  if (internalType === "DensityBased" && category === "position") {
    transformedFields = transformDensityBasedFields(transformedFields);
    hytaleType = "FieldFunction";
    output.Type = "FieldFunction";
  }

  // FieldFunction in position context — ensure field renames applied
  if (internalType === "FieldFunction" && category === "position") {
    transformedFields = transformDensityBasedFields(transformedFields);
  }

  // PositionsCellNoise: ReturnCurve → Curve (reverse of import normalization)
  if (internalType === "PositionsCellNoise" && "ReturnCurve" in transformedFields) {
    transformedFields.Curve = transformedFields.ReturnCurve;
    delete transformedFields.ReturnCurve;
  }

  // SimplexRidgeNoise2D/3D → Abs(SimplexNoise2D/3D) compound node
  if (internalType === "SimplexRidgeNoise2D" || internalType === "SimplexRidgeNoise3D") {
    const baseNoiseType = internalType === "SimplexRidgeNoise2D" ? "SimplexNoise2D" : "SimplexNoise3D";

    // Build inner SimplexNoise node with all noise fields
    const innerAsset: V2Asset = { ...asset, Type: baseNoiseType };
    const innerNode = transformNode(innerAsset, { ...ctx, parentField: ctx.parentField, category });

    // Wrap in Abs — the outer node becomes Abs with inner as Inputs[0]
    hytaleType = "Abs";
    output.Type = "Abs";
    output.$NodeId = generateNodeId(getNodeIdPrefix(category, "Abs"));
    output.Inputs = [innerNode];

    // Clear transformedFields — all fields moved to inner node
    transformedFields = {};
  }

  // Environment: Default → Constant (Hytale only has Constant and DensityDelimited)
  if (internalType === "Default" && category === "environment") {
    hytaleType = "Constant";
    output.Type = "Constant";
    if (!("Environment" in transformedFields)) {
      transformedFields.Environment = "default";
    }
  }

  // Tint: Gradient → Constant (lossy — Hytale has no gradient tint type)
  if (internalType === "Gradient" && category === "tint") {
    hytaleType = "Constant";
    output.Type = "Constant";
    if ("From" in transformedFields) {
      transformedFields.Color = transformedFields.From;
      delete transformedFields.From;
    }
    delete transformedFields.To;
  }

  // Convert named density inputs → Inputs[] array
  if (category === "density") {
    if (internalType === "Sum" && "InputA" in transformedFields) {
      // Flatten nested binary Sum trees back to a flat Inputs[] array (legacy format)
      const flatInputs = flattenSumInputs(transformedFields, ctx);
      if (flatInputs.length > 0) {
        output.Inputs = flatInputs;
      }
      delete transformedFields.InputA;
      delete transformedFields.InputB;
    } else if (internalType === "Sum" && "Inputs" in transformedFields && Array.isArray(transformedFields.Inputs)) {
      // New compound handles format: Inputs[] is already an array, just transform children
      const rawInputs = transformedFields.Inputs as unknown[];
      const transformed = rawInputs.map((input) => {
        if (input && typeof input === "object" && "Type" in (input as Record<string, unknown>)) {
          return transformNode(input as V2Asset, { ...ctx, parentField: "Input", category: "density" });
        }
        return input;
      });
      if (transformed.length > 0) {
        output.Inputs = transformed;
      }
      delete transformedFields.Inputs;
    } else {
      const { inputs, remainingFields } = collectNamedInputs(transformedFields, internalType, ctx);
      transformedFields = remainingFields;
      if (inputs.length > 0) {
        output.Inputs = inputs;
      }
    }
  }

  // Add Skip: false for applicable categories
  if (SKIP_FIELD_CATEGORIES.has(category)) {
    output.Skip = false;
  }

  // Process remaining fields
  for (const [key, value] of Object.entries(transformedFields)) {
    if (key === "Type") continue;

    // Strip TerraNova-internal fields that should not appear in Hytale output
    if (key === "$DisconnectedTrees") continue;

    // Curve points: [[x,y]] → [{$NodeId, In, Out}]
    if (key === "Points" && Array.isArray(value)) {
      output.Points = transformCurvePoints(value);
      continue;
    }

    // Material string → material object (in certain contexts)
    if (key === "Material" && typeof value === "string") {
      output.Material = wrapMaterialString(value);
      continue;
    }

    // PointGenerator is already fully formed by transformMesh2DPositionFields — pass through as-is
    if (key === "PointGenerator") {
      output[key] = value;
      continue;
    }

    // NewYAxis plain vector → Point3D format
    if ((key === "NewYAxis" || key === "Vector") && value && typeof value === "object" && !Array.isArray(value) &&
        "x" in (value as Record<string, unknown>) && !("Type" in (value as Record<string, unknown>))) {
      const vec = value as { x: number; y: number; z: number };
      output[key] = {
        $NodeId: generateNodeId("Point3D"),
        X: vec.x ?? 0,
        Y: vec.y ?? 0,
        Z: vec.z ?? 0,
      };
      continue;
    }

    // Nested asset object
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      "Type" in (value as Record<string, unknown>)
    ) {
      output[key] = transformNode(value as V2Asset, { ...ctx, parentField: key });
      continue;
    }

    // Array of nested assets
    if (
      Array.isArray(value) && value.length > 0 &&
      typeof value[0] === "object" && value[0] !== null &&
      "Type" in value[0]
    ) {
      output[key] = value.map((item) =>
        transformNode(item as V2Asset, { ...ctx, parentField: key }),
      );
      continue;
    }

    // DensityDelimited TintProvider Delimiters — inject $NodeId on delimiter, Tint, and Range if missing
    if (
      key === "Delimiters" &&
      hytaleType === "DensityDelimited" &&
      category === "tint" &&
      Array.isArray(value)
    ) {
      output.Delimiters = (value as Array<Record<string, unknown>>).map((d) => {
        const tint = (d.Tint as Record<string, unknown>) ?? {};
        const range = (d.Range as Record<string, unknown>) ?? {};
        return {
          ...d,
          $NodeId: (d.$NodeId as string | undefined) ?? generateNodeId("Delimiter.DensityDelimited.TintProvider"),
          Tint: {
            ...tint,
            Type: "Constant",
            $NodeId: (tint.$NodeId as string | undefined) ?? generateNodeId("Constant.TintProvider"),
          },
          Range: {
            ...range,
            $NodeId: (range.$NodeId as string | undefined) ?? generateNodeId("Decimal.Range"),
          },
        };
      });
      continue;
    }

    // Pass through other values
    output[key] = value;
  }

  return output;
}

// ---------------------------------------------------------------------------
// Top-level export function
// ---------------------------------------------------------------------------

/**
 * Transform a TerraNova internal JSON asset tree into Hytale-native format.
 * Optionally accepts React Flow nodes for generating $NodeEditorMetadata.
 */
export function internalToHytale(
  asset: V2Asset,
  reactFlowNodes?: Node[],
): Record<string, unknown> {
  const result = transformNode(asset, { reactFlowNodes });

  // Generate $NodeEditorMetadata at root if React Flow nodes available
  if (reactFlowNodes && reactFlowNodes.length > 0) {
    result.$NodeEditorMetadata = generateNodeEditorMetadata(reactFlowNodes);
  }

  return result;
}

/**
 * Transform a full biome wrapper (non-typed) for Hytale export.
 * Processes all typed subtrees within the wrapper.
 */
export function internalToHytaleBiome(
  wrapper: Record<string, unknown>,
  sectionNodes?: Record<string, Node[]>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  // Generate biome-level $NodeId
  output.$NodeId = generateNodeId("Biome");

  for (const [key, value] of Object.entries(wrapper)) {
    if (key === "Terrain" && value && typeof value === "object") {
      const terrain = { ...(value as Record<string, unknown>) };
      terrain.$NodeId = generateNodeId("Terrain");
      if (terrain.Density && typeof terrain.Density === "object" && "Type" in (terrain.Density as Record<string, unknown>)) {
        terrain.Density = transformNode(terrain.Density as V2Asset, { parentField: "Density", category: "density" });
      }
      output[key] = terrain;
      continue;
    }

    if (key === "MaterialProvider" && value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
      const transformed = transformNode(value as V2Asset, { parentField: "MaterialProvider", category: "material" });
      // Check for fluid fields on the wrapper to generate proper Empty branch
      const fluidLevel = wrapper.FluidLevel as number | undefined;
      const fluidMaterial = wrapper.FluidMaterial as string | undefined;
      const originalEmpty = wrapper._originalEmptyBranch as Record<string, unknown> | undefined;
      let emptyBranch: Record<string, unknown>;
      if (fluidLevel != null && fluidMaterial) {
        emptyBranch = {
          $NodeId: generateNodeId("SimpleHorizontalMaterialProvider"),
          Type: "SimpleHorizontal",
          TopY: fluidLevel,
          BottomY: 0,
          Material: {
            $NodeId: generateNodeId("ConstantMaterialProvider"),
            Type: "Constant",
            Material: { $NodeId: generateNodeId("Material"), Fluid: fluidMaterial },
          },
        };
      } else if (originalEmpty) {
        // Re-export preserved complex Empty branch (inject $NodeId for Hytale format)
        emptyBranch = { $NodeId: generateNodeId("EmptyBranch"), ...originalEmpty };
      } else {
        emptyBranch = {
          $NodeId: generateNodeId("QueueMaterialProvider"),
          Type: "Queue",
          Queue: [{
            $NodeId: generateNodeId("ConstantMaterialProvider"),
            Type: "Constant",
            Material: { $NodeId: generateNodeId("Material"), Solid: "Empty" },
          }],
        };
      }
      output[key] = {
        $NodeId: generateNodeId("SolidityMaterialProvider"),
        Type: "Solidity",
        Solid: transformed,
        Empty: emptyBranch,
      };
      continue;
    }

    if (key === "Props" && Array.isArray(value)) {
      output[key] = value.map((prop) => {
        if (!prop || typeof prop !== "object") return prop;
        const propObj = { ...(prop as Record<string, unknown>) };
        if (propObj.Positions && typeof propObj.Positions === "object" && "Type" in (propObj.Positions as Record<string, unknown>)) {
          propObj.Positions = transformNode(propObj.Positions as V2Asset, { parentField: "PositionProvider", category: "position" });
        }
        if (propObj.Assignments && typeof propObj.Assignments === "object" && "Type" in (propObj.Assignments as Record<string, unknown>)) {
          propObj.Assignments = transformNode(propObj.Assignments as V2Asset, { parentField: "Assignments", category: "assignment" });
        }
        if (propObj.Prop && typeof propObj.Prop === "object" && "Type" in (propObj.Prop as Record<string, unknown>)) {
          propObj.Prop = transformNode(propObj.Prop as V2Asset, { parentField: "Prop", category: "prop" });
        }
        return propObj;
      });
      continue;
    }

    if (key === "EnvironmentProvider" && value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
      output[key] = transformNode(value as V2Asset, { parentField: key, category: "environment" });
      continue;
    }

    if (key === "TintProvider" && value && typeof value === "object" && "Type" in (value as Record<string, unknown>)) {
      output[key] = transformNode(value as V2Asset, { parentField: key, category: "tint" });
      continue;
    }

    // FluidLevel/FluidMaterial/_originalEmptyBranch are consumed by MaterialProvider export — skip here
    if (key === "FluidLevel" || key === "FluidMaterial" || key === "_originalEmptyBranch") continue;

    // Pass through other fields (Name, etc.)
    output[key] = value;
  }

  // Generate metadata if nodes provided
  if (sectionNodes) {
    const allNodes = Object.values(sectionNodes).flat();
    if (allNodes.length > 0) {
      output.$NodeEditorMetadata = generateNodeEditorMetadata(allNodes);
    }
  }

  return output;
}

// ---------------------------------------------------------------------------
// $NodeEditorMetadata generation
// ---------------------------------------------------------------------------

function generateNodeEditorMetadata(nodes: Node[]): Record<string, unknown> {
  const nodePositions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    nodePositions[node.id] = {
      x: node.position.x,
      y: node.position.y,
    };
  }

  return {
    Positions: nodePositions,
    Groups: [],
    FloatingNodes: [],
    Links: [],
    Comments: [],
  };
}
