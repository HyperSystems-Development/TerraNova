import type { HandleDef } from "./shared/handles";
import {
  densityInput, densityOutput,
  curveInput, curveOutput,
  materialInput, materialOutput,
  patternInput, patternOutput,
  positionInput, positionOutput,
  propInput, propOutput,
  scannerInput, scannerOutput,
  assignmentInput, assignmentOutput,
  vectorInput, vectorOutput,
  environmentInput, environmentOutput,
  tintInput, tintOutput,
  blockMaskInput,
  blockMaskOutput,
  directionalityInput,
  directionalityOutput,
} from "./shared/handles";
import { getSchemaHandles } from "@/schema/schemaLoader";
import type { AssetCategory } from "@/schema/types";
import connectionsData from "@/data/connections.json";

const connectionMatrix = connectionsData.connectionMatrix as Record<string, Record<string, number>>;

/**
 * Static mapping from node type key (as registered in nodeTypes) to HandleDef[].
 * Used by isValidConnection to enforce type-safe wiring.
 */
export const HANDLE_REGISTRY: Record<string, HandleDef[]> = {
  // ── Density ────────────────────────────────────────────────────────────

  // Noise generators (output only)
  SimplexNoise2D: [densityOutput()],
  SimplexNoise3D: [densityOutput()],
  SimplexRidgeNoise2D: [densityOutput()],
  SimplexRidgeNoise3D: [densityOutput()],
  VoronoiNoise2D: [densityOutput()],
  VoronoiNoise3D: [densityOutput()],
  FractalNoise2D: [densityOutput()],
  FractalNoise3D: [densityOutput()],
  Constant: [densityOutput()],
  ImportedValue: [densityOutput()],
  GradientDensity: [densityOutput()],
  YGradient: [densityOutput()],
  Zero: [densityOutput()],
  One: [densityOutput()],

  // Coordinate readers (output only)
  CoordinateX: [densityOutput()],
  CoordinateY: [densityOutput()],
  CoordinateZ: [densityOutput()],
  DistanceFromOrigin: [densityOutput()],
  DistanceFromAxis: [densityOutput()],
  DistanceFromPoint: [vectorInput("VectorProvider", "Vector"), densityOutput()],
  AngleFromOrigin: [densityOutput()],
  AngleFromPoint: [vectorInput("VectorProvider", "Vector"), densityOutput()],
  HeightAboveSurface: [densityOutput()],

  // Single-input density transforms
  SumSelf: [densityInput("Input", "Input"), densityOutput()],
  Negate: [densityInput("Input", "Input"), densityOutput()],
  Abs: [densityInput("Input", "Input"), densityOutput()],
  SquareRoot: [densityInput("Input", "Input"), densityOutput()],
  CubeRoot: [densityInput("Input", "Input"), densityOutput()],
  Square: [densityInput("Input", "Input"), densityOutput()],
  CubeMath: [densityInput("Input", "Input"), densityOutput()],
  Inverse: [densityInput("Input", "Input"), densityOutput()],
  Modulo: [densityInput("Input", "Input"), densityOutput()],
  Clamp: [densityInput("Input", "Input"), densityOutput()],
  ClampToIndex: [densityInput("Input", "Input"), densityOutput()],
  Normalizer: [densityInput("Input", "Input"), densityOutput()],
  DoubleNormalizer: [densityInput("Input", "Input"), densityOutput()],
  LinearTransform: [densityInput("Input", "Input"), densityOutput()],
  CacheOnce: [densityInput("Input", "Input"), densityOutput()],
  Wrap: [densityInput("Input", "Input"), densityOutput()],
  FlatCache: [densityInput("Input", "Input"), densityOutput()],
  SplineFunction: [densityInput("Input", "Input"), densityOutput()],
  Passthrough: [densityInput("Input", "Input"), densityOutput()],
  Debug: [densityInput("Input", "Input"), densityOutput()],

  // Position transforms (single density input)
  TranslatedPosition: [densityInput("Input", "Input"), densityOutput()],
  ScaledPosition: [densityInput("Input", "Input"), densityOutput()],
  RotatedPosition: [densityInput("Input", "Input"), vectorInput("NewYAxis", "Y Axis"), densityOutput()],
  MirroredPosition: [densityInput("Input", "Input"), densityOutput()],
  QuantizedPosition: [densityInput("Input", "Input"), densityOutput()],

  // Terrain nodes (single input)
  SurfaceDensity: [densityInput("Input", "Input"), densityOutput()],
  TerrainMask: [densityInput("Input", "Input"), densityOutput()],
  BeardDensity: [densityInput("Input", "Input"), densityOutput()],
  ColumnDensity: [densityInput("Input", "Input"), densityOutput()],
  CaveDensity: [densityInput("Input", "Input"), densityOutput()],
  DomainWarp2D: [densityInput("Input", "Input"), densityOutput()],
  DomainWarp3D: [densityInput("Input", "Input"), densityOutput()],

  // Dual-input density
  Sum: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  WeightedSum: [densityInput("Inputs[0]", "Input 0"), densityInput("Inputs[1]", "Input 1"), densityOutput()],
  Product: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  MinFunction: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  MaxFunction: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  AverageFunction: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  Switch: [densityInput("Inputs[0]", "Case 0"), densityInput("Inputs[1]", "Case 1"), densityOutput()],
  TerrainBoolean: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],

  // Triple-input density
  Interpolate: [densityInput("InputA", "Input"), densityInput("InputB", "Input"), densityInput("Factor", "Factor"), densityOutput()],
  Blend: [densityInput("InputA", "Input"), densityInput("InputB", "Input"), densityInput("Factor", "Factor"), densityOutput()],
  Conditional: [densityInput("Condition", "Condition"), densityInput("TrueInput", "True"), densityInput("FalseInput", "False"), densityOutput()],
  RangeChoice: [densityInput("Condition", "Condition"), densityInput("TrueInput", "True"), densityInput("FalseInput", "False"), densityOutput()],

  // Additional math
  AmplitudeConstant: [densityInput("Input", "Input"), densityOutput()],
  Pow: [densityInput("Input", "Input"), densityOutput()],

  // Smooth operations
  SmoothClamp: [densityInput("Input", "Input"), densityOutput()],
  SmoothFloor: [densityInput("Input", "Input"), densityOutput()],
  SmoothMin: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],
  SmoothMax: [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()],

  // Floor/Ceiling
  Floor: [densityInput("Input", "Input"), densityOutput()],
  Ceiling: [densityInput("Input", "Input"), densityOutput()],

  // Position overrides & sampling
  Anchor: [densityInput("Input", "Input"), densityOutput()],
  YOverride: [densityInput("Input", "Input"), densityOutput()],
  BaseHeight: [densityOutput()],
  Offset: [densityInput("Input", "Input"), densityInput("Offset", "Offset"), densityOutput()],
  Distance: [curveInput("Curve", "Curve"), densityOutput()],
  PositionsCellNoise: [curveInput("ReturnCurve", "Return Curve"), densityOutput()],

  // Additional density types
  XOverride: [densityInput("Input", "Input"), densityOutput()],
  ZOverride: [densityInput("Input", "Input"), densityOutput()],
  SmoothCeiling: [densityInput("Input", "Input"), densityOutput()],
  Gradient: [densityOutput()],
  Amplitude: [densityInput("Input", "Input"), densityInput("Amplitude", "Amplitude"), densityOutput()],
  YSampled: [densityInput("Input", "Input"), densityOutput()],
  SwitchState: [densityOutput()],
  Positions3D: [densityOutput()],
  PositionsPinch: [densityInput("Input", "Input"), densityOutput()],
  PositionsTwist: [densityInput("Input", "Input"), densityOutput()],
  GradientWarp: [densityInput("Input", "Input"), densityInput("WarpSource", "Warp Source"), densityOutput()],
  FastGradientWarp: [densityInput("Input", "Input"), densityOutput()],
  VectorWarp: [densityInput("Input", "Input"), densityInput("Magnitude", "Magnitude"), vectorInput("WarpVector", "Warp Vector"), densityOutput()],
  Terrain: [densityOutput()],
  CellWallDistance: [densityOutput()],
  DistanceToBiomeEdge: [densityOutput()],
  Pipeline: [densityInput("Input", "Input"), densityOutput()],

  // Shape SDFs (output only — pure geometry)
  Ellipsoid: [densityOutput()],
  Cuboid: [densityOutput()],
  Cylinder: [densityOutput()],
  Plane: [densityOutput()],
  Shell: [curveInput("AngleCurve", "Angle Curve"), curveInput("DistanceCurve", "Distance Curve"), densityOutput()],
  Cube: [curveInput("Curve", "Curve"), densityOutput()],
  Axis: [curveInput("Curve", "Curve"), densityOutput()],
  Angle: [vectorInput("VectorProvider", "VectorProvider"), vectorInput("Vector", "Vector"), densityOutput()],
  Cache2D: [densityInput("Input", "Input"), densityOutput()],
  OffsetConstant: [densityInput("Input", "Input"), densityOutput()],
  Exported: [densityInput("Input", "Input"), densityOutput()],

  // Multi-input blending
  MultiMix: [densityInput("Selector", "Selector"), densityInput("Densities[0]", "Density 0"), densityInput("Densities[1]", "Density 1"), densityInput("Densities[2]", "Density 2"), densityInput("Densities[3]", "Density 3"), densityOutput()],

  // Cross-category density nodes
  CurveFunction: [densityInput("Input", "Input"), curveInput("Curve", "Curve"), densityOutput()],
  BlendCurve: [densityInput("InputA", "Input"), densityInput("InputB", "Input"), densityInput("Factor", "Factor"), curveInput("Curve", "Curve"), densityOutput()],

  // ── Curve ──────────────────────────────────────────────────────────────

  // Output-only curves
  "Curve:Manual": [curveOutput()],
  "Curve:Constant": [curveOutput()],
  "Curve:DistanceExponential": [curveOutput()],
  "Curve:DistanceS": [curveOutput()],
  "Curve:Noise": [curveOutput()],
  "Curve:StepFunction": [curveOutput()],
  "Curve:Threshold": [curveOutput()],
  "Curve:SmoothStep": [curveOutput()],
  "Curve:Power": [curveOutput()],
  "Curve:Imported": [curveOutput()],

  // Single-input curves
  "Curve:Inverter": [curveInput("Input", "Input"), curveOutput()],
  "Curve:Not": [curveInput("Input", "Input"), curveOutput()],
  "Curve:Clamp": [curveInput("Input", "Input"), curveOutput()],
  "Curve:LinearRemap": [curveInput("Input", "Input"), curveOutput()],
  "Curve:Cache": [curveInput("Input", "Input"), curveOutput()],
  "Curve:Exported": [curveInput("Input", "Input"), curveOutput()],

  // New single-input curves
  "Curve:Floor": [curveInput("Input", "Input"), curveOutput()],
  "Curve:Ceiling": [curveInput("Input", "Input"), curveOutput()],
  "Curve:SmoothFloor": [curveInput("Input", "Input"), curveOutput()],
  "Curve:SmoothCeiling": [curveInput("Input", "Input"), curveOutput()],
  "Curve:SmoothClamp": [curveInput("Input", "Input"), curveOutput()],

  // Dual-input curves
  "Curve:Multiplier": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:Sum": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:Blend": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:Min": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:Max": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:SmoothMin": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],
  "Curve:SmoothMax": [curveInput("Inputs[0]", "Input"), curveInput("Inputs[1]", "Input"), curveOutput()],

  // ── Material Provider ──────────────────────────────────────────────────

  "Material:Constant": [materialOutput()],
  "Material:Solid": [materialOutput()],
  "Material:Empty": [materialOutput()],
  "Material:Imported": [materialOutput()],

  "Material:SpaceAndDepth": [materialInput("Layers[0]", "Layer 0"), materialInput("Layers[1]", "Layer 1"), materialOutput()],
  "Material:WeightedRandom": [materialInput("Entries[0]", "Entry 0"), materialInput("Entries[1]", "Entry 1"), materialOutput()],
  "Material:HeightGradient": [materialInput("Low", "Low"), materialInput("High", "High"), materialOutput()],
  "Material:NoiseSelectorMaterial": [materialInput("Inputs[0]", "Input"), materialInput("Inputs[1]", "Input"), materialOutput()],
  "Material:NoiseSelector": [materialInput("Inputs[0]", "Input"), materialInput("Inputs[1]", "Input"), materialOutput()],
  "Material:Surface": [materialInput("Input", "Input"), materialOutput()],
  "Material:Cave": [materialInput("Input", "Input"), materialOutput()],
  "Material:Cluster": [materialInput("Input", "Input"), materialOutput()],
  "Material:Exported": [materialInput("Input", "Input"), materialOutput()],

  // Additional material types
  "Material:Queue": [materialInput("Queue[0]", "Material 0"), materialInput("Queue[1]", "Material 1"), materialOutput()],
  "Material:FieldFunction": [densityInput("FieldFunction", "Field Fn"), materialInput("Materials[0]", "Material 0"), materialInput("Materials[1]", "Material 1"), materialOutput()],
  "Material:Solidity": [densityInput("SolidityFunction", "Solidity"), materialOutput()],
  "Material:SimpleHorizontal": [materialInput("Materials[0]", "Material 0"), materialInput("Materials[1]", "Material 1"), materialOutput()],
  "Material:DownwardDepth": [materialInput("Input", "Input"), materialOutput()],
  "Material:UpwardDepth": [materialInput("Input", "Input"), materialOutput()],
  "Material:DownwardSpace": [materialInput("Input", "Input"), materialOutput()],
  "Material:UpwardSpace": [materialInput("Input", "Input"), materialOutput()],
  "Material:Striped": [materialInput("Materials[0]", "Material 0"), materialInput("Materials[1]", "Material 1"), materialOutput()],
  "Material:TerrainDensity": [densityInput("TerrainDensity", "Terrain Density"), materialOutput()],

  // Layer sub-asset types (SpaceAndDepth.Layers[])
  "Material:ConstantThickness": [materialInput("Material", "Material"), materialOutput()],
  "Material:NoiseThickness": [densityInput("ThicknessFunctionXZ", "Noise"), materialInput("Material", "Material"), materialOutput()],
  "Material:RangeThickness": [materialInput("Material", "Material"), materialOutput()],
  "Material:WeightedThickness": [materialInput("Material", "Material"), materialOutput()],

  // Cross-category materials
  "Material:Conditional": [densityInput("Condition", "Condition"), materialInput("TrueInput", "True"), materialInput("FalseInput", "False"), materialOutput()],
  "Material:Blend": [materialInput("InputA", "Input"), materialInput("InputB", "Input"), densityInput("Factor", "Factor"), materialOutput()],

  // ── Pattern ────────────────────────────────────────────────────────────

  "Pattern:Gap": [patternOutput()],
  "Pattern:BlockType": [patternOutput()],
  "Pattern:Cuboid": [patternOutput()],
  "Pattern:Imported": [patternOutput()],

  "Pattern:Floor": [patternInput("SubPattern", "Pattern"), patternOutput()],
  "Pattern:Ceiling": [patternInput("SubPattern", "Pattern"), patternOutput()],
  "Pattern:Wall": [patternInput("SubPattern", "Pattern"), patternOutput()],
  "Pattern:Offset": [patternInput("SubPattern", "Pattern"), patternOutput()],
  "Pattern:Exported": [patternInput("Input", "Input"), patternOutput()],
  "Pattern:Surface": [patternInput("Floor", "Floor"), patternInput("Ceiling", "Ceiling"), patternOutput()],
  "Pattern:BlockSet": [patternInput("Patterns[0]", "Pattern 0"), patternInput("Patterns[1]", "Pattern 1"), patternOutput()],
  "Pattern:Union": [patternInput("Patterns[0]", "Pattern"), patternInput("Patterns[1]", "Pattern"), patternOutput()],
  "Pattern:Intersection": [patternInput("Patterns[0]", "Pattern"), patternInput("Patterns[1]", "Pattern"), patternOutput()],

  // Cross-category patterns
  "Pattern:Conditional": [densityInput("Condition", "Condition"), patternInput("TrueInput", "True"), patternInput("FalseInput", "False"), patternOutput()],
  "Pattern:Blend": [patternInput("InputA", "Input"), patternInput("InputB", "Input"), densityInput("Factor", "Factor"), patternOutput()],

  // Additional pattern types
  "Pattern:And": [patternInput("Patterns[0]", "Pattern"), patternInput("Patterns[1]", "Pattern"), patternOutput()],
  "Pattern:Or": [patternInput("Patterns[0]", "Pattern"), patternInput("Patterns[1]", "Pattern"), patternOutput()],
  "Pattern:Not": [patternInput("SubPattern", "Pattern"), patternOutput()],
  "Pattern:Constant": [patternOutput()],
  "Pattern:FieldFunction": [densityInput("FieldFunction", "Field Fn"), patternOutput()],

  // ── Position Provider ──────────────────────────────────────────────────

  "Position:List": [positionOutput()],
  "Position:Mesh2D": [positionOutput()],
  "Position:Mesh3D": [positionOutput()],
  "Position:SimpleHorizontal": [positionOutput()],
  "Position:Imported": [positionOutput()],

  "Position:Occurrence": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Offset": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Cache": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:SurfaceProjection": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Exported": [positionInput("Input", "Input"), positionOutput()],
  "Position:Union": [positionInput("Providers[0]", "Provider"), positionInput("Providers[1]", "Provider"), positionOutput()],

  // Cross-category positions
  "Position:FieldFunction": [densityInput("FieldFunction", "Field Fn"), positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Conditional": [densityInput("Condition", "Condition"), positionInput("TrueInput", "True"), positionInput("FalseInput", "False"), positionOutput()],
  "Position:DensityBased": [densityInput("DensityFunction", "Density"), positionOutput()],

  // Additional position types
  "Position:BaseHeight": [positionOutput()],
  "Position:Anchor": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Bound": [positionInput("PositionProvider", "Positions"), positionOutput()],
  "Position:Framework": [positionOutput()],
  "Position:SquareGrid2d": [positionOutput()],
  "Position:SquareGrid3d": [positionOutput()],
  "Position:TriangularGrid2d": [positionOutput()],
  "Position:Empty": [positionOutput()],
  "Position:Scaler": [positionInput("Positions", "Positions"), positionOutput()],
  "Position:Jitter2d": [positionInput("Positions", "Positions"), positionOutput()],
  "Position:Jitter3d": [positionInput("Positions", "Positions"), positionOutput()],
  "Position:Clusters": [positionInput("Distributor", "Distributor"), positionInput("Cluster", "Cluster"), positionOutput()],

  // ── Prop ───────────────────────────────────────────────────────────────

  "Prop:Box": [propOutput()],
  "Prop:Column": [propOutput()],
  "Prop:Prefab": [
    scannerInput("Scanner", "Scanner"),
    patternInput("Pattern", "Pattern"),
    blockMaskInput("BlockMask", "Block Mask"),
    directionalityInput("Directionality", "Directionality"),
    propOutput(),
  ],
  "Prop:Imported": [propOutput()],

  "Prop:Cluster": [propInput("Props[0]", "Prop 0"), propInput("Props[1]", "Prop 1"), propOutput()],
  "Prop:Union": [propInput("Props[0]", "Prop 0"), propInput("Props[1]", "Prop 1"), propOutput()],
  "Prop:WeightedRandom": [propInput("Entries[0]", "Entry 0"), propInput("Entries[1]", "Entry 1"), propOutput()],
  "Prop:Weighted": [propInput("Entries[0]", "Entry 0"), propInput("Entries[1]", "Entry 1"), propOutput()],
  "Prop:Exported": [propInput("Input", "Input"), propOutput()],

  // Cross-category props
  "Prop:Density": [densityInput("DensityFunction", "Density"), materialInput("Material", "Material"), propOutput()],
  "Prop:Conditional": [densityInput("Condition", "Condition"), propInput("TrueInput", "True"), propInput("FalseInput", "False"), propOutput()],
  "Prop:Surface": [patternInput("Pattern", "Pattern"), scannerInput("Scanner", "Scanner"), propOutput()],
  "Prop:Cave": [patternInput("Pattern", "Pattern"), scannerInput("Scanner", "Scanner"), propOutput()],

  // Content props
  "Prop:Cuboid": [materialInput("Material", "Material"), propOutput()],
  "Prop:Manual": [propOutput()],

  // Wrapper props
  "Prop:Locator": [
    scannerInput("Scanner", "Scanner"),
    patternInput("Pattern", "Pattern"),
    propInput("Prop", "Prop"),
    propOutput(),
  ],
  "Prop:Mask": [
    blockMaskInput("BlockMask", "Block Mask"),
    propInput("Prop", "Prop"),
    propOutput(),
  ],
  "Prop:RandomRotator": [propInput("Prop", "Prop"), propOutput()],
  "Prop:StaticRotator": [propInput("Prop", "Prop"), propOutput()],
  "Prop:Orienter": [
    patternInput("Pattern", "Pattern"),
    propInput("Prop", "Prop"),
    propOutput(),
  ],
  "Prop:DensitySelector": [
    densityInput("Density", "Density"),
    propInput("Props[0]", "Prop 0"),
    propInput("Props[1]", "Prop 1"),
    propOutput(),
  ],
  "Prop:UniquePrefab": [
    scannerInput("Scanner", "Scanner"),
    blockMaskInput("BlockMask", "Block Mask"),
    directionalityInput("Directionality", "Direction"),
    propOutput(),
  ],

  // Additional prop types
  "Prop:PondFiller": [propOutput()],
  "Prop:Queue": [propInput("Props[0]", "Prop 0"), propInput("Props[1]", "Prop 1"), propOutput()],
  "Prop:Offset": [propInput("Input", "Input"), propOutput()],

  // ── Scanner ────────────────────────────────────────────────────────────

  "Scanner:Origin": [scannerOutput()],
  "Scanner:ColumnLinear": [scannerOutput()],
  "Scanner:ColumnRandom": [scannerOutput()],
  "Scanner:Imported": [scannerOutput()],
  "Scanner:Area": [scannerInput("ChildScanner", "Child"), scannerOutput()],
  "Scanner:Linear": [scannerInput("Scanner", "Child"), scannerOutput()],
  "Scanner:Random": [scannerInput("Scanner", "Child"), scannerOutput()],
  "Scanner:Radial": [scannerInput("Scanner", "Child"), scannerOutput()],
  "Scanner:Queue": [scannerInput("Scanners[0]", "Scanner 0"), scannerInput("Scanners[1]", "Scanner 1"), scannerOutput()],
  "Scanner:Direct": [scannerOutput()],

  // ── Assignment ─────────────────────────────────────────────────────────

  "Assignment:Imported": [assignmentOutput()],
  "Assignment:Constant": [propInput("Prop", "Prop"), assignmentOutput()],
  "Assignment:Sandwich": [assignmentInput("Top", "Top"), assignmentInput("Bottom", "Bottom"), assignmentOutput()],
  "Assignment:Weighted": [assignmentInput("Entries[0]", "Entry 0"), assignmentInput("Entries[1]", "Entry 1"), assignmentOutput()],
  "Assignment:FieldFunction": [densityInput("FieldFunction", "Field Fn"), assignmentInput("Assignments[0]", "Assign 0"), assignmentInput("Assignments[1]", "Assign 1"), assignmentOutput()],

  // ── Vector Provider ────────────────────────────────────────────────────

  "Vector:Constant": [vectorOutput()],
  "Vector:Imported": [vectorOutput()],
  "Vector:DensityGradient": [densityInput("DensityFunction", "Density"), vectorOutput()],
  "Vector:Cache": [vectorInput("VectorProvider", "Vector"), vectorOutput()],
  "Vector:Exported": [vectorInput("Input", "Input"), vectorOutput()],

  // ── Environment Provider ───────────────────────────────────────────────

  "Environment:Default": [environmentOutput()],
  "Environment:Biome": [environmentOutput()],
  "Environment:Constant": [environmentOutput()],
  "Environment:DensityDelimited": [densityInput("Density", "Density"), environmentOutput()],
  "Environment:Imported": [environmentOutput()],
  "Environment:Exported": [environmentInput("Input", "Input"), environmentOutput()],

  // ── Tint Provider ──────────────────────────────────────────────────────

  "Tint:Constant": [tintOutput()],
  "Tint:Gradient": [tintOutput()],
  "Tint:DensityDelimited": [densityInput("Density", "Density"), tintOutput()],
  "Tint:Imported": [tintOutput()],
  "Tint:Exported": [tintInput("Input", "Input"), tintOutput()],

  // ── Block Mask ─────────────────────────────────────────────────────────

  "BlockMask:All": [blockMaskOutput()],
  "BlockMask:None": [blockMaskOutput()],
  "BlockMask:Single": [blockMaskOutput()],
  "BlockMask:Set": [blockMaskOutput()],
  "BlockMask:Imported": [blockMaskOutput()],

  // ── Directionality ────────────────────────────────────────────────────

  "Directionality:Uniform": [directionalityOutput()],
  "Directionality:Directional": [directionalityOutput()],
  "Directionality:Normal": [directionalityOutput()],
  "Directionality:Static": [patternInput("Pattern", "Pattern"), directionalityOutput()],
  "Directionality:Random": [directionalityOutput()],
  "Directionality:Pattern": [patternInput("Pattern", "Pattern"), directionalityOutput()],
  "Directionality:Imported": [directionalityOutput()],

  // ── Root ────────────────────────────────────────────────────────────
  Root: [densityInput("input", "Input")],
};

