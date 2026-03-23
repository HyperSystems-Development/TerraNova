import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { scannerInput, scannerOutput } from "@/nodes/shared/handles";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

// ── Hoisted handle arrays ───────────────────────────────────────────────
const SCANNER_OUTPUT_HANDLES = [scannerOutput()];
const AREA_SCANNER_HANDLES = [scannerInput("ChildScanner", "Child"), scannerOutput()];

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
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ColumnRandomScannerNode = memo(function ColumnRandomScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={SCANNER_OUTPUT_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
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
      <SchemaFields typeKey={data.type} fields={data.fields} />
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
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const RandomScannerNode = memo(function RandomScannerNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Scanner} handles={CHILD_SCANNER_HANDLES}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
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
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});
