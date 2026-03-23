import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

const OUTPUT_ONLY_HANDLES = [densityOutput()];

/**
 * Fallback body for legacy noise types not in the bundle.
 * Displays common noise fields from the node's data.
 */
function LegacyNoiseBody({ fields }: { fields: Record<string, unknown> }) {
  const entries: Array<[string, string, unknown]> = [
    ["Scale", "Scale", fields.Scale ?? fields.Frequency],
    ["Octaves", "Oct", fields.Octaves],
    ["Lacunarity", "Lac", fields.Lacunarity],
    ["Persistence", "Pers", fields.Persistence ?? fields.Gain],
    ["Seed", "Seed", fields.Seed],
  ];
  const visible = entries.filter(([, , v]) => v != null);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1">
      {visible.map(([key, label, value]) => (
        <div key={key} className="flex justify-between">
          <span className="text-tn-text-muted">{label}</span>
          <span>{safeDisplay(value)}</span>
        </div>
      ))}
    </div>
  );
}

export const SimplexNoise3DNode = memo(function SimplexNoise3DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <SchemaFields typeKey="SimplexNoise3D" fields={data.fields} />
    </BaseNode>
  );
});

export const SimplexRidgeNoise2DNode = memo(function SimplexRidgeNoise2DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <LegacyNoiseBody fields={data.fields} />
    </BaseNode>
  );
});

export const SimplexRidgeNoise3DNode = memo(function SimplexRidgeNoise3DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <LegacyNoiseBody fields={data.fields} />
    </BaseNode>
  );
});

export const VoronoiNoise2DNode = memo(function VoronoiNoise2DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <LegacyNoiseBody fields={data.fields} />
    </BaseNode>
  );
});

export const VoronoiNoise3DNode = memo(function VoronoiNoise3DNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <LegacyNoiseBody fields={data.fields} />
    </BaseNode>
  );
});
