import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import {
  environmentOutput,
  environmentInput,
  tintOutput,
  tintInput,
  blockMaskOutput,
  directionalityOutput,
  patternInput,
  densityInput,
} from "@/nodes/shared/handles";

/* ── Hoisted static handle arrays ──────────────────────────────────── */

const HANDLES_ENV_OUT = [environmentOutput()];

const HANDLES_ENV_IN_OUT = [environmentInput("Input", "Input"), environmentOutput()];

const HANDLES_TINT_OUT = [tintOutput()];

const HANDLES_TINT_IN_OUT = [tintInput("Input", "Input"), tintOutput()];

const HANDLES_BLOCKMASK_OUT = [blockMaskOutput()];

const HANDLES_DIR_OUT = [directionalityOutput()];
const HANDLES_DENSITY_DELIMITED_ENV = [densityInput("Density", "Density"), environmentOutput()];
const HANDLES_DENSITY_DELIMITED_TINT = [densityInput("Density", "Density"), tintOutput()];
const HANDLES_DIR_PATTERN = [patternInput("Pattern", "Pattern"), directionalityOutput()];

// ── Environment Provider ───────────────────────────────────────────────

export const DefaultEnvironmentNode = memo(function DefaultEnvironmentNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.EnvironmentProvider} handles={HANDLES_ENV_OUT}>
      <div className="text-tn-text-muted text-center py-1">Default environment</div>
    </BaseNode>
  );
});

export const BiomeEnvironmentNode = memo(function BiomeEnvironmentNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.EnvironmentProvider} handles={HANDLES_ENV_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Biome</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.BiomeId, "")}</span>
      </div>
    </BaseNode>
  );
});

export const ImportedEnvironmentNode = memo(function ImportedEnvironmentNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.EnvironmentProvider} handles={HANDLES_ENV_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

export const ExportedEnvironmentNode = memo(function ExportedEnvironmentNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.EnvironmentProvider}
      handles={HANDLES_ENV_IN_OUT}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

// ── Tint Provider ──────────────────────────────────────────────────────

export const ConstantTintNode = memo(function ConstantTintNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.TintProvider} handles={HANDLES_TINT_OUT}>
      <div className="flex justify-between items-center">
        <span className="text-tn-text-muted">Color</span>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-sm border border-tn-border"
            style={{ backgroundColor: data.fields.Color ?? "#ffffff" }}
          />
          <span>{safeDisplay(data.fields.Color, "#ffffff")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const GradientTintNode = memo(function GradientTintNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.TintProvider} handles={HANDLES_TINT_OUT}>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-tn-text-muted">From</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm border border-tn-border"
              style={{ backgroundColor: data.fields.From ?? "#ffffff" }}
            />
            <span>{safeDisplay(data.fields.From, "#ffffff")}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-tn-text-muted">To</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm border border-tn-border"
              style={{ backgroundColor: data.fields.To ?? "#000000" }}
            />
            <span>{safeDisplay(data.fields.To, "#000000")}</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

export const ImportedTintNode = memo(function ImportedTintNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.TintProvider} handles={HANDLES_TINT_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

export const ExportedTintNode = memo(function ExportedTintNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.TintProvider}
      handles={HANDLES_TINT_IN_OUT}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

// ── Block Mask ─────────────────────────────────────────────────────────

export const AllBlockMaskNode = memo(function AllBlockMaskNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.BlockMask} handles={HANDLES_BLOCKMASK_OUT}>
      <div className="text-tn-text-muted text-center py-1">All blocks</div>
    </BaseNode>
  );
});

export const NoneBlockMaskNode = memo(function NoneBlockMaskNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.BlockMask} handles={HANDLES_BLOCKMASK_OUT}>
      <div className="text-tn-text-muted text-center py-1">No blocks</div>
    </BaseNode>
  );
});

export const SingleBlockMaskNode = memo(function SingleBlockMaskNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.BlockMask} handles={HANDLES_BLOCKMASK_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Block</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.BlockType, "stone")}</span>
      </div>
    </BaseNode>
  );
});

export const SetBlockMaskNode = memo(function SetBlockMaskNode(props: TypedNodeProps) {
  const data = props.data;
  const types = data.fields.BlockTypes;
  const count = Array.isArray(types) ? types.length : 0;
  return (
    <BaseNode {...props} category={AssetCategory.BlockMask} handles={HANDLES_BLOCKMASK_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Types</span>
        <span>{count}</span>
      </div>
    </BaseNode>
  );
});

export const ImportedBlockMaskNode = memo(function ImportedBlockMaskNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.BlockMask} handles={HANDLES_BLOCKMASK_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

// ── Directionality ─────────────────────────────────────────────────────

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const UniformDirectionalityNode = memo(function UniformDirectionalityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_OUT}>
      <div className="text-tn-text-muted text-center py-1">Uniform</div>
    </BaseNode>
  );
});

export const DirectionalDirectionalityNode = memo(function DirectionalDirectionalityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Dir</span>
        <span>{formatVec3(data.fields.Direction)}</span>
      </div>
    </BaseNode>
  );
});

export const NormalDirectionalityNode = memo(function NormalDirectionalityNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_OUT}>
      <div className="text-tn-text-muted text-center py-1">Normal</div>
    </BaseNode>
  );
});

export const StaticDirectionalityNode = memo(function StaticDirectionalityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_PATTERN}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Rotation</span>
        <span>{safeDisplay(data.fields.Rotation, 0)}°</span>
      </div>
    </BaseNode>
  );
});

export const ImportedDirectionalityNode = memo(function ImportedDirectionalityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

// ── New pre-release types ─────────────────────────────────────────────

export const ConstantEnvironmentNode = memo(function ConstantEnvironmentNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.EnvironmentProvider} handles={HANDLES_ENV_OUT}>
      <div className="text-tn-text-muted text-center py-1">Constant environment</div>
    </BaseNode>
  );
});

export const DensityDelimitedEnvironmentNode = memo(function DensityDelimitedEnvironmentNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.EnvironmentProvider} handles={HANDLES_DENSITY_DELIMITED_ENV}>
      <div className="text-tn-text-muted text-center py-1">Density-delimited</div>
    </BaseNode>
  );
});

export const DensityDelimitedTintNode = memo(function DensityDelimitedTintNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.TintProvider} handles={HANDLES_DENSITY_DELIMITED_TINT}>
      <div className="text-tn-text-muted text-center py-1">Density-delimited</div>
    </BaseNode>
  );
});

export const RandomDirectionalityNode = memo(function RandomDirectionalityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Seed</span>
        <span>{safeDisplay(data.fields.Seed, "A")}</span>
      </div>
    </BaseNode>
  );
});

export const PatternDirectionalityNode = memo(function PatternDirectionalityNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Directionality} handles={HANDLES_DIR_PATTERN}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Direction</span>
          <span>{safeDisplay(data.fields.InitialDirection, "NORTH")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
      </div>
    </BaseNode>
  );
});
