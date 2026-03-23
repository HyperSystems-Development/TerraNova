import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityOutput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

const SIMPLEX_NOISE_2D_HANDLES = [densityOutput()];

export const SimplexNoise2DNode = memo(function SimplexNoise2DNode(props: TypedNodeProps) {
  const data = props.data;

  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SIMPLEX_NOISE_2D_HANDLES}>
      <SchemaFields typeKey="SimplexNoise2D" fields={data.fields} />
    </BaseNode>
  );
});
