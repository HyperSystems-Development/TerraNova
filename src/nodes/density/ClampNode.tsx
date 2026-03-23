import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

export const ClampNode = memo(function ClampNode(props: TypedNodeProps) {
  const data = props.data;

  return (
    <BaseNode
      {...props}
      category={AssetCategory.Density}
    >
      <SchemaFields typeKey="Clamp" fields={data.fields} />
    </BaseNode>
  );
});