/**
 * Get handles for a node type. Local overrides take precedence,
 * falls back to schema bundle, then default density output.
 */
export function getHandles(nodeType: string): HandleDef[] {
  return HANDLE_REGISTRY[nodeType] ?? getSchemaHandles(nodeType) ?? [densityOutput()];
}

/**
 * Look up the HandleDef for a specific handle ID on a node type.
 * Supports dynamic array-indexed handles (e.g. Inputs[5] matches any Inputs[N]).
 * Returns undefined if not found (e.g. GenericNode or dynamic handles).
 */
export function findHandleDef(
  nodeType: string,
  handleId: string,
): HandleDef | undefined {
  const defs = HANDLE_REGISTRY[nodeType] ?? getSchemaHandles(nodeType);
  if (!defs) return undefined;

  // Exact match first
  const exact = defs.find((h) => h.id === handleId);
  if (exact) return exact;

  // Array-pattern fallback: "Inputs[5]" matches any "Inputs[N]" in the registry
  const arrayMatch = /^(.+)\[\d+\]$/.exec(handleId);
  if (arrayMatch) {
    const base = arrayMatch[1];
    const pattern = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[\\d+\\]$`);
    return defs.find((h) => pattern.test(h.id));
  }

  return undefined;
}

/**
 * Find compatible input and output handles on a node type for wire interjection.
 * Given the categories flowing through the edge being split, returns the best
 * unconnected input handle (matching the source's output category) and
 * unconnected output handle (matching the target's input category).
 *
 * Returns null if the node can't be interjected (incompatible or fully occupied).
 */
export function findCompatibleInterjectHandles(
  nodeType: string,
  sourceOutputCategory: AssetCategory,
  targetInputCategory: AssetCategory,
  connectedHandleIds: Set<string>,
): { inputHandleId: string; outputHandleId: string } | null {
  const handles = getHandles(nodeType);

  // Find a compatible, unconnected target (input) handle
  const inputHandle = handles.find((h) => {
    if (h.type !== "target") return false;
    if (connectedHandleIds.has(h.id)) return false;
    if (h.category === sourceOutputCategory) return true;
    // Cross-category: check connection matrix
    return (connectionMatrix[sourceOutputCategory]?.[h.category] ?? 0) > 0;
  });

  // Find a compatible, unconnected source (output) handle
  const outputHandle = handles.find((h) => {
    if (h.type !== "source") return false;
    if (connectedHandleIds.has(h.id)) return false;
    if (h.category === targetInputCategory) return true;
    // Cross-category: check connection matrix
    return (connectionMatrix[h.category]?.[targetInputCategory] ?? 0) > 0;
  });

  if (!inputHandle || !outputHandle) return null;

  return { inputHandleId: inputHandle.id, outputHandleId: outputHandle.id };
}
