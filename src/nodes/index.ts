import type { ComponentType } from "react";

// ── Density nodes ──────────────────────────────────────────────────────
import {
  SimplexNoise2DNode, ConstantNode, SumNode, ClampNode,
  SimplexNoise3DNode,
  CellNoise2DNode, CellNoise3DNode,
  MultiplierNode, InverterNode, AbsNode,
  SqrtNode, ImportedNode, OffsetConstantNode,
  NormalizerNode,
  XValueNode, YValueNode, ZValueNode,
  AngleNode,
  CurveMapperNode,
  SwitchNode, MixNode,
  MinNode, MaxNode, MultiMixNode,
  CacheNode, SliderNode, ScaleNode,
  RotatorNode,
  ExportedDensityNode,
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
  DistanceSCurveNode,
  MultiplierCurveNode, SumCurveNode, InverterCurveNode, NotCurveNode,
  ClampCurveNode,
  ImportedCurveNode,
  FloorCurveNode, CeilingCurveNode, SmoothFloorCurveNode, SmoothCeilingCurveNode,
  SmoothClampCurveNode, MinCurveNode, MaxCurveNode, SmoothMinCurveNode, SmoothMaxCurveNode,
} from "./curves";

// ── Material nodes ─────────────────────────────────────────────────────
import {
  ConstantMaterialNode, SpaceAndDepthMaterialNode, WeightedRandomMaterialNode,
  ImportedMaterialNode, FieldFunctionMaterialNode,
  ConstantThicknessNode, NoiseThicknessNode, RangeThicknessNode, WeightedThicknessNode,
  QueueMaterialNode, SolidityMaterialNode, TerrainDensityMaterialNode,
  SimpleHorizontalMaterialNode, DownwardDepthMaterialNode, UpwardDepthMaterialNode,
  DownwardSpaceMaterialNode, UpwardSpaceMaterialNode, StripedMaterialNode,
} from "./material";

// ── Pattern nodes ──────────────────────────────────────────────────────
import {
  FloorPatternNode, CeilingPatternNode, WallPatternNode, SurfacePatternNode,
  BlockTypePatternNode, BlockSetPatternNode, CuboidPatternNode,
  OffsetPatternNode, ImportedPatternNode,
  ConstantPatternNode,
  FieldFunctionPatternNode,
  AndPatternNode,
  OrPatternNode,
  NotPatternNode,
} from "./patterns";

// ── Position nodes ─────────────────────────────────────────────────────
import {
  ListPositionNode, Mesh2DPositionNode, Mesh3DPositionNode,
  FieldFunctionPositionNode, OccurrencePositionNode, OffsetPositionNode,
  UnionPositionNode, SimpleHorizontalPositionNode, CachePositionNode,
  ImportedPositionNode,
  SquareGrid2dPositionNode, SquareGrid3dPositionNode, ScalerPositionNode,
  Jitter2dPositionNode, Jitter3dPositionNode, TriangularGrid2dPositionNode,
  ClustersPositionNode, EmptyPositionNode,
  FrameworkPositionNode, BaseHeightPositionNode, AnchorPositionNode, BoundPositionNode,
} from "./positions";

// ── Prop nodes ─────────────────────────────────────────────────────────
import {
  BoxPropNode, ColumnPropNode, ClusterPropNode, DensityPropNode,
  PrefabPropNode, WeightedRandomPropNode,
  ImportedPropNode,
  UnionPropNode, WeightedPropNode,
  CuboidPropNode, ManualPropNode, LocatorPropNode, MaskPropNode,
  RandomRotatorPropNode, StaticRotatorPropNode, OrienterPropNode,
  DensitySelectorPropNode, UniquePrefabPropNode,
  PondFillerPropNode, QueuePropNode, OffsetPropNode,
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
  ImportedEnvironmentNode,
  ConstantTintNode, GradientTintNode, ImportedTintNode,
  AllBlockMaskNode, NoneBlockMaskNode, SingleBlockMaskNode,
  SetBlockMaskNode, ImportedBlockMaskNode,
  StaticDirectionalityNode, ImportedDirectionalityNode,
  ConstantEnvironmentNode, DensityDelimitedEnvironmentNode,
  DensityDelimitedTintNode, RandomDirectionalityNode, PatternDirectionalityNode,
} from "./environment";

