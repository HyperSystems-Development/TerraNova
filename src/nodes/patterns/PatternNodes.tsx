import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { patternInput, patternOutput, densityInput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const PATTERN_PASSTHROUGH_HANDLES = [patternInput("SubPattern", "Pattern"), patternOutput()];
const PATTERN_OUTPUT_HANDLES = [patternOutput()];
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

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const FloorPatternNode = memo(function FloorPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Pattern}
      handles={PATTERN_PASSTHROUGH_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Depth</span>
        <span>{safeDisplay(data.fields.Depth, 1)}</span>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Depth</span>
        <span>{safeDisplay(data.fields.Depth, 1)}</span>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Material</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Material, "stone")}</span>
      </div>
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
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Min</span>
          <span>{formatVec3(data.fields.Min)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Max</span>
          <span>{formatVec3(data.fields.Max)}</span>
        </div>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Offset</span>
        <span>{formatVec3(data.fields.Offset)}</span>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Threshold</span>
        <span>{safeDisplay(data.fields.Threshold, 0.5)}</span>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
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
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

export const ConstantPatternNode = memo(function ConstantPatternNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Pattern} handles={PATTERN_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Value</span>
        <span>{data.fields.Value === false ? "false" : "true"}</span>
      </div>
    </BaseNode>
  );
});
