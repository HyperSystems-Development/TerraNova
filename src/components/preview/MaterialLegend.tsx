import type { VoxelMaterial } from "@/utils/voxelExtractor";

function RoughnessBar({ value }: { value: number }) {
  return (
    <div className="relative w-8 h-1 rounded-full bg-white/10 overflow-hidden" title={`Roughness: ${Math.round(value * 100)}%`}>
      <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

export function MaterialLegend({ materials }: { materials: VoxelMaterial[] }) {
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 px-2 py-1.5 bg-tn-panel/90 border border-tn-border rounded max-h-[60vh] overflow-y-auto">
      <span className="text-[9px] text-tn-text-muted font-medium">Materials</span>
      {materials.map((mat, i) => {
        const roughness = mat.roughness ?? 0.8;
        const metalness = mat.metalness ?? 0;
        const isEmissive = (mat.emissiveIntensity ?? 0) > 0;
        const isMetallic = metalness > 0.3;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {/* Color swatch — shows emissive glow ring if emissive */}
            <div
              className="w-3 h-3 rounded-sm border border-white/10 shrink-0"
              style={{
                background: mat.color,
                boxShadow: isEmissive ? `0 0 4px 1px ${mat.emissive ?? mat.color}88` : undefined,
              }}
            />
            <span className="text-[10px] text-tn-text font-mono truncate max-w-[100px]" title={mat.name}>
              {mat.name}
            </span>
            <div className="flex items-center gap-0.5 ml-auto">
              {/* Roughness bar */}
              <RoughnessBar value={roughness} />
              {/* Metalness badge */}
              {isMetallic && (
                <span
                  className="text-[8px] leading-none px-0.5 rounded"
                  style={{ color: "#d0c060", background: "#d0c06022" }}
                  title={`Metalness: ${Math.round(metalness * 100)}%`}
                >
                  M
                </span>
              )}
              {/* Emissive badge */}
              {isEmissive && (
                <span
                  className="text-[8px] leading-none px-0.5 rounded"
                  style={{ color: mat.emissive ?? "#ff8800", background: `${mat.emissive ?? "#ff8800"}22` }}
                  title={`Emissive ${Math.round((mat.emissiveIntensity ?? 0) * 10) / 10}x`}
                >
                  E
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
