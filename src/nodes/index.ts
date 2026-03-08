import type { ComponentType } from "react";

// ── Density nodes ──────────────────────────────────────────────────────
import {
  SimplexNoise2DNode, ConstantNode, SumNode, ClampNode,
  SimplexNoise3DNode, SimplexRidgeNoise2DNode, SimplexRidgeNoise3DNode,
  VoronoiNoise2DNode, VoronoiNoise3DNode,
  SumSelfNode, WeightedSumNode, ProductNode, NegateNode, AbsNode,
  SquareRootNode, CubeRootNode, SquareNode, CubeMathNode, InverseNode,
  ModuloNode, ImportedValueNode, OffsetConstantNode,
  ClampToIndexNode, NormalizerNode, DoubleNormalizerNode, RangeChoiceNode,
  LinearTransformNode, InterpolateNode,
  CoordinateXNode, CoordinateYNode, CoordinateZNode,
  DistanceFromOriginNode, DistanceFromAxisNode, DistanceFromPointNode,
  AngleFromOriginNode, AngleFromPointNode, HeightAboveSurfaceNode, AngleNode,
  CurveFunctionNode, SplineFunctionNode, FlatCacheNode,
  ConditionalNode, SwitchNode, BlendNode, BlendCurveNode,
  MinFunctionNode, MaxFunctionNode, AverageFunctionNode,
  CacheOnceNode, WrapNode, TranslatedPositionNode, ScaledPositionNode,
  RotatedPositionNode, MirroredPositionNode, QuantizedPositionNode,
  SurfaceDensityNode, TerrainBooleanNode, TerrainMaskNode, GradientDensityNode,
  BeardDensityNode, ColumnDensityNode, CaveDensityNode,
  FractalNoise2DNode, FractalNoise3DNode, DomainWarp2DNode, DomainWarp3DNode,
  DebugNode, YGradientNode, PassthroughNode, ZeroNode, OneNode, ExportedDensityNode,
  AmplitudeConstantNode, PowNode, SmoothClampNode, FloorDensityNode,
  CeilingDensityNode, SmoothFloorNode, SmoothMinNode, SmoothMaxNode,
  AnchorNode, YOverrideNode, BaseHeightNode, OffsetDensityNode,
  DistanceNode, PositionsCellNoiseNode,
  XOverrideNode, ZOverrideNode, SmoothCeilingNode, GradientNode,
  AmplitudeNode, YSampledNode, SwitchStateNode,
  Positions3DNode, PositionsPinchNode, PositionsTwistNode,
  GradientWarpNode, FastGradientWarpNode, VectorWarpNode,
  TerrainNode, CellWallDistanceNode, DistanceToBiomeEdgeNode, PipelineNode,
  EllipsoidNode, CuboidNode, CylinderNode, PlaneNode, ShellNode,
  CubeSDFNode, AxisNode, Cache2DNode,
} from "./density";

// ── Curve nodes ────────────────────────────────────────────────────────
import {
  ManualCurveNode, ConstantCurveNode, DistanceExponentialCurveNode,
  DistanceSCurveNode, NoiseCurveNode, StepFunctionCurveNode,
  ThresholdCurveNode, SmoothStepCurveNode, PowerCurveNode,
  MultiplierCurveNode, SumCurveNode, InverterCurveNode, NotCurveNode,
  ClampCurveNode, LinearRemapCurveNode, CacheCurveNode, BlendCurveNodeC,
  ImportedCurveNode, ExportedCurveNode,
  FloorCurveNode, CeilingCurveNode, SmoothFloorCurveNode, SmoothCeilingCurveNode,
  SmoothClampCurveNode, MinCurveNode, MaxCurveNode, SmoothMinCurveNode, SmoothMaxCurveNode,
} from "./curves";

