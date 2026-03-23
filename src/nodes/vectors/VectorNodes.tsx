import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { vectorInput, vectorOutput, densityInput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const VECTOR_OUTPUT_HANDLES = [vectorOutput()];
const DENSITY_GRADIENT_VECTOR_HANDLES = [densityInput("DensityFunction", "Density"), vectorOutput()];
const CACHE_VECTOR_HANDLES = [vectorInput("VectorProvider", "Vector"), vectorOutput()];
const EXPORTED_VECTOR_HANDLES = [vectorInput("Input", "Input"), vectorOutput()];

export const ConstantVectorNode = memo(function ConstantVectorNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.VectorProvider} handles={VECTOR_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const DensityGradientVectorNode = memo(function DensityGradientVectorNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.VectorProvider}
      handles={DENSITY_GRADIENT_VECTOR_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Density gradient</div>
    </BaseNode>
  );
});

export const CacheVectorNode = memo(function CacheVectorNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.VectorProvider}
      handles={CACHE_VECTOR_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Cache</div>
    </BaseNode>
  );
});

export const ExportedVectorNode = memo(function ExportedVectorNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.VectorProvider}
      handles={EXPORTED_VECTOR_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ImportedVectorNode = memo(function ImportedVectorNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.VectorProvider} handles={VECTOR_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});
