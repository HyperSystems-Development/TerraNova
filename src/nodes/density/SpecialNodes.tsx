import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityInput, densityOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";
import { SchemaFields } from "@/nodes/shared/SchemaFields";

const INPUT_OUTPUT_HANDLES = [densityInput("Input", "Input"), densityOutput()];
const OUTPUT_ONLY_HANDLES = [densityOutput()];

export const DebugNode = memo(function DebugNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Label</span>
        <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Label, "")}</span>
      </div>
    </BaseNode>
  );
});

export const YGradientNode = memo(function YGradientNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">From Y</span>
          <span>{safeDisplay(data.fields.FromY, 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">To Y</span>
          <span>{safeDisplay(data.fields.ToY, 256)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const PassthroughNode = memo(function PassthroughNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Pass-through</div>
    </BaseNode>
  );
});

export const ZeroNode = memo(function ZeroNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-center py-1 font-mono">= 0</div>
    </BaseNode>
  );
});

export const OneNode = memo(function OneNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={OUTPUT_ONLY_HANDLES}>
      <div className="text-center py-1 font-mono">= 1</div>
    </BaseNode>
  );
});

export const ExportedDensityNode = memo(function ExportedDensityNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: SingleInstance (boolean), VectorProvider (asset ref).
  // Legacy: Name (string), SingleInstance (boolean).
  // Show Name if present (legacy), else use SchemaFields for V2 data.
  const hasName = data.fields.Name != null;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={INPUT_OUTPUT_HANDLES}>
      {hasName ? (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-tn-text-muted">Name</span>
            <span className="truncate max-w-[120px]">{safeDisplay(data.fields.Name, "")}</span>
          </div>
          {data.fields.SingleInstance && (
            <div className="text-[10px] text-tn-text-muted">Single instance</div>
          )}
        </div>
      ) : (
        <SchemaFields typeKey="Exported" fields={data.fields} />
      )}
    </BaseNode>
  );
});
