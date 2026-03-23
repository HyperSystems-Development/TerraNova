import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { patternInput, patternOutput, densityInput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const PATTERN_PASSTHROUGH_HANDLES = [patternInput("SubPattern", "Pattern"), patternOutput()];
const PATTERN_OUTPUT_HANDLES = [patternOutput()];
const PATTERN_FIELD_FUNCTION_HANDLES = [densityInput("FieldFunction", "Field Fn"), patternOutput()];
const SURFACE_PATTERN_HANDLES = [
  patternInput("Floor", "Floor"),
  patternInput("Ceiling", "Ceiling"),
  patternOutput(),
];
const CONDITIONAL_PATTERN_HANDLES = [
  densityInput("Condition", "Condition"),
  patternInput("TrueInput", "True"),
  patternInput("FalseInput", "False"),
  patternOutput(),
];
const BLEND_PATTERN_HANDLES = [
  patternInput("InputA", "Input A"),
  patternInput("InputB", "Input B"),
  densityInput("Factor", "Factor"),
  patternOutput(),
];
const EXPORTED_PATTERN_HANDLES = [patternInput("Input", "Input"), patternOutput()];

export const FloorPatternNode = memo(function FloorPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={PATTERN_PASSTHROUGH_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const CeilingPatternNode = memo(function CeilingPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={PATTERN_PASSTHROUGH_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const WallPatternNode = memo(function WallPatternNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={PATTERN_PASSTHROUGH_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Wall pattern</div>
    </BaseNode>
  );
});

export const SurfacePatternNode = memo(function SurfacePatternNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={SURFACE_PATTERN_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Surface</div>
    </BaseNode>
  );
});

export const BlockTypePatternNode = memo(function BlockTypePatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const BlockSetPatternNode = memo(function BlockSetPatternNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Pattern:BlockSet");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Block set</div>
    </BaseNode>
  );
});

export const CuboidPatternNode = memo(function CuboidPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const OffsetPatternNode = memo(function OffsetPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={PATTERN_PASSTHROUGH_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ConditionalPatternNode = memo(function ConditionalPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={CONDITIONAL_PATTERN_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const BlendPatternNode = memo(function BlendPatternNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={BLEND_PATTERN_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Blend A↔B</div>
    </BaseNode>
  );
});

export const UnionPatternNode = memo(function UnionPatternNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Pattern:Union");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Union</div>
    </BaseNode>
  );
});

export const IntersectionPatternNode = memo(function IntersectionPatternNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Pattern:Intersection");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Intersection</div>
    </BaseNode>
  );
});

export const ImportedPatternNode = memo(function ImportedPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ExportedPatternNode = memo(function ExportedPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={EXPORTED_PATTERN_HANDLES}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ConstantPatternNode = memo(function ConstantPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const FieldFunctionPatternNode = memo(function FieldFunctionPatternNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_FIELD_FUNCTION_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Field function</div>
    </BaseNode>
  );
});

export const AndPatternNode = memo(function AndPatternNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Pattern:And");
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={handles}>
      <div className="text-tn-text-muted text-center py-1">AND</div>
    </BaseNode>
  );
});

export const OrPatternNode = memo(function OrPatternNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Pattern:Or");
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={handles}>
      <div className="text-tn-text-muted text-center py-1">OR</div>
    </BaseNode>
  );
});

export const NotPatternNode = memo(function NotPatternNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_PASSTHROUGH_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">NOT</div>
    </BaseNode>
  );
});
