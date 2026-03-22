import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];
const OUTPUT_ONLY_HANDLES = [densityOutput()];
const OFFSET_HANDLES = [densityInput("Input", "Input"), densityInput("Offset", "Offset"), densityOutput()];
const AMPLITUDE_HANDLES = [densityInput("Input", "Input"), densityInput("Amplitude", "Amplitude"), densityOutput()];

export const SumSelfNode = memo(function SumSelfNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Count</span>
        <span>{safeDisplay(data.fields.Count, 2)}</span>
      </div>
    </BaseNode>
  );
});

export const WeightedSumNode = memo(function WeightedSumNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "WeightedSum");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Weighted A + B</div>
    </BaseNode>
  );
});

export const ProductNode = memo(function ProductNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Product");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">A × B</div>
    </BaseNode>
  );
});

export const NegateNode = memo(function NegateNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">−x</div>
    </BaseNode>
  );
});

export const AbsNode = memo(function AbsNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">|x|</div>
    </BaseNode>
  );
});

export const SquareRootNode = memo(function SquareRootNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">√x</div>
    </BaseNode>
  );
});

export const CubeRootNode = memo(function CubeRootNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">∛x</div>
    </BaseNode>
  );
});

export const SquareNode = memo(function SquareNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">x²</div>
    </BaseNode>
  );
});

export const CubeMathNode = memo(function CubeMathNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">x³</div>
    </BaseNode>
  );
});

export const OffsetConstantNode = memo(function OffsetConstantNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="OffsetConstant" fields={data.fields} />
    </BaseNode>
  );
});

export const InverseNode = memo(function InverseNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">1/x</div>
    </BaseNode>
  );
});

export const ModuloNode = memo(function ModuloNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Divisor</span>
        <span>{safeDisplay(data.fields.Divisor, 1)}</span>
      </div>
    </BaseNode>
  );
});

export const ImportedValueNode = memo(function ImportedValueNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <SchemaFields typeKey="ImportedValue" fields={data.fields} />
    </BaseNode>
  );
});

export const AmplitudeConstantNode = memo(function AmplitudeConstantNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="AmplitudeConstant" fields={data.fields} />
    </BaseNode>
  );
});

export const PowNode = memo(function PowNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <SchemaFields typeKey="Pow" fields={data.fields} />
    </BaseNode>
  );
});

export const AmplitudeNode = memo(function AmplitudeNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={AMPLITUDE_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">A × B</div>
    </BaseNode>
  );
});

export const OffsetDensityNode = memo(function OffsetDensityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OFFSET_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">A + B</div>
    </BaseNode>
  );
});
