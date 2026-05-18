import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityOutput, vectorInput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";

const OUTPUT_ONLY_HANDLES = [densityOutput()];
const VECTOR_INPUT_HANDLES = [vectorInput("VectorProvider", "Vector"), densityOutput()];

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const XValueNode = memo(function XValueNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">X coordinate</div>
    </BaseNode>
  );
});

export const YValueNode = memo(function YValueNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Y coordinate</div>
    </BaseNode>
  );
});

export const ZValueNode = memo(function ZValueNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Z coordinate</div>
    </BaseNode>
  );
});

export const DistanceFromOriginNode = memo(function DistanceFromOriginNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">dist(0,0,0)</div>
    </BaseNode>
  );
});

export const DistanceFromAxisNode = memo(function DistanceFromAxisNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Axis</span>
        <span>{safeDisplay(data.fields.Axis, "Y")}</span>
      </div>
    </BaseNode>
  );
});

export const DistanceFromPointNode = memo(function DistanceFromPointNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={VECTOR_INPUT_HANDLES}>
      {"Point" in data.fields && (
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Point</span>
          <span>{formatVec3(data.fields.Point)}</span>
        </div>
      )}
    </BaseNode>
  );
});

export const AngleFromOriginNode = memo(function AngleFromOriginNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">angle(0,0,0)</div>
    </BaseNode>
  );
});

export const AngleFromPointNode = memo(function AngleFromPointNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={VECTOR_INPUT_HANDLES}>
      {"Point" in data.fields && (
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Point</span>
          <span>{formatVec3(data.fields.Point)}</span>
        </div>
      )}
    </BaseNode>
  );
});

export const HeightAboveSurfaceNode = memo(function HeightAboveSurfaceNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Height above surface</div>
    </BaseNode>
  );
});

const ANGLE_HANDLES = [
  vectorInput("VectorProvider", "VectorProvider"),
  vectorInput("Vector", "Vector"),
  densityOutput(),
];

export const AngleNode = memo(function AngleNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={ANGLE_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Angle (deg)</div>
    </BaseNode>
  );
});
