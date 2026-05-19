import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput, vectorInput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";

const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];
const ROTATED_HANDLES = [densityInput("Input", "Input"), vectorInput("NewYAxis", "Y Axis"), densityOutput()];

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const CacheNode = memo(function CacheNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Cache once</div>
    </BaseNode>
  );
});

export const WrapNode = memo(function WrapNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Wrap</div>
    </BaseNode>
  );
});

export const SliderNode = memo(function SliderNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Translate</span>
        <span>{formatVec3(data.fields.Translation)}</span>
      </div>
    </BaseNode>
  );
});

export const ScaleNode = memo(function ScaleNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Scale</span>
        <span>{formatVec3(data.fields.Scale)}</span>
      </div>
    </BaseNode>
  );
});

export const RotatorNode = memo(function RotatorNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={ROTATED_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Angle</span>
        <span>{safeDisplay(data.fields.AngleDegrees, 0)}°</span>
      </div>
    </BaseNode>
  );
});

export const MirroredPositionNode = memo(function MirroredPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Axis</span>
        <span>{safeDisplay(data.fields.Axis, "X")}</span>
      </div>
    </BaseNode>
  );
});

export const QuantizedPositionNode = memo(function QuantizedPositionNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Step</span>
        <span>{safeDisplay(data.fields.StepSize, 1)}</span>
      </div>
    </BaseNode>
  );
});
