import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import {
  propInput,
  propOutput,
  densityInput,
  materialInput,
  patternInput,
  scannerInput,
  blockMaskInput,
  directionalityInput,
} from "@/nodes/shared/handles";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const PROP_OUTPUT_HANDLES = [propOutput()];
const DENSITY_PROP_HANDLES = [
  densityInput("DensityFunction", "Density"),
  materialInput("Material", "Material"),
  propOutput(),
];
const PREFAB_PROP_HANDLES = [
  scannerInput("Scanner", "Scanner"),
  patternInput("Pattern", "Pattern"),
  blockMaskInput("BlockMask", "Block Mask"),
  directionalityInput("Directionality", "Directionality"),
  propOutput(),
];
const CONDITIONAL_PROP_HANDLES = [
  densityInput("Condition", "Condition"),
  propInput("TrueInput", "True"),
  propInput("FalseInput", "False"),
  propOutput(),
];
const SURFACE_CAVE_PROP_HANDLES = [
  patternInput("Pattern", "Pattern"),
  scannerInput("Scanner", "Scanner"),
  propOutput(),
];
const EXPORTED_PROP_HANDLES = [propInput("Input", "Input"), propOutput()];
const CUBOID_PROP_HANDLES = [materialInput("Material", "Material"), propOutput()];
const MANUAL_PROP_HANDLES = [propOutput()];
const LOCATOR_PROP_HANDLES = [
  scannerInput("Scanner", "Scanner"),
  patternInput("Pattern", "Pattern"),
  propInput("Prop", "Prop"),
  propOutput(),
];
const MASK_PROP_HANDLES = [
  blockMaskInput("BlockMask", "Block Mask"),
  propInput("Prop", "Prop"),
  propOutput(),
];
const RANDOM_ROTATOR_PROP_HANDLES = [propInput("Prop", "Prop"), propOutput()];
const STATIC_ROTATOR_PROP_HANDLES = [propInput("Prop", "Prop"), propOutput()];
const ORIENTER_PROP_HANDLES = [
  patternInput("Pattern", "Pattern"),
  propInput("Prop", "Prop"),
  propOutput(),
];
const DENSITY_SELECTOR_PROP_HANDLES = [
  densityInput("Density", "Density"),
  propInput("Props[0]", "Prop 0"),
  propInput("Props[1]", "Prop 1"),
  propOutput(),
];
const UNIQUE_PREFAB_PROP_HANDLES = [
  scannerInput("Scanner", "Scanner"),
  blockMaskInput("BlockMask", "Block Mask"),
  directionalityInput("Directionality", "Direction"),
  propOutput(),
];

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const BoxPropNode = memo(function BoxPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={PROP_OUTPUT_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Size</span>
          <span>{formatVec3(data.fields.Size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Material</span>
          <span className="truncate max-w-[100px]">{safeDisplay(data.fields.Material, "stone")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ColumnPropNode = memo(function ColumnPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={PROP_OUTPUT_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Height</span>
          <span>{safeDisplay(data.fields.Height, 4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Material</span>
          <span className="truncate max-w-[100px]">{safeDisplay(data.fields.Material, "stone")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ClusterPropNode = memo(function ClusterPropNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Prop:Cluster");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Cluster</div>
    </BaseNode>
  );
});

export const DensityPropNode = memo(function DensityPropNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={DENSITY_PROP_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Density prop</div>
    </BaseNode>
  );
});

export const PrefabPropNode = memo(function PrefabPropNode(props: TypedNodeProps) {
  const data = props.data;
  const weightedPaths = data.fields.WeightedPrefabPaths as Array<{ Path: string; Weight: number }> | undefined;
  const moldDir = data.fields.MoldingDirection as string | undefined;
  const moldChildren = data.fields.MoldingChildren as boolean | undefined;
  const loadEntities = data.fields.LoadEntities as boolean | undefined;

  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={PREFAB_PROP_HANDLES}
    >
      <div className="space-y-1">
        {weightedPaths && weightedPaths.length > 0 ? (
          weightedPaths.slice(0, 3).map((entry, i) => (
            <div key={i} className="flex justify-between text-[10px]">
              <span className="truncate max-w-[100px] text-tn-text-muted">
                {entry.Path ? entry.Path.split("/").pop() : "(empty)"}
              </span>
              <span className="text-tn-text-muted">w:{entry.Weight}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Path</span>
            <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Path, "")}</span>
          </div>
        )}
        {weightedPaths && weightedPaths.length > 3 && (
          <div className="text-[10px] text-tn-text-muted">+{weightedPaths.length - 3} more</div>
        )}
        {moldDir && moldDir !== "NONE" && (
          <div className="flex justify-between text-[10px]">
            <span className="text-tn-text-muted">Mold</span>
            <span>{moldDir}{moldChildren ? " +children" : ""}</span>
          </div>
        )}
        {loadEntities === false && (
          <div className="text-[10px] text-yellow-400/70">Entities disabled</div>
        )}
      </div>
    </BaseNode>
  );
});

export const ConditionalPropNode = memo(function ConditionalPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={CONDITIONAL_PROP_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Threshold</span>
        <span>{safeDisplay(data.fields.Threshold, 0.5)}</span>
      </div>
    </BaseNode>
  );
});

export const WeightedRandomPropNode = memo(function WeightedRandomPropNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Prop:WeightedRandom");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Weighted random</div>
    </BaseNode>
  );
});

export const SurfacePropNode = memo(function SurfacePropNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={SURFACE_CAVE_PROP_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Surface prop</div>
    </BaseNode>
  );
});

export const CavePropNode = memo(function CavePropNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={SURFACE_CAVE_PROP_HANDLES}
    >
      <div className="text-tn-text-muted text-center py-1">Cave prop</div>
    </BaseNode>
  );
});