// ── Groups ────────────────────────────────────────────────────────────
import { GroupNode } from "./GroupNode";

// ── Comments ──────────────────────────────────────────────────────────
import { CommentNode } from "./CommentNode";

// ── Frames ────────────────────────────────────────────────────────────
import { FrameNode } from "./FrameNode";

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
export const nodeTypes: Record<string, ComponentType<any>> = {
  // ── Density (V2 active types) ────────────────────────────────────────
  SimplexNoise2D: SimplexNoise2DNode,
  SimplexNoise3D: SimplexNoise3DNode,
  CellNoise2D: CellNoise2DNode,
  CellNoise3D: CellNoise3DNode,
  Sum: SumNode,
  Product: MultiplierNode,
  Multiplier: MultiplierNode,
  Negate: InverterNode,
  Inverter: InverterNode,
  Abs: AbsNode,
  SquareRoot: SqrtNode,
  Sqrt: SqrtNode,
  Constant: ConstantNode,
  ImportedValue: ImportedNode,
  Imported: ImportedNode,
  Clamp: ClampNode,
  Normalizer: NormalizerNode,
  LinearTransform: AmplitudeConstantNode,
  AmplitudeConstant: AmplitudeConstantNode,
  CoordinateX: XValueNode,
  CoordinateY: YValueNode,
  CoordinateZ: ZValueNode,
  XValue: XValueNode,
  YValue: YValueNode,
  ZValue: ZValueNode,
  CurveFunction: CurveMapperNode,
  CurveMapper: CurveMapperNode,
  Switch: SwitchNode,
  Blend: MixNode,
  Mix: MixNode,
  BlendCurve: MultiMixNode,
  MultiMix: MultiMixNode,
  MinFunction: MinNode,
  Min: MinNode,
  MaxFunction: MaxNode,
  Max: MaxNode,
  CacheOnce: CacheNode,
  Cache: CacheNode,
  TranslatedPosition: SliderNode,
  Slider: SliderNode,
  ScaledPosition: ScaleNode,
  Scale: ScaleNode,
  RotatedPosition: RotatorNode,
  Rotator: RotatorNode,
  DomainWarp2D: FastGradientWarpNode,
  DomainWarp3D: FastGradientWarpNode,
  FastGradientWarp: FastGradientWarpNode,
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
  "Curve:Imported": ImportedCurveNode,
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
  "Material:FieldFunction": FieldFunctionMaterialNode,
  "Material:Imported": ImportedMaterialNode,
  // Layer sub-asset types (SpaceAndDepth V2)
  "Material:ConstantThickness": ConstantThicknessNode,
  "Material:NoiseThickness": NoiseThicknessNode,
  "Material:RangeThickness": RangeThicknessNode,
  "Material:WeightedThickness": WeightedThicknessNode,
  "Material:Queue": QueueMaterialNode,
  "Material:Solidity": SolidityMaterialNode,
  "Material:TerrainDensity": TerrainDensityMaterialNode,
  "Material:SimpleHorizontal": SimpleHorizontalMaterialNode,
  "Material:DownwardDepth": DownwardDepthMaterialNode,
  "Material:UpwardDepth": UpwardDepthMaterialNode,
  "Material:DownwardSpace": DownwardSpaceMaterialNode,
  "Material:UpwardSpace": UpwardSpaceMaterialNode,
  "Material:Striped": StripedMaterialNode,

  // ── Pattern ──────────────────────────────────────────────────────────
  "Pattern:Floor": FloorPatternNode,
  "Pattern:Ceiling": CeilingPatternNode,
  "Pattern:Wall": WallPatternNode,
  "Pattern:Surface": SurfacePatternNode,
  "Pattern:BlockType": BlockTypePatternNode,
  "Pattern:BlockSet": BlockSetPatternNode,
  "Pattern:Cuboid": CuboidPatternNode,
  "Pattern:Offset": OffsetPatternNode,
  "Pattern:Constant": ConstantPatternNode,
  "Pattern:Imported": ImportedPatternNode,
  "Pattern:FieldFunction": FieldFunctionPatternNode,
  "Pattern:And": AndPatternNode,
  "Pattern:Or": OrPatternNode,
  "Pattern:Not": NotPatternNode,
  "Pattern:Rotator": GenericNode,

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
  "Position:Imported": ImportedPositionNode,
  "Position:SquareGrid2d": SquareGrid2dPositionNode,
  "Position:SquareGrid3d": SquareGrid3dPositionNode,
  "Position:Scaler": ScalerPositionNode,
  "Position:Jitter2d": Jitter2dPositionNode,
  "Position:Jitter3d": Jitter3dPositionNode,
  "Position:TriangularGrid2d": TriangularGrid2dPositionNode,
  "Position:Clusters": ClustersPositionNode,
  "Position:Empty": EmptyPositionNode,
  "Position:Framework": FrameworkPositionNode,
  "Position:BaseHeight": BaseHeightPositionNode,
  "Position:Anchor": AnchorPositionNode,
  "Position:Bound": BoundPositionNode,

  // ── Prop ─────────────────────────────────────────────────────────────
  "Prop:Box": BoxPropNode,
  "Prop:Column": ColumnPropNode,
  "Prop:Cluster": ClusterPropNode,
  "Prop:Density": DensityPropNode,
  "Prop:Prefab": PrefabPropNode,
  "Prop:WeightedRandom": WeightedRandomPropNode,
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
  "Prop:PondFiller": PondFillerPropNode,
  "Prop:Queue": QueuePropNode,
  "Prop:Offset": OffsetPropNode,
  "Prop:Curve": GenericNode,
  "Prop:Pattern": GenericNode,
  "Prop:Static": GenericNode,

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

  // ── Tint Provider ────────────────────────────────────────────────────
  "Tint:Constant": ConstantTintNode,
  "Tint:Gradient": GradientTintNode,
  "Tint:DensityDelimited": DensityDelimitedTintNode,
  "Tint:Imported": ImportedTintNode,

  // ── Block Mask ───────────────────────────────────────────────────────
  "BlockMask:All": AllBlockMaskNode,
  "BlockMask:None": NoneBlockMaskNode,
  "BlockMask:Single": SingleBlockMaskNode,
  "BlockMask:Set": SetBlockMaskNode,
  "BlockMask:Imported": ImportedBlockMaskNode,

  // ── Directionality ───────────────────────────────────────────────────
  "Directionality:Static": StaticDirectionalityNode,
  "Directionality:Random": RandomDirectionalityNode,
  "Directionality:Pattern": PatternDirectionalityNode,
  "Directionality:Imported": ImportedDirectionalityNode,

  // ── Prop Distribution ──────────────────────────────────────────────
  "PropDistribution:Assigned": GenericNode,
  "PropDistribution:Constant": GenericNode,
  "PropDistribution:Imported": GenericNode,
  "PropDistribution:Positions": GenericNode,
  "PropDistribution:Union": GenericNode,

  // ── Groups ──────────────────────────────────────────────────────────
  group: GroupNode,

  // ── Comments ─────────────────────────────────────────────────────────
  comment: CommentNode,

  // ── Frames ───────────────────────────────────────────────────────────
  frame: FrameNode,

  // ── Root ────────────────────────────────────────────────────────────
  Root: RootNode,

  // ── Structured asset cards ──────────────────────────────────────────

  // ── Fallback ─────────────────────────────────────────────────────────
  default: GenericNode,
};
