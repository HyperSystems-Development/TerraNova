import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput, curveInput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

const CONDITIONAL_HANDLES = [
  densityInput("Condition", "Condition"),
  densityInput("TrueInput", "True"),
  densityInput("FalseInput", "False"),
  densityOutput(),
];
const BLEND_HANDLES = [
  densityInput("InputA", "Input A"),
  densityInput("InputB", "Input B"),
  densityInput("Factor", "Factor"),
  densityOutput(),
];
const BLEND_CURVE_HANDLES = [
  densityInput("InputA", "Input A"),
  densityInput("InputB", "Input B"),
  densityInput("Factor", "Factor"),
  curveInput("Curve", "Curve"),
  densityOutput(),
];

export const ConditionalNode = memo(function ConditionalNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={CONDITIONAL_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Threshold</span>
        <span>{safeDisplay(data.fields.Threshold, 0)}</span>
      </div>
    </BaseNode>
  );
});

export const SwitchNode = memo(function SwitchNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Switch");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Switch</div>
    </BaseNode>
  );
});

export const BlendNode = memo(function BlendNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={BLEND_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Blend A↔B</div>
    </BaseNode>
  );
});

export const BlendCurveNode = memo(function BlendCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={BLEND_CURVE_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Blend via curve</div>
    </BaseNode>
  );
});

export const MinFunctionNode = memo(function MinFunctionNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "MinFunction");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">min(A, B)</div>
    </BaseNode>
  );
});

export const MaxFunctionNode = memo(function MaxFunctionNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "MaxFunction");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">max(A, B)</div>
    </BaseNode>
  );
});

export const AverageFunctionNode = memo(function AverageFunctionNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "AverageFunction");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">avg(A, B)</div>
    </BaseNode>
  );
});

export const MultiMixNode = memo(function MultiMixNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "MultiMix");
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={handles}>
      <div className="text-tn-text-muted text-center py-1">Multi mix</div>
    </BaseNode>
  );
});
