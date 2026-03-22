import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";

const CONSTANT_HANDLES = [densityOutput()];

export const ConstantNode = memo(function ConstantNode(props: TypedNodeProps) {
  const data = props.data;

  // V2 schema has "Tint" (object) field; legacy data has "Value" (number).
  // Display Value from data if present — this is what users expect.
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CONSTANT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Value</span>
        <span>{safeDisplay(data.fields.Value, 0)}</span>
      </div>
    </BaseNode>
  );
});
