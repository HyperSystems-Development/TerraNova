import type { Node, Edge } from "@xyflow/react";

interface V2Asset {
  Type?: string;
  [key: string]: unknown;
}

interface GraphResult {
  nodes: Node[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Inputs[] → named handle mapping (V2 type name → ordered handle names)
// ---------------------------------------------------------------------------
// Pre-computed map covering both Hytale (V2) and internal type names.
// Used to convert Inputs[] array indices into named target handles for edges.

const HYTALE_ARRAY_TO_NAMED: Record<string, string[]> = {
  // Single-input types (V2 names)
  Inverter: ["Input"], CurveMapper: ["Input"], Cache: ["Input"],
  Abs: ["Input"], Sqrt: ["Input"], Cube: ["Input"],
  CubeRoot: ["Input"], Inverse: ["Input"], Modulo: ["Input"],
  Clamp: ["Input"], SmoothClamp: ["Input"], Normalizer: ["Input"],
  AmplitudeConstant: ["Input"], FlatCache: ["Input"], Cache2D: ["Input"],
  FastGradientWarp: ["Input"], Scale: ["Input"], Slider: ["Input"],
  Rotator: ["Input"], MirroredPosition: ["Input"], QuantizedPosition: ["Input"],
  SurfaceDensity: ["Input"], TerrainMask: ["Input"], BeardDensity: ["Input"],
  ColumnDensity: ["Input"], CaveDensity: ["Input"], Debug: ["Input"],
  Passthrough: ["Input"], Wrap: ["Input"], SplineFunction: ["Input"],
  Pow: ["Input"], SumSelf: ["Input"], Exported: ["Input"],
  Imported: ["Input"], YOverride: ["Input"], XOverride: ["Input"],
  ZOverride: ["Input"], Floor: ["Input"], Ceiling: ["Input"],
  SmoothCeiling: ["Input"], SmoothFloor: ["Input"], Anchor: ["Input"],
  PositionsPinch: ["Input"], PositionsTwist: ["Input"],
  GradientDensity: ["Input"], Gradient: ["Input"], YGradient: ["Input"],
  ClampToIndex: ["Input"], DoubleNormalizer: ["Input"],
  // Single-input types (internal names that differ from V2)
  Negate: ["Input"], CurveFunction: ["Input"], CacheOnce: ["Input"],
  SquareRoot: ["Input"], CubeMath: ["Input"], LinearTransform: ["Input"],
  DomainWarp2D: ["Input"], DomainWarp3D: ["Input"],
  ScaledPosition: ["Input"], TranslatedPosition: ["Input"],
  RotatedPosition: ["Input"], Square: ["Input"], ImportedValue: ["Input"],
  // 2-input types
  Offset: ["Input", "Offset"],
  GradientWarp: ["Input", "WarpSource"],
  VectorWarp: ["Input", "WarpVector"],
  Amplitude: ["Input", "Amplitude"],
  YSampled: ["Input", "YProvider"],
  WeightedSum: ["Inputs[0]", "Inputs[1]"],
  // 3-input types (V2 names)
  Mix: ["InputA", "InputB", "Factor"],
  MultiMix: ["InputA", "InputB", "Factor"],
  // 3-input types (internal names)
  Blend: ["InputA", "InputB", "Factor"],
  BlendCurve: ["InputA", "InputB", "Factor"],
  Interpolate: ["InputA", "InputB", "Factor"],
  // Conditional variants
  Conditional: ["Condition", "TrueInput", "FalseInput"],
  RangeChoice: ["Condition", "TrueInput", "FalseInput"],
};

/**
 * Migration map for renamed handles (compound inputs refactor).
 * Maps nodeType → { oldHandleId → newHandleId }.
 */
const HANDLE_MIGRATION: Record<string, Record<string, string>> = {
  Sum:                          { InputA: "Inputs[0]", InputB: "Inputs[1]" },
  "Curve:Blend":                { InputA: "Inputs[0]", InputB: "Inputs[1]" },
  "Material:NoiseSelectorMaterial": { InputA: "Inputs[0]", InputB: "Inputs[1]" },
  "Material:NoiseSelector":     { InputA: "Inputs[0]", InputB: "Inputs[1]" },
  // V2 uses singular "Material" field; registry expects "Materials[0]"
  "Material:SimpleHorizontal":  { Material: "Materials[0]" },
  "Material:Striped":           { Material: "Materials[0]" },
};

function migrateHandle(nodeType: string, handle: string): string {
  return HANDLE_MIGRATION[nodeType]?.[handle] ?? handle;
}

/** Fields that are known to contain nested V2 assets (density functions, etc.) */
// const NESTED_ASSET_FIELDS = [
//   // Density inputs
//   "Input",
//   "InputA",
//   "InputB",
//   "Source",
//   "Condition",
//   "TrueInput",
//   "FalseInput",
//   "Factor",
//   // Cross-category references
//   "Density",
//   "DensityFunction",
//   "FieldFunction",
//   "Curve",
//   "Pattern",
//   "SubPattern",
//   "PositionProvider",
//   "VectorProvider",
//   "MaterialProvider",
//   "Scanner",
//   "ChildScanner",
//   "Prop",
//   // Material-specific
//   "Solid",
//   "Empty",
//   "Low",
//   "High",
//   // Layer / SpaceAndDepth V2
//   "Layers",
//   "Material",
//   "ThicknessFunctionXZ",
//   // Pattern surface fields
//   "Floor",
//   "Ceiling",
//   "Origin",
//   "Surface",
//   // Assignment
//   "Top",
//   "Bottom",
//   // Coordinates
//   "X",
//   "Y",
//   "Z",
//   "Min",
//   "Max",
// ];

/**
 * Map from parent field name → category prefix for the nested asset.
 * When a nested asset is extracted from one of these fields, its node type
 * gets prefixed with the category so the correct custom node component is used.
 */
const FIELD_CATEGORY_PREFIX: Record<string, string> = {
  Curve: "Curve",
  Pattern: "Pattern",
  SubPattern: "Pattern",
  PositionProvider: "Position",
  Positions: "Position",
  VectorProvider: "Vector",
  MaterialProvider: "Material",
  Scanner: "Scanner",
  ChildScanner: "Scanner",
  Prop: "Prop",
  Solid: "Material",
  Empty: "Material",
  Low: "Material",
  High: "Material",
  Floor: "Pattern",
  Ceiling: "Pattern",
  Surface: "Pattern",
  Top: "Assignment",
  Bottom: "Assignment",
  // Layer sub-assets within SpaceAndDepth
  Layers: "Material",
  Material: "Material",
  Materials: "Material",
  ThicknessFunctionXZ: "",
  NewYAxis: "Vector",
  Scale: "Vector",
  // Curve fields on non-CurveFunction parents (e.g. PositionsCellNoise, Shell)
  ReturnCurve: "Curve",
  AngleCurve: "Curve",
  // Curve fields on SDF shape nodes
  DistanceCurve: "Curve",
  PinchCurve: "Curve",
  TwistCurve: "Curve",
  RadialCurve: "Curve",
  AxialCurve: "Curve",
  // Curve array field (Curve:Sum, Curve:Multiplier, etc.)
  Curves: "Curve",
  // Pattern array field (Pattern:And, Pattern:Or)
  Patterns: "Pattern",
  // Material queue array
  Queue: "Material",
  // Cross-category fields on Prop:Prefab, etc.
  BlockMask: "BlockMask",
  Directionality: "Directionality",
  // Position:Clusters handle fields
  Distributor: "Position",
  Cluster: "Position",
  // Array fields for compound nodes
  Scanners: "Scanner",
  Props: "Prop",
  Assignments: "Assignment",
  // Density fields (no prefix — bare density type)
  FieldFunction: "",
  Density: "",
  SolidityFunction: "",
  TerrainDensity: "",
  Pipeline: "",
};

/**
 * Resolve the display type name for a node.
 * Density types use bare names; other categories get "Category:Type" prefixes.
 */
function resolveNodeType(assetType: string, parentFieldName?: string): string {
  if (!parentFieldName) return assetType;
  const prefix = FIELD_CATEGORY_PREFIX[parentFieldName];
  if (prefix) return `${prefix}:${assetType}`;
  return assetType;
}

/**
 * Convert a V2 JSON asset into React Flow nodes and edges.
 * Nested assets become separate nodes connected by edges.
 */
export function jsonToGraph(json: V2Asset, startX = 0, startY = 0, idPrefix = "graph", rootParentField?: string): GraphResult {
  let localCounter = 0;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function nextId(): string {
    return `${idPrefix}_${++localCounter}`;
  }

  function processAsset(asset: V2Asset, x: number, y: number, parentFieldName?: string): string {
    const nodeId = nextId();
    const fields: Record<string, unknown> = {};
    let childIndex = 0;
    const rawType = asset.Type ?? "unknown";

    // Detect vector constant: bare "Constant" with vector-shaped Value {x, y, z}.
    // Density constants always have numeric Values; vector constants have object Values.
    const isVectorValue =
      rawType === "Constant" &&
      asset.Value != null &&
      typeof asset.Value === "object" &&
      !Array.isArray(asset.Value) &&
      "x" in (asset.Value as Record<string, unknown>);
    const nodeType = isVectorValue
      ? "Vector:Constant"
      : resolveNodeType(rawType, parentFieldName);

    for (const [key, value] of Object.entries(asset)) {
      if (key === "Type") continue;

      // Restore disconnected subtrees as independent roots (no edge to parent)
      if (key === "$DisconnectedTrees" && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          processAsset(value[i] as V2Asset, x + 400, y + i * 300);
        }
        continue;
      }

      // Check if this field is a nested asset
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        "Type" in (value as Record<string, unknown>)
      ) {
        const childId = processAsset(value as V2Asset, x - 300, y + childIndex * 150, key);
        edges.push({
          id: `edge_${childId}_${nodeId}`,
          source: childId,
          sourceHandle: "output",
          target: nodeId,
          targetHandle: migrateHandle(nodeType, key),
        });
        childIndex++;
      } else if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
        value[0] !== null &&
        "Type" in value[0]
      ) {
        // Array of nested assets (e.g., Inputs for Sum)
        const namedHandles = (key === "Inputs") ? HYTALE_ARRAY_TO_NAMED[rawType] : undefined;
        for (let i = 0; i < value.length; i++) {
          const childId = processAsset(value[i] as V2Asset, x - 300, y + childIndex * 150, key);
          const targetHandle = (namedHandles && i < namedHandles.length)
            ? namedHandles[i]
            : `${key}[${i}]`;
          edges.push({
            id: `edge_${childId}_${nodeId}`,
            source: childId,
            sourceHandle: "output",
            target: nodeId,
            targetHandle,
          });
          childIndex++;
        }
      } else {
        fields[key] = value;
      }
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x, y },
      data: {
        type: rawType,
        fields,
      },
    });

    return nodeId;
  }

  processAsset(json, startX, startY, rootParentField);
  return { nodes, edges };
}