export const ImportedPropNode = memo(function ImportedPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={PROP_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

export const ExportedPropNode = memo(function ExportedPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={EXPORTED_PROP_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});

export const UnionPropNode = memo(function UnionPropNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Prop:Union");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Union</div>
    </BaseNode>
  );
});

export const WeightedPropNode = memo(function WeightedPropNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Prop:Weighted");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Weighted</div>
    </BaseNode>
  );
});

export const CuboidPropNode = memo(function CuboidPropNode(props: TypedNodeProps) {
  const data = props.data;
  const bounds = data.fields.Bounds as { PointA?: number[]; PointB?: number[] } | undefined;
  const ptA = bounds?.PointA ?? [0, 0, 0];
  const ptB = bounds?.PointB ?? [1, 1, 1];
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={CUBOID_PROP_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Point A</span>
          <span>({ptA.join(", ")})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Point B</span>
          <span>({ptB.join(", ")})</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ManualPropNode = memo(function ManualPropNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={MANUAL_PROP_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Explicit block list</div>
    </BaseNode>
  );
});

export const LocatorPropNode = memo(function LocatorPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={LOCATOR_PROP_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Placement Cap</span>
        <span>{safeDisplay(data.fields.PlacementCap, 1)}</span>
      </div>
    </BaseNode>
  );
});

export const MaskPropNode = memo(function MaskPropNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={MASK_PROP_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Block mask wrapper</div>
    </BaseNode>
  );
});

export const RandomRotatorPropNode = memo(function RandomRotatorPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={RANDOM_ROTATOR_PROP_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Horizontal</span>
          <span>{data.fields.HorizontalRotations ? "Yes" : "No"}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const StaticRotatorPropNode = memo(function StaticRotatorPropNode(props: TypedNodeProps) {
  const data = props.data;
  const rotation = data.fields.Rotation as { Yaw?: string; Pitch?: string; Roll?: string } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={STATIC_ROTATOR_PROP_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Yaw</span>
          <span>{safeDisplay(rotation?.Yaw, "None")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Pitch</span>
          <span>{safeDisplay(rotation?.Pitch, "None")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Roll</span>
          <span>{safeDisplay(rotation?.Roll, "None")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const OrienterPropNode = memo(function OrienterPropNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={ORIENTER_PROP_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Seed</span>
        <span>{safeDisplay(data.fields.Seed, "A")}</span>
      </div>
    </BaseNode>
  );
});

export const DensitySelectorPropNode = memo(function DensitySelectorPropNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Prop} handles={DENSITY_SELECTOR_PROP_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Density-driven prop selection</div>
    </BaseNode>
  );
});

export const UniquePrefabPropNode = memo(function UniquePrefabPropNode(props: TypedNodeProps) {
  const data = props.data;
  const weightedPaths = data.fields.WeightedPrefabPaths as Array<{ Path: string; Weight: number }> | undefined;
  const uniqueScope = data.fields.UniqueScope as string | undefined;
  const loadEntities = data.fields.LoadEntities as boolean | undefined;

  return (
    <BaseNode
      {...props}
      category={AssetCategory.Prop}
      handles={UNIQUE_PREFAB_PROP_HANDLES}
    >
      <div className="space-y-1">
        {weightedPaths && weightedPaths.length > 0 ? (
          weightedPaths.slice(0, 3).map((entry, i) => (
            <div key={i} className="flex justify-between text-[10px]">
              <span className="truncate max-w-[100px] text-tn-text-muted">
                {entry.Path ? entry.Path.split("/").pop() : "(empty)"}
              </span>
              <span className="text-tn-text-muted">w:{entry.Weight}</span>
            </div>
          ))
        ) : (
          <div className="text-tn-text-muted text-center">No paths</div>
        )}
        {weightedPaths && weightedPaths.length > 3 && (
          <div className="text-[10px] text-tn-text-muted">+{weightedPaths.length - 3} more</div>
        )}
        {uniqueScope && (
          <div className="flex justify-between text-[10px]">
            <span className="text-tn-text-muted">Scope</span>
            <span>{uniqueScope}</span>
          </div>
        )}
        {loadEntities === false && (
          <div className="text-[10px] text-yellow-400/70">Entities disabled</div>
        )}
      </div>
    </BaseNode>
  );
});
