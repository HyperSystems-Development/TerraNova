import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

const CLAMP_HANDLES = [densityInput("Input", "Input"), densityOutput()];

export const ClampNode = memo(function ClampNode(props: TypedNodeProps) {
  const data = props.data;

  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
      handles={CLAMP_HANDLES}
    >
      <SchemaFields typeKey="Clamp" fields={data.fields} />
    </BaseNode>
  );
});
