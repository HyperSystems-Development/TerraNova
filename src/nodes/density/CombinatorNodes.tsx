import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput } from "@/nodes/shared/handles";
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

export const MixNode = memo(function MixNode(props: TypedNodeProps) {
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

export const MinNode = memo(function MinNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Min");
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

export const MaxNode = memo(function MaxNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Max");
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
