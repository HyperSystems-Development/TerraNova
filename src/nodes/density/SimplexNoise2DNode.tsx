import { memo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { densityOutput } from "@/nodes/shared/handles";
import { safeDisplay } from "@/nodes/shared/displayUtils";

const SIMPLEX_NOISE_2D_HANDLES = [densityOutput()];

export const SimplexNoise2DNode = memo(function SimplexNoise2DNode(props: TypedNodeProps) {
  const data = props.data;

  // Handle both internal (Frequency) and Hytale (Scale) field names
  const freq = data.fields.Frequency ?? (data.fields.Scale != null ? 1 / (data.fields.Scale as number) : 0.01);
  // Persistence is a separate field (Gain), not an alias for Amplitude
  const amp = data.fields.Amplitude ?? 1.0;

  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SIMPLEX_NOISE_2D_HANDLES}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Freq</span>
          <span>{safeDisplay(freq, 0.01)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Amp</span>
          <span>{safeDisplay(amp, 1.0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Seed</span>
          <span>{safeDisplay(data.fields.Seed, 0)}</span>
        </div>
      </div>
    </BaseNode>
  );
});
