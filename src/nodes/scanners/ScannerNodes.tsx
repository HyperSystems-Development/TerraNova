import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import type { RangeDouble } from "@/schema/types";
import { scannerInput, scannerOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const SCANNER_OUTPUT_HANDLES = [scannerOutput()];
const AREA_SCANNER_HANDLES = [scannerInput("ChildScanner", "Child"), scannerOutput()];

function formatRange(r: unknown): string {
  if (r && typeof r === "object" && "Min" in (r as Record<string, unknown>)) {
    const range = r as RangeDouble;
    return `[${range.Min}, ${range.Max}]`;
  }
  return "—";
}

function formatVec3(v: unknown): string {
  if (v && typeof v === "object" && "x" in (v as Record<string, unknown>)) {
    const vec = v as { x: number; y: number; z: number };
    return `(${vec.x}, ${vec.y}, ${vec.z})`;
  }
  return "—";
}

export const OriginScannerNode = memo(function OriginScannerNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={SCANNER_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Origin scanner</div>
    </BaseNode>
  );
});

export const ColumnLinearScannerNode = memo(function ColumnLinearScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={SCANNER_OUTPUT_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Step</span>
          <span>{safeDisplay(data.fields.StepSize, 1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Range</span>
          <span>{formatRange(data.fields.Range)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ColumnRandomScannerNode = memo(function ColumnRandomScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={SCANNER_OUTPUT_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Count</span>
          <span>{safeDisplay(data.fields.Count, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Range</span>
          <span>{formatRange(data.fields.Range)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const AreaScannerNode = memo(function AreaScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Scanner}
      handles={AREA_SCANNER_HANDLES}
    >
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Size</span>
        <span>{formatVec3(data.fields.Size)}</span>
      </div>
    </BaseNode>
  );
});

// ── New V2 scanner types ────────────────────────────────────────────────
const CHILD_SCANNER_HANDLES = [scannerInput("Scanner", "Child"), scannerOutput()];
const QUEUE_SCANNER_HANDLES = [scannerInput("Scanners[0]", "Scanner 0"), scannerInput("Scanners[1]", "Scanner 1"), scannerOutput()];
const DIRECT_SCANNER_HANDLES = [scannerOutput()];

export const LinearScannerNode = memo(function LinearScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={CHILD_SCANNER_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Axis</span>
          <span>{safeDisplay(data.fields.Axis, "Y")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Range</span>
          <span>{formatRange(data.fields.Range)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Ascending</span>
          <span>{data.fields.AscendingOrder !== false ? "Yes" : "No"}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const RandomScannerNode = memo(function RandomScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={CHILD_SCANNER_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Axis</span>
          <span>{safeDisplay(data.fields.Axis, "Y")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Range</span>
          <span>{formatRange(data.fields.Range)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, "A")}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const RadialScannerNode = memo(function RadialScannerNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={CHILD_SCANNER_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">3D radial search</div>
    </BaseNode>
  );
});

export const QueueScannerNode = memo(function QueueScannerNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={QUEUE_SCANNER_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Sequential multi-scanner</div>
    </BaseNode>
  );
});

export const DirectScannerNode = memo(function DirectScannerNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={DIRECT_SCANNER_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Identity scanner</div>
    </BaseNode>
  );
});

export const ImportedScannerNode = memo(function ImportedScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={SCANNER_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Name</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
      </div>
    </BaseNode>
  );
});
