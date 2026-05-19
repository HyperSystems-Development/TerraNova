import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput, curveInput } from "@/nodes/shared/handles";

const CURVE_FUNCTION_HANDLES = [densityInput("Input", "Input"), curveInput("Curve", "Curve"), densityOutput()];
const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];

export const CurveMapperNode = memo(function CurveMapperNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={CURVE_FUNCTION_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">f(x) via curve</div>
    </BaseNode>
  );
});

export const SplineFunctionNode = memo(function SplineFunctionNode(props: TypedNodeProps) {
  const data = props.data;
  const points = data.fields.Points;
  const count = Array.isArray(points) ? points.length : 0;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Points</span>
        <span>{count}</span>
      </div>
    </BaseNode>
  );
});

export const FlatCacheNode = memo(function FlatCacheNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={INPUT_OUTPUT_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Flat cache</div>
    </BaseNode>
  );
});
