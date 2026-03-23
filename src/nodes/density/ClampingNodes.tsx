import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput } from "@/nodes/shared/handles";
import type { RangeDouble } from "@/schema/types";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];
const RANGE_CHOICE_HANDLES = [
  densityInput("Condition", "Condition"),
  densityInput("TrueInput", "True"),
  densityInput("FalseInput", "False"),
  densityOutput(),
];
const INTERPOLATE_HANDLES = [
  densityInput("InputA", "Input A"),
  densityInput("InputB", "Input B"),
  densityInput("Factor", "Factor"),
  densityOutput(),
];

function formatRange(r: unknown): string {
  if (r && typeof r === "object" && "Min" in (r as Record<string, unknown>)) {
    const range = r as RangeDouble;
    return `[${range.Min}, ${range.Max}]`;
  }
  return "\u2014";
}

export const ClampToIndexNode = memo(function ClampToIndexNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">WallB</span>
          <span>{safeDisplay(data.fields.WallB ?? data.fields.Min, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">WallA</span>
          <span>{safeDisplay(data.fields.WallA ?? data.fields.Max, 255)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const NormalizerNode = memo(function NormalizerNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: FromMin/FromMax/ToMin/ToMax. Legacy: SourceRange/TargetRange objects.
  const hasV2Fields = data.fields.FromMin != null || data.fields.FromMax != null;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      {hasV2Fields ? (
        <SchemaFields typeKey="Normalizer" fields={data.fields} />
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Source</span>
            <span>{formatRange(data.fields.SourceRange)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Target</span>
            <span>{formatRange(data.fields.TargetRange)}</span>
          </div>
        </div>
      )}
    </BaseNode>
  );
});

export const DoubleNormalizerNode = memo(function DoubleNormalizerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">SrcA</span>
          <span>{formatRange(data.fields.SourceRangeA)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">TgtA</span>
          <span>{formatRange(data.fields.TargetRangeA)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">SrcB</span>
          <span>{formatRange(data.fields.SourceRangeB)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">TgtB</span>
          <span>{formatRange(data.fields.TargetRangeB)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const RangeChoiceNode = memo(function RangeChoiceNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={RANGE_CHOICE_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Threshold</span>
        <span>{safeDisplay(data.fields.Threshold, 0.5)}</span>
      </div>
    </BaseNode>
  );
});

export const LinearTransformNode = memo(function LinearTransformNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Scale</span>
          <span>{safeDisplay(data.fields.Scale, 1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Offset</span>
          <span>{safeDisplay(data.fields.Offset, 0)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const InterpolateNode = memo(function InterpolateNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INTERPOLATE_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">lerp(A, B, t)</div>
    </BaseNode>
  );
});

export const SmoothClampNode = memo(function SmoothClampNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="SmoothClamp" fields={data.fields} />
    </BaseNode>
  );
});

export const FloorDensityNode = memo(function FloorDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">&#8970;x&#8971;</div>
    </BaseNode>
  );
});

export const CeilingDensityNode = memo(function CeilingDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">&#8968;x&#8969;</div>
    </BaseNode>
  );
});

export const SmoothFloorNode = memo(function SmoothFloorNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="SmoothFloor" fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothCeilingNode = memo(function SmoothCeilingNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="SmoothCeiling" fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothMinNode = memo(function SmoothMinNode(props: TypedNodeProps) {
  const data = props.data;
  const handles = useCompoundHandles(props.id, "SmoothMin");
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={handles}>
      <SchemaFields typeKey="SmoothMin" fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothMaxNode = memo(function SmoothMaxNode(props: TypedNodeProps) {
  const data = props.data;
  const handles = useCompoundHandles(props.id, "SmoothMax");
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={handles}>
      <SchemaFields typeKey="SmoothMax" fields={data.fields} />
    </BaseNode>
  );
});
