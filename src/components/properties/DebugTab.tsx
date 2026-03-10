import { usePreviewStore } from "@/stores/previewStore";

// ---------------------------------------------------------------------------
// DebugTab — worldgen debug overlay controls
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
        {label}
      </span>
      <div className="flex-1 h-px bg-tn-border" />
    </div>
  );
}

function DebugToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0 accent-tn-accent"
      />
      <div className="flex flex-col">
        <span className={`text-[12px] transition-colors ${checked ? "text-tn-text" : "text-tn-text-muted group-hover:text-tn-text"}`}>
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-tn-text-muted leading-tight">{description}</span>
        )}
      </div>
    </label>
  );
}

export function DebugTab() {
  const showContours      = usePreviewStore((s) => s.showContours);
  const setShowContours   = usePreviewStore((s) => s.setShowContours);
  const showThreshold     = usePreviewStore((s) => s.showThresholdView);
  const setShowThreshold  = usePreviewStore((s) => s.setShowThresholdView);
  const showPositionOverlay   = usePreviewStore((s) => s.showPositionOverlay);
  const setShowPositionOverlay = usePreviewStore((s) => s.setShowPositionOverlay);
  const showMaterialColors    = usePreviewStore((s) => s.showMaterialColors);
  const setShowMaterialColors = usePreviewStore((s) => s.setShowMaterialColors);
  const showMaterialLegend    = usePreviewStore((s) => s.showMaterialLegend);
  const setShowMaterialLegend = usePreviewStore((s) => s.setShowMaterialLegend);
  const showWireframe     = usePreviewStore((s) => s.showVoxelWireframe);
  const setShowWireframe  = usePreviewStore((s) => s.setShowVoxelWireframe);
  const showCrossSection  = usePreviewStore((s) => s.showCrossSection);
  const setShowCrossSection = usePreviewStore((s) => s.setShowCrossSection);
  const showSSAO          = usePreviewStore((s) => s.showSSAO);
  const setShowSSAO       = usePreviewStore((s) => s.setShowSSAO);
  const showEdgeOutline   = usePreviewStore((s) => s.showEdgeOutline);
  const setShowEdgeOutline = usePreviewStore((s) => s.setShowEdgeOutline);
  const showHillShade     = usePreviewStore((s) => s.showHillShade);
  const setShowHillShade  = usePreviewStore((s) => s.setShowHillShade);
  const showFog           = usePreviewStore((s) => s.showFog3D);
  const setShowFog        = usePreviewStore((s) => s.setShowFog3D);
  const showSky           = usePreviewStore((s) => s.showSky3D);
  const setShowSky        = usePreviewStore((s) => s.setShowSky3D);
  const showWaterPlane    = usePreviewStore((s) => s.showWaterPlane);
  const setShowWaterPlane = usePreviewStore((s) => s.setShowWaterPlane);
  const showInline        = usePreviewStore((s) => s.showInlinePreviews);
  const setShowInline     = usePreviewStore((s) => s.setShowInlinePreviews);
  const showStatistics    = usePreviewStore((s) => s.showStatistics);
  const setShowStatistics = usePreviewStore((s) => s.setShowStatistics);

  return (
    <div className="flex flex-col p-3 gap-0.5">

      {/* Density / Terrain layer */}
      <SectionHeader label="Density / Terrain" />
      <DebugToggle
        label="Density Contours"
        description="Show iso-contour lines on 2D heatmap"
        checked={showContours}
        onChange={setShowContours}
      />
      <DebugToggle
        label="Threshold View"
        description="Binary above/below threshold overlay"
        checked={showThreshold}
        onChange={setShowThreshold}
      />
      <DebugToggle
        label="Cross Section"
        description="Vertical density slice below preview"
        checked={showCrossSection}
        onChange={setShowCrossSection}
      />

      {/* Materials layer */}
      <SectionHeader label="Materials" />
      <DebugToggle
        label="Material Colors"
        description="Color voxels by material layer"
        checked={showMaterialColors}
        onChange={setShowMaterialColors}
      />
      <DebugToggle
        label="Material Legend"
        description="Show material name legend"
        checked={showMaterialLegend}
        onChange={setShowMaterialLegend}
      />
      <DebugToggle
        label="Wireframe"
        description="Voxel wireframe overlay"
        checked={showWireframe}
        onChange={setShowWireframe}
      />

      {/* Props layer */}
      <SectionHeader label="Props" />
      <DebugToggle
        label="Prop Placement"
        description="Show evaluated prop placement points"
        checked={showPositionOverlay}
        onChange={setShowPositionOverlay}
      />

      {/* Atmosphere layer */}
      <SectionHeader label="Atmosphere" />
      <DebugToggle
        label="Sky"
        description="Render sky dome in 3D/Voxel preview"
        checked={showSky}
        onChange={setShowSky}
      />
      <DebugToggle
        label="Fog"
        description="Render distance fog in 3D preview"
        checked={showFog}
        onChange={setShowFog}
      />
      <DebugToggle
        label="Water Plane"
        description="Show fluid surface plane"
        checked={showWaterPlane}
        onChange={setShowWaterPlane}
      />

      {/* Rendering aids */}
      <SectionHeader label="Rendering Aids" />
      <DebugToggle
        label="Hill Shading"
        description="Directional shading on 3D heightfield"
        checked={showHillShade}
        onChange={setShowHillShade}
      />
      <DebugToggle
        label="SSAO"
        description="Screen-space ambient occlusion"
        checked={showSSAO}
        onChange={setShowSSAO}
      />
      <DebugToggle
        label="Edge Outline"
        description="Voxel edge highlight pass"
        checked={showEdgeOutline}
        onChange={setShowEdgeOutline}
      />
      <DebugToggle
        label="Inline Previews"
        description="Thumbnail previews on graph nodes"
        checked={showInline}
        onChange={setShowInline}
      />
      <DebugToggle
        label="Statistics Panel"
        description="Value histogram and distribution"
        checked={showStatistics}
        onChange={setShowStatistics}
      />

    </div>
  );
}
