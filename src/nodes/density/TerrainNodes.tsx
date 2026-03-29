import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput, curveInput, vectorInput, positionInput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];
const OUTPUT_ONLY_HANDLES = [densityOutput()];
const DISTANCE_HANDLES = [curveInput("Curve", "Curve"), densityOutput()];
const YSAMPLED_HANDLES = [densityInput("Input", "Input"), densityInput("YProvider", "Y Provider"), densityOutput()];
const GRADIENT_WARP_HANDLES = [densityInput("Input", "Input"), densityInput("WarpSource", "Warp Source"), densityOutput()];
const VECTOR_WARP_HANDLES = [densityInput("Input", "Input"), densityInput("Magnitude", "Magnitude"), vectorInput("WarpVector", "Warp Vector"), densityOutput()];
const POSITIONS_CELL_NOISE_HANDLES = [positionInput("Positions", "Positions"), curveInput("ReturnCurve", "Return Curve"), densityOutput()];
const POSITIONS_3D_HANDLES = [positionInput("Positions", "Positions"), curveInput("DistanceCurve", "Distance Curve"), densityOutput()];
const POSITIONS_PINCH_HANDLES = [positionInput("Positions", "Positions"), curveInput("PinchCurve", "Pinch Curve"), densityOutput()];
const POSITIONS_TWIST_HANDLES = [positionInput("Positions", "Positions"), curveInput("TwistCurve", "Twist Curve"), densityOutput()];

export const SurfaceDensityNode = memo(function SurfaceDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Surface density</div>
    </BaseNode>
  );
});

export const TerrainBooleanNode = memo(function TerrainBooleanNode(props: TypedNodeProps) {
  const data = props.data;
  const handles = useCompoundHandles(props.id, "TerrainBoolean");
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={handles}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Op</span>
        <span>{safeDisplay(data.fields.Operation, "Union")}</span>
      </div>
    </BaseNode>
  );
});

export const TerrainMaskNode = memo(function TerrainMaskNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Terrain mask</div>
    </BaseNode>
  );
});

export const GradientDensityNode = memo(function GradientDensityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">From Y</span>
          <span>{safeDisplay(data.fields.FromY, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">To Y</span>
          <span>{safeDisplay(data.fields.ToY, 256)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const BeardDensityNode = memo(function BeardDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Beard density</div>
    </BaseNode>
  );
});

export const ColumnDensityNode = memo(function ColumnDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Column density</div>
    </BaseNode>
  );
});

export const CaveDensityNode = memo(function CaveDensityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Radius</span>
        <span>{safeDisplay(data.fields.Radius, 4)}</span>
      </div>
    </BaseNode>
  );
});

export const FractalNoise2DNode = memo(function FractalNoise2DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale ?? data.fields.Frequency, 1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Oct</span>
          <span>{safeDisplay(data.fields.Octaves, 4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Lac</span>
          <span>{safeDisplay(data.fields.Lacunarity, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Pers</span>
          <span>{safeDisplay(data.fields.Persistence ?? data.fields.Gain, 0.5)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const FractalNoise3DNode = memo(function FractalNoise3DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale ?? data.fields.Frequency, 1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Oct</span>
          <span>{safeDisplay(data.fields.Octaves, 4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Lac</span>
          <span>{safeDisplay(data.fields.Lacunarity, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Pers</span>
          <span>{safeDisplay(data.fields.Persistence ?? data.fields.Gain, 0.5)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const AnchorNode = memo(function AnchorNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">f(0,0,0)</div>
    </BaseNode>
  );
});

export const YOverrideNode = memo(function YOverrideNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema field: "Value". Legacy: "OverrideY" or "Y".
  const value = data.fields.Value ?? data.fields.OverrideY ?? data.fields.Y;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Y</span>
        <span>{safeDisplay(value, 0)}</span>
      </div>
    </BaseNode>
  );
});

export const XOverrideNode = memo(function XOverrideNode(props: TypedNodeProps) {
  const data = props.data;
  const value = data.fields.Value ?? data.fields.OverrideX;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">X</span>
        <span>{safeDisplay(value, 0)}</span>
      </div>
    </BaseNode>
  );
});

export const ZOverrideNode = memo(function ZOverrideNode(props: TypedNodeProps) {
  const data = props.data;
  const value = data.fields.Value ?? data.fields.OverrideZ;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Z</span>
        <span>{safeDisplay(value, 0)}</span>
      </div>
    </BaseNode>
  );
});

export const BaseHeightNode = memo(function BaseHeightNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: MinYRead/MaxYRead/BedName. Legacy: BaseHeightName/Distance.
  const hasV2Fields = data.fields.BedName != null || data.fields.MinYRead != null;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      {hasV2Fields ? (
        <SchemaFields typeKey="BaseHeight" fields={data.fields} />
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Name</span>
            <span>{safeDisplay(data.fields.BaseHeightName, "Base")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Distance</span>
            <span>{data.fields.Distance ? "Yes" : "No"}</span>
          </div>
        </div>
      )}
    </BaseNode>
  );
});

export const DistanceNode = memo(function DistanceNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={DISTANCE_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">dist(origin)</div>
    </BaseNode>
  );
});

export const GradientNode = memo(function GradientNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="Gradient" fields={data.fields} />
    </BaseNode>
  );
});

export const YSampledNode = memo(function YSampledNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={YSAMPLED_HANDLES}>
      <SchemaFields typeKey="YSampled" fields={data.fields} />
    </BaseNode>
  );
});

export const SwitchStateNode = memo(function SwitchStateNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <SchemaFields typeKey="SwitchState" fields={data.fields} />
    </BaseNode>
  );
});

export const GradientWarpNode = memo(function GradientWarpNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={GRADIENT_WARP_HANDLES}>
      <SchemaFields typeKey="GradientWarp" fields={data.fields} />
    </BaseNode>
  );
});

export const FastGradientWarpNode = memo(function FastGradientWarpNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="FastGradientWarp" fields={data.fields} />
    </BaseNode>
  );
});

export const VectorWarpNode = memo(function VectorWarpNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={VECTOR_WARP_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Vector warp</div>
    </BaseNode>
  );
});

export const TerrainNode = memo(function TerrainNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Terrain density</div>
    </BaseNode>
  );
});

export const DistanceToBiomeEdgeNode = memo(function DistanceToBiomeEdgeNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Biome edge dist</div>
    </BaseNode>
  );
});

export const CellWallDistanceNode = memo(function CellWallDistanceNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale ?? data.fields.Frequency, 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const PipelineNode = memo(function PipelineNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Pipeline</div>
    </BaseNode>
  );
});

export const Cache2DNode = memo(function Cache2DNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Cache 2D</div>
    </BaseNode>
  );
});

export const PositionsCellNoiseNode = memo(function PositionsCellNoiseNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={POSITIONS_CELL_NOISE_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale ?? data.fields.Frequency, 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const Positions3DNode = memo(function Positions3DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={POSITIONS_3D_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale ?? data.fields.Frequency, 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const PositionsPinchNode = memo(function PositionsPinchNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={POSITIONS_PINCH_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Strength</span>
        <span>{safeDisplay(data.fields.Strength, 1)}</span>
      </div>
    </BaseNode>
  );
});

export const PositionsTwistNode = memo(function PositionsTwistNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={POSITIONS_TWIST_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Angle</span>
        <span>{safeDisplay(data.fields.Angle, 0)}&deg;</span>
      </div>
    </BaseNode>
  );
});
