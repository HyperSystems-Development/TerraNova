import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { positionInput, positionOutput, densityInput, vectorInput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const POSITION_OUTPUT_HANDLES = [positionOutput()];
const POSITION_PASSTHROUGH_HANDLES = [positionInput("PositionProvider", "Positions"), positionOutput()];
const SCALER_HANDLES = [positionInput("Positions", "Positions"), vectorInput("Scale", "Scale"), positionOutput()];
const JITTER_HANDLES = [positionInput("Positions", "Positions"), positionOutput()];
const CLUSTERS_HANDLES = [positionInput("Distributor", "Distributor"), positionInput("Cluster", "Cluster"), positionOutput()];
const FIELD_FUNCTION_POSITION_HANDLES = [
  densityInput("FieldFunction", "Field Fn"),
  positionInput("PositionProvider", "Positions"),
  positionOutput(),
];
const CONDITIONAL_POSITION_HANDLES = [
  densityInput("Condition", "Condition"),
  positionInput("TrueInput", "True"),
  positionInput("FalseInput", "False"),
  positionOutput(),
];
const DENSITY_BASED_POSITION_HANDLES = [densityInput("DensityFunction", "Density"), positionOutput()];
const EXPORTED_POSITION_HANDLES = [positionInput("Input", "Input"), positionOutput()];

export const ListPositionNode = memo(function ListPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const Mesh2DPositionNode = memo(function Mesh2DPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const Mesh3DPositionNode = memo(function Mesh3DPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const FieldFunctionPositionNode = memo(function FieldFunctionPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={FIELD_FUNCTION_POSITION_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const OccurrencePositionNode = memo(function OccurrencePositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={FIELD_FUNCTION_POSITION_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const OffsetPositionNode = memo(function OffsetPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={POSITION_PASSTHROUGH_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const UnionPositionNode = memo(function UnionPositionNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Position:Union");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Union</div>
    </BaseNode>
  );
});

export const SimpleHorizontalPositionNode = memo(function SimpleHorizontalPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_PASSTHROUGH_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const CachePositionNode = memo(function CachePositionNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={POSITION_PASSTHROUGH_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Cache</div>
    </BaseNode>
  );
});

export const ConditionalPositionNode = memo(function ConditionalPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={CONDITIONAL_POSITION_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const DensityBasedPositionNode = memo(function DensityBasedPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={DENSITY_BASED_POSITION_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const SurfaceProjectionPositionNode = memo(function SurfaceProjectionPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={POSITION_PASSTHROUGH_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Surface projection</div>
    </BaseNode>
  );
});

export const ImportedPositionNode = memo(function ImportedPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ExportedPositionNode = memo(function ExportedPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.PositionProvider}
      handles={EXPORTED_POSITION_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

// ── New V2 position providers ───────────────────────────────────────────

export const SquareGrid2dPositionNode = memo(function SquareGrid2dPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Square grid (2D)</div>
    </BaseNode>
  );
});

export const SquareGrid3dPositionNode = memo(function SquareGrid3dPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Square grid (3D)</div>
    </BaseNode>
  );
});

export const TriangularGrid2dPositionNode = memo(function TriangularGrid2dPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Triangular grid (2D)</div>
    </BaseNode>
  );
});

export const EmptyPositionNode = memo(function EmptyPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Empty</div>
    </BaseNode>
  );
});

export const ScalerPositionNode = memo(function ScalerPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={SCALER_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const Jitter2dPositionNode = memo(function Jitter2dPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={JITTER_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const Jitter3dPositionNode = memo(function Jitter3dPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={JITTER_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ClustersPositionNode = memo(function ClustersPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={CLUSTERS_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const FrameworkPositionNode = memo(function FrameworkPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const BaseHeightPositionNode = memo(function BaseHeightPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_PASSTHROUGH_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const AnchorPositionNode = memo(function AnchorPositionNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_PASSTHROUGH_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Anchor</div>
    </BaseNode>
  );
});

export const BoundPositionNode = memo(function BoundPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.PositionProvider} handles={POSITION_PASSTHROUGH_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});