// ── Material nodes ─────────────────────────────────────────────────────
import {
  ConstantMaterialNode, SpaceAndDepthMaterialNode, WeightedRandomMaterialNode,
  ConditionalMaterialNode, BlendMaterialNode, HeightGradientMaterialNode,
  NoiseSelectorMaterialNode, SolidMaterialNode, EmptyMaterialNode,
  SurfaceMaterialNode, CaveMaterialNode, ClusterMaterialNode,
  ImportedMaterialNode, ExportedMaterialNode, FieldFunctionMaterialNode,
  ConstantThicknessNode, NoiseThicknessNode, RangeThicknessNode, WeightedThicknessNode,
} from "./material";

// ── Pattern nodes ──────────────────────────────────────────────────────
import {
  FloorPatternNode, CeilingPatternNode, WallPatternNode, SurfacePatternNode,
  GapPatternNode, BlockTypePatternNode, BlockSetPatternNode, CuboidPatternNode,
  OffsetPatternNode, ConditionalPatternNode, BlendPatternNode,
  UnionPatternNode, IntersectionPatternNode, ImportedPatternNode, ExportedPatternNode,
  ConstantPatternNode,
} from "./patterns";

// ── Position nodes ─────────────────────────────────────────────────────
import {
  ListPositionNode, Mesh2DPositionNode, Mesh3DPositionNode,
  FieldFunctionPositionNode, OccurrencePositionNode, OffsetPositionNode,
  UnionPositionNode, SimpleHorizontalPositionNode, CachePositionNode,
  ConditionalPositionNode, DensityBasedPositionNode, SurfaceProjectionPositionNode,
  ImportedPositionNode, ExportedPositionNode,
  SquareGrid2dPositionNode, SquareGrid3dPositionNode, ScalerPositionNode,
  Jitter2dPositionNode, Jitter3dPositionNode, TriangularGrid2dPositionNode,
  ClustersPositionNode, EmptyPositionNode,
} from "./positions";

// ── Prop nodes ─────────────────────────────────────────────────────────
import {
  BoxPropNode, ColumnPropNode, ClusterPropNode, DensityPropNode,
  PrefabPropNode, ConditionalPropNode, WeightedRandomPropNode,
  SurfacePropNode, CavePropNode, ImportedPropNode, ExportedPropNode,
  UnionPropNode, WeightedPropNode,
  CuboidPropNode, ManualPropNode, LocatorPropNode, MaskPropNode,
  RandomRotatorPropNode, StaticRotatorPropNode, OrienterPropNode,
  DensitySelectorPropNode, UniquePrefabPropNode,
} from "./props";

// ── Scanner nodes ──────────────────────────────────────────────────────
import {
  OriginScannerNode, ColumnLinearScannerNode, ColumnRandomScannerNode,
  AreaScannerNode, LinearScannerNode, RandomScannerNode,
  RadialScannerNode, QueueScannerNode, DirectScannerNode,
  ImportedScannerNode,
} from "./scanners";

// ── Assignment nodes ───────────────────────────────────────────────────
import {
  ConstantAssignmentNode, FieldFunctionAssignmentNode,
  SandwichAssignmentNode, WeightedAssignmentNode, ImportedAssignmentNode,
} from "./assignments";

// ── Vector nodes ───────────────────────────────────────────────────────
import {
  ConstantVectorNode, DensityGradientVectorNode, CacheVectorNode,
  ExportedVectorNode, ImportedVectorNode,
} from "./vectors";

// ── Environment / Tint / BlockMask / Directionality nodes ──────────────
import {
  DefaultEnvironmentNode, BiomeEnvironmentNode,
  ImportedEnvironmentNode, ExportedEnvironmentNode,
  ConstantTintNode, GradientTintNode, ImportedTintNode, ExportedTintNode,
  AllBlockMaskNode, NoneBlockMaskNode, SingleBlockMaskNode,
  SetBlockMaskNode, ImportedBlockMaskNode,
  UniformDirectionalityNode, DirectionalDirectionalityNode,
  NormalDirectionalityNode, StaticDirectionalityNode, ImportedDirectionalityNode,
  ConstantEnvironmentNode, DensityDelimitedEnvironmentNode,
  DensityDelimitedTintNode, RandomDirectionalityNode, PatternDirectionalityNode,
} from "./environment";

// ── Groups ────────────────────────────────────────────────────────────
import { GroupNode } from "./GroupNode";

// ── Root ──────────────────────────────────────────────────────────────
import { RootNode } from "./RootNode";

// ── Fallback ───────────────────────────────────────────────────────────
import { GenericNode } from "./GenericNode";

/**
 * Central node type registry.
 *
 * Density types use bare names (they were the first category implemented).
 * Other categories use "Category:Type" prefixed names to avoid collisions
 * (e.g., "Curve:Constant" vs density "Constant").
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, ComponentType<any>> = {
  // ── Density ──────────────────────────────────────────────────────────
  SimplexNoise2D: SimplexNoise2DNode,
  SimplexNoise3D: SimplexNoise3DNode,
  SimplexRidgeNoise2D: SimplexRidgeNoise2DNode,
  SimplexRidgeNoise3D: SimplexRidgeNoise3DNode,
  VoronoiNoise2D: VoronoiNoise2DNode,
  VoronoiNoise3D: VoronoiNoise3DNode,
  Sum: SumNode,
  SumSelf: SumSelfNode,
  WeightedSum: WeightedSumNode,
  Product: ProductNode,
  Negate: NegateNode,
  Abs: AbsNode,
  SquareRoot: SquareRootNode,
  CubeRoot: CubeRootNode,
  Square: SquareNode,
  CubeMath: CubeMathNode,
  Inverse: InverseNode,
  Modulo: ModuloNode,
  Constant: ConstantNode,
  ImportedValue: ImportedValueNode,
  Clamp: ClampNode,
  ClampToIndex: ClampToIndexNode,
  Normalizer: NormalizerNode,
  DoubleNormalizer: DoubleNormalizerNode,
  RangeChoice: RangeChoiceNode,
  LinearTransform: LinearTransformNode,
  Interpolate: InterpolateNode,
  CoordinateX: CoordinateXNode,
  CoordinateY: CoordinateYNode,
  CoordinateZ: CoordinateZNode,
  DistanceFromOrigin: DistanceFromOriginNode,
  DistanceFromAxis: DistanceFromAxisNode,
  DistanceFromPoint: DistanceFromPointNode,
  AngleFromOrigin: AngleFromOriginNode,
  AngleFromPoint: AngleFromPointNode,
  HeightAboveSurface: HeightAboveSurfaceNode,
  CurveFunction: CurveFunctionNode,
  SplineFunction: SplineFunctionNode,
  FlatCache: FlatCacheNode,
  Conditional: ConditionalNode,
  Switch: SwitchNode,
  Blend: BlendNode,
  BlendCurve: BlendCurveNode,
  MinFunction: MinFunctionNode,
  MaxFunction: MaxFunctionNode,
  AverageFunction: AverageFunctionNode,
  CacheOnce: CacheOnceNode,
  Wrap: WrapNode,
  TranslatedPosition: TranslatedPositionNode,
  ScaledPosition: ScaledPositionNode,
  RotatedPosition: RotatedPositionNode,
  MirroredPosition: MirroredPositionNode,
  QuantizedPosition: QuantizedPositionNode,
  SurfaceDensity: SurfaceDensityNode,
  TerrainBoolean: TerrainBooleanNode,
  TerrainMask: TerrainMaskNode,
  GradientDensity: GradientDensityNode,
  BeardDensity: BeardDensityNode,
  ColumnDensity: ColumnDensityNode,
  CaveDensity: CaveDensityNode,
  FractalNoise2D: FractalNoise2DNode,
  FractalNoise3D: FractalNoise3DNode,
  DomainWarp2D: DomainWarp2DNode,
  DomainWarp3D: DomainWarp3DNode,
  Debug: DebugNode,
  YGradient: YGradientNode,
  Passthrough: PassthroughNode,
  Zero: ZeroNode,
  One: OneNode,
  AmplitudeConstant: AmplitudeConstantNode,
  Pow: PowNode,
  SmoothClamp: SmoothClampNode,
  Floor: FloorDensityNode,
  Ceiling: CeilingDensityNode,
  SmoothFloor: SmoothFloorNode,
  SmoothMin: SmoothMinNode,
  SmoothMax: SmoothMaxNode,
  Anchor: AnchorNode,
  YOverride: YOverrideNode,
  BaseHeight: BaseHeightNode,
  Offset: OffsetDensityNode,
  Distance: DistanceNode,
  PositionsCellNoise: PositionsCellNoiseNode,
  XOverride: XOverrideNode,
  ZOverride: ZOverrideNode,
  SmoothCeiling: SmoothCeilingNode,
  Gradient: GradientNode,
  Amplitude: AmplitudeNode,
  YSampled: YSampledNode,
  SwitchState: SwitchStateNode,
  Positions3D: Positions3DNode,
  PositionsPinch: PositionsPinchNode,
  PositionsTwist: PositionsTwistNode,
  GradientWarp: GradientWarpNode,
  FastGradientWarp: FastGradientWarpNode,
  VectorWarp: VectorWarpNode,
  Terrain: TerrainNode,
  CellWallDistance: CellWallDistanceNode,
  DistanceToBiomeEdge: DistanceToBiomeEdgeNode,
  Pipeline: PipelineNode,
  Ellipsoid: EllipsoidNode,
  Cuboid: CuboidNode,
  Cylinder: CylinderNode,
  Plane: PlaneNode,
  Shell: ShellNode,
  Cube: CubeSDFNode,
  Axis: AxisNode,
  Angle: AngleNode,
  Cache2D: Cache2DNode,
  OffsetConstant: OffsetConstantNode,
  Exported: ExportedDensityNode,

  // ── Curve ────────────────────────────────────────────────────────────
  "Curve:Manual": ManualCurveNode,
  "Curve:Constant": ConstantCurveNode,
  "Curve:DistanceExponential": DistanceExponentialCurveNode,
  "Curve:DistanceS": DistanceSCurveNode,
  "Curve:Multiplier": MultiplierCurveNode,
  "Curve:Sum": SumCurveNode,
  "Curve:Inverter": InverterCurveNode,
  "Curve:Not": NotCurveNode,
  "Curve:Clamp": ClampCurveNode,
  "Curve:LinearRemap": LinearRemapCurveNode,
  "Curve:Noise": NoiseCurveNode,
  "Curve:Cache": CacheCurveNode,
  "Curve:Blend": BlendCurveNodeC,
  "Curve:StepFunction": StepFunctionCurveNode,
  "Curve:Threshold": ThresholdCurveNode,
  "Curve:SmoothStep": SmoothStepCurveNode,
  "Curve:Power": PowerCurveNode,
  "Curve:Imported": ImportedCurveNode,
  "Curve:Exported": ExportedCurveNode,
  "Curve:Floor": FloorCurveNode,
  "Curve:Ceiling": CeilingCurveNode,
  "Curve:SmoothFloor": SmoothFloorCurveNode,
  "Curve:SmoothCeiling": SmoothCeilingCurveNode,
  "Curve:SmoothClamp": SmoothClampCurveNode,
  "Curve:Min": MinCurveNode,
  "Curve:Max": MaxCurveNode,
  "Curve:SmoothMin": SmoothMinCurveNode,
  "Curve:SmoothMax": SmoothMaxCurveNode,

  // ── Material Provider ────────────────────────────────────────────────
  "Material:Constant": ConstantMaterialNode,
  "Material:SpaceAndDepth": SpaceAndDepthMaterialNode,
  "Material:WeightedRandom": WeightedRandomMaterialNode,
  "Material:Conditional": ConditionalMaterialNode,
  "Material:Blend": BlendMaterialNode,
  "Material:HeightGradient": HeightGradientMaterialNode,
  "Material:NoiseSelector": NoiseSelectorMaterialNode,
  "Material:Solid": SolidMaterialNode,
  "Material:Empty": EmptyMaterialNode,
  "Material:Surface": SurfaceMaterialNode,
  "Material:Cave": CaveMaterialNode,
  "Material:Cluster": ClusterMaterialNode,
  "Material:FieldFunction": FieldFunctionMaterialNode,
  "Material:Imported": ImportedMaterialNode,
  "Material:Exported": ExportedMaterialNode,
  // Layer sub-asset types (SpaceAndDepth V2)
  "Material:ConstantThickness": ConstantThicknessNode,
  "Material:NoiseThickness": NoiseThicknessNode,
  "Material:RangeThickness": RangeThicknessNode,
  "Material:WeightedThickness": WeightedThicknessNode,

  // ── Pattern ──────────────────────────────────────────────────────────
  "Pattern:Floor": FloorPatternNode,
  "Pattern:Ceiling": CeilingPatternNode,
  "Pattern:Wall": WallPatternNode,
  "Pattern:Surface": SurfacePatternNode,
  "Pattern:Gap": GapPatternNode,
  "Pattern:BlockType": BlockTypePatternNode,
  "Pattern:BlockSet": BlockSetPatternNode,
  "Pattern:Cuboid": CuboidPatternNode,
  "Pattern:Offset": OffsetPatternNode,
  "Pattern:Conditional": ConditionalPatternNode,
  "Pattern:Blend": BlendPatternNode,
  "Pattern:Union": UnionPatternNode,
  "Pattern:Intersection": IntersectionPatternNode,
  "Pattern:Constant": ConstantPatternNode,
  "Pattern:Imported": ImportedPatternNode,
  "Pattern:Exported": ExportedPatternNode,

  // ── Position Provider ────────────────────────────────────────────────
  "Position:List": ListPositionNode,
  "Position:Mesh2D": Mesh2DPositionNode,
  "Position:Mesh3D": Mesh3DPositionNode,
  "Position:FieldFunction": FieldFunctionPositionNode,
  "Position:Occurrence": OccurrencePositionNode,
  "Position:Offset": OffsetPositionNode,
  "Position:Union": UnionPositionNode,
  "Position:SimpleHorizontal": SimpleHorizontalPositionNode,
  "Position:Cache": CachePositionNode,
  "Position:Conditional": ConditionalPositionNode,
  "Position:DensityBased": DensityBasedPositionNode,
  "Position:SurfaceProjection": SurfaceProjectionPositionNode,
  "Position:Imported": ImportedPositionNode,
  "Position:Exported": ExportedPositionNode,
  "Position:SquareGrid2d": SquareGrid2dPositionNode,
  "Position:SquareGrid3d": SquareGrid3dPositionNode,
  "Position:Scaler": ScalerPositionNode,
  "Position:Jitter2d": Jitter2dPositionNode,
  "Position:Jitter3d": Jitter3dPositionNode,
  "Position:TriangularGrid2d": TriangularGrid2dPositionNode,
  "Position:Clusters": ClustersPositionNode,
  "Position:Empty": EmptyPositionNode,

  // ── Prop ─────────────────────────────────────────────────────────────
  "Prop:Box": BoxPropNode,
  "Prop:Column": ColumnPropNode,
  "Prop:Cluster": ClusterPropNode,
  "Prop:Density": DensityPropNode,
  "Prop:Prefab": PrefabPropNode,
  "Prop:Conditional": ConditionalPropNode,
  "Prop:WeightedRandom": WeightedRandomPropNode,
  "Prop:Surface": SurfacePropNode,
  "Prop:Cave": CavePropNode,
  "Prop:Union": UnionPropNode,
  "Prop:Weighted": WeightedPropNode,
  "Prop:Cuboid": CuboidPropNode,
  "Prop:Manual": ManualPropNode,
  "Prop:Locator": LocatorPropNode,
  "Prop:Mask": MaskPropNode,
  "Prop:RandomRotator": RandomRotatorPropNode,
  "Prop:StaticRotator": StaticRotatorPropNode,
  "Prop:Orienter": OrienterPropNode,
  "Prop:DensitySelector": DensitySelectorPropNode,
  "Prop:UniquePrefab": UniquePrefabPropNode,
  "Prop:Imported": ImportedPropNode,
  "Prop:Exported": ExportedPropNode,

  // ── Scanner ──────────────────────────────────────────────────────────
  "Scanner:Origin": OriginScannerNode,
  "Scanner:ColumnLinear": ColumnLinearScannerNode,
  "Scanner:ColumnRandom": ColumnRandomScannerNode,
  "Scanner:Area": AreaScannerNode,
  "Scanner:Linear": LinearScannerNode,
  "Scanner:Random": RandomScannerNode,
  "Scanner:Radial": RadialScannerNode,
  "Scanner:Queue": QueueScannerNode,
  "Scanner:Direct": DirectScannerNode,
  "Scanner:Imported": ImportedScannerNode,

  // ── Assignment ───────────────────────────────────────────────────────
  "Assignment:Constant": ConstantAssignmentNode,
  "Assignment:FieldFunction": FieldFunctionAssignmentNode,
  "Assignment:Sandwich": SandwichAssignmentNode,
  "Assignment:Weighted": WeightedAssignmentNode,
  "Assignment:Imported": ImportedAssignmentNode,

  // ── Vector Provider ──────────────────────────────────────────────────
  "Vector:Constant": ConstantVectorNode,
  "Vector:DensityGradient": DensityGradientVectorNode,
  "Vector:Cache": CacheVectorNode,
  "Vector:Exported": ExportedVectorNode,
  "Vector:Imported": ImportedVectorNode,

  // ── Environment Provider ─────────────────────────────────────────────
  "Environment:Default": DefaultEnvironmentNode,
  "Environment:Biome": BiomeEnvironmentNode,
  "Environment:Constant": ConstantEnvironmentNode,
  "Environment:DensityDelimited": DensityDelimitedEnvironmentNode,
  "Environment:Imported": ImportedEnvironmentNode,
  "Environment:Exported": ExportedEnvironmentNode,

  // ── Tint Provider ────────────────────────────────────────────────────
  "Tint:Constant": ConstantTintNode,
  "Tint:Gradient": GradientTintNode,
  "Tint:DensityDelimited": DensityDelimitedTintNode,
  "Tint:Imported": ImportedTintNode,
  "Tint:Exported": ExportedTintNode,

  // ── Block Mask ───────────────────────────────────────────────────────
  "BlockMask:All": AllBlockMaskNode,
  "BlockMask:None": NoneBlockMaskNode,
  "BlockMask:Single": SingleBlockMaskNode,
  "BlockMask:Set": SetBlockMaskNode,
  "BlockMask:Imported": ImportedBlockMaskNode,

  // ── Directionality ───────────────────────────────────────────────────
  "Directionality:Uniform": UniformDirectionalityNode,
  "Directionality:Directional": DirectionalDirectionalityNode,
  "Directionality:Normal": NormalDirectionalityNode,
  "Directionality:Static": StaticDirectionalityNode,
  "Directionality:Random": RandomDirectionalityNode,
  "Directionality:Pattern": PatternDirectionalityNode,
  "Directionality:Imported": ImportedDirectionalityNode,

  // ── Groups ──────────────────────────────────────────────────────────
  group: GroupNode,

  // ── Root ────────────────────────────────────────────────────────────
  Root: RootNode,

  // ── Fallback ─────────────────────────────────────────────────────────
  default: GenericNode,
};
