import { create } from "zustand";
import type { ColormapId } from "@/utils/colormaps";
import type { VoxelMeshData } from "@/utils/voxelMeshBuilder";
import type { EvaluatedPosition } from "@/utils/positionEvaluator";
import { useConfigStore } from "@/stores/configStore";

export type PreviewMode = "2d" | "3d" | "voxel" | "world";
export type ViewMode = "graph" | "preview" | "split" | "compare" | "json";
export type SplitDirection = "horizontal" | "vertical";

export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CrossSectionLine {
  start: { x: number; z: number };
  end: { x: number; z: number };
}

interface PreviewState {
  mode: PreviewMode;
  resolution: number;
  rangeMin: number;
  rangeMax: number;
  yLevel: number;
  selectedPreviewNodeId: string | null;
  values: Float32Array | null;
  minValue: number;
  maxValue: number;
  isLoading: boolean;
  previewError: string | null;

  viewMode: ViewMode;
  autoRefresh: boolean;
  colormap: ColormapId;
  splitRatio: number;
  showInlinePreviews: boolean;

  canvasTransform: CanvasTransform;
  showContours: boolean;
  contourInterval: number;

  showStatistics: boolean;
  statisticsLogScale: boolean;

  heightScale3D: number;
  showWaterPlane: boolean;
  waterPlaneLevel: number;
  showFog3D: boolean;
  showSky3D: boolean;

  crossSectionLine: CrossSectionLine | null;
  showCrossSection: boolean;

  voxelYMin: number;
  voxelYMax: number;
  voxelYSlices: number;
  voxelResolution: number;
  voxelDensities: Float32Array | null;
  isVoxelLoading: boolean;
  voxelError: string | null;
  showThresholdView: boolean;
  showMaterialColors: boolean;
  showVoxelWireframe: boolean;
  showMaterialLegend: boolean;
  voxelMaterials: Uint8Array | null;
  voxelPalette: Array<{ name: string; color: string }>;
  voxelMeshData: VoxelMeshData[] | null;
  fluidPlaneConfig: { type: "water" | "lava"; yPosition: number; size?: number } | null;
  showSSAO: boolean;
  showEdgeOutline: boolean;
  showHillShade: boolean;

  autoFitYEnabled: boolean;
  _autoFitGraphHash: string;
  _userManualYAdjust: boolean;
  isFitToContentRunning: boolean;

  worldCenterX: number;
  worldCenterZ: number;
  worldRadius: number;
  worldYMin: number;
  worldYMax: number;
  isWorldLoading: boolean;
  worldError: string | null;
  worldChunkCount: number;
  worldTotalChunks: number;
  worldFollowPlayer: boolean;
  worldSurfaceDepth: number;
  worldLavaLevel: number;
  worldForceLoad: boolean;

  showPositionOverlay: boolean;
  positionOverlayNodeId: string | null;
  positionOverlayPoints: EvaluatedPosition[];
  positionOverlayColor: string;
  positionOverlaySize: number;
  positionOverlaySeed: number;

  compareNodeA: string | null;
  compareNodeB: string | null;
  compareModeA: PreviewMode;
  compareModeB: PreviewMode;
  compareValuesA: Float32Array | null;
  compareValuesB: Float32Array | null;
  compareMinA: number;
  compareMaxA: number;
  compareMinB: number;
  compareMaxB: number;
  compareLoadingA: boolean;
  compareLoadingB: boolean;
  linkCameras3D: boolean;

  splitDirection: SplitDirection;

  fidelityScore: number;

  // Actions
  setMode: (mode: PreviewMode) => void;
  setResolution: (res: number) => void;
  setRange: (min: number, max: number) => void;
  setYLevel: (y: number) => void;
  setSelectedPreviewNodeId: (id: string | null) => void;
  setValues: (values: Float32Array | null, min: number, max: number) => void;
  setLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setColormap: (id: ColormapId) => void;
  setSplitRatio: (ratio: number) => void;
  setShowInlinePreviews: (enabled: boolean) => void;

  setCanvasTransform: (transform: CanvasTransform) => void;
  resetCanvasTransform: () => void;
  setShowContours: (show: boolean) => void;
  setContourInterval: (interval: number) => void;

  setShowStatistics: (show: boolean) => void;
  setStatisticsLogScale: (log: boolean) => void;

  setHeightScale3D: (scale: number) => void;
  setShowWaterPlane: (show: boolean) => void;
  setWaterPlaneLevel: (level: number) => void;
  setShowFog3D: (show: boolean) => void;
  setShowSky3D: (show: boolean) => void;

  setCrossSectionLine: (line: CrossSectionLine | null) => void;
  setShowCrossSection: (show: boolean) => void;

  setVoxelYMin: (y: number) => void;
  setVoxelYMax: (y: number) => void;
  setVoxelYSlices: (s: number) => void;
  setVoxelResolution: (r: number) => void;
  setVoxelDensities: (d: Float32Array | null) => void;
  setVoxelLoading: (loading: boolean) => void;
  setVoxelError: (error: string | null) => void;
  setShowThresholdView: (show: boolean) => void;
  setShowMaterialColors: (show: boolean) => void;
  setShowVoxelWireframe: (show: boolean) => void;
  setShowMaterialLegend: (show: boolean) => void;
  setVoxelMaterials: (materials: Uint8Array | null, palette: Array<{ name: string; color: string }>) => void;
  setVoxelMeshData: (data: VoxelMeshData[] | null) => void;
  setFluidPlaneConfig: (config: { type: "water" | "lava"; yPosition: number; size?: number } | null) => void;
  setShowSSAO: (show: boolean) => void;
  setShowEdgeOutline: (show: boolean) => void;
  setShowHillShade: (show: boolean) => void;

  setAutoFitYEnabled: (enabled: boolean) => void;
  _setAutoFitGraphHash: (hash: string) => void;
  _setUserManualYAdjust: (manual: boolean) => void;
  setFitToContentRunning: (running: boolean) => void;

  setWorldCenterX: (x: number) => void;
  setWorldCenterZ: (z: number) => void;
  setWorldRadius: (r: number) => void;
  setWorldYMin: (y: number) => void;
  setWorldYMax: (y: number) => void;
  setWorldLoading: (loading: boolean) => void;
  setWorldError: (error: string | null) => void;
  setWorldProgress: (loaded: number, total: number) => void;
  setWorldFollowPlayer: (follow: boolean) => void;
  setWorldSurfaceDepth: (depth: number) => void;
  setWorldLavaLevel: (level: number) => void;
  setWorldForceLoad: (forceLoad: boolean) => void;

  setShowPositionOverlay: (show: boolean) => void;
  setPositionOverlayNodeId: (id: string | null) => void;
  setPositionOverlayPoints: (points: EvaluatedPosition[]) => void;
  setPositionOverlayColor: (color: string) => void;
  setPositionOverlaySize: (size: number) => void;
  setPositionOverlaySeed: (seed: number) => void;

  setCompareNodeA: (id: string | null) => void;
  setCompareNodeB: (id: string | null) => void;
  setCompareModeA: (mode: PreviewMode) => void;
  setCompareModeB: (mode: PreviewMode) => void;
  setCompareValuesA: (values: Float32Array | null, min: number, max: number) => void;
  setCompareValuesB: (values: Float32Array | null, min: number, max: number) => void;
  setCompareLoadingA: (loading: boolean) => void;
  setCompareLoadingB: (loading: boolean) => void;
  setLinkCameras3D: (link: boolean) => void;

  setSplitDirection: (dir: SplitDirection) => void;

  setFidelityScore: (score: number) => void;
}

// ---------------------------------------------------------------------------
// Centralized persistence — one declarative map replaces 42 manual calls
// ---------------------------------------------------------------------------

const PERSIST_MAP: Record<string, string> = {
  viewMode: "tn-viewMode",
  colormap: "tn-colormap",
  splitRatio: "tn-splitRatio",
  showInlinePreviews: "tn-showInlinePreviews",
  showContours: "tn-showContours",
  contourInterval: "tn-contourInterval",
  showStatistics: "tn-showStatistics",
  statisticsLogScale: "tn-statisticsLogScale",
  heightScale3D: "tn-heightScale3D",
  showWaterPlane: "tn-showWaterPlane",
  waterPlaneLevel: "tn-waterPlaneLevel",
  showFog3D: "tn-showFog3D",
  showSky3D: "tn-showSky3D",
  showCrossSection: "tn-showCrossSection",
  voxelYMin: "tn-voxelYMin",
  voxelYMax: "tn-voxelYMax",
  voxelYSlices: "tn-voxelYSlices",
  voxelResolution: "tn-voxelResolution",
  showThresholdView: "tn-showThresholdView",
  showMaterialColors: "tn-showMaterialColors",
  showVoxelWireframe: "tn-showVoxelWireframe",
  showMaterialLegend: "tn-showMaterialLegend",
  showSSAO: "tn-showSSAO",
  showEdgeOutline: "tn-showEdgeOutline",
  showHillShade: "tn-showHillShade",
  autoFitYEnabled: "tn-autoFitYEnabled",
  worldCenterX: "tn-worldCenterX",
  worldCenterZ: "tn-worldCenterZ",
  worldRadius: "tn-worldRadius",
  worldYMin: "tn-worldYMin",
  worldYMax: "tn-worldYMax",
  worldFollowPlayer: "tn-worldFollowPlayer",
  worldSurfaceDepth: "tn-worldSurfaceDepth",
  worldLavaLevel: "tn-worldLavaLevel",
  worldForceLoad: "tn-worldForceLoad",
  showPositionOverlay: "tn-showPositionOverlay",
  positionOverlayColor: "tn-positionOverlayColor",
  positionOverlaySize: "tn-positionOverlaySize",
  positionOverlaySeed: "tn-positionOverlaySeed",
  compareNodeA: "tn-compareNodeA",
  compareNodeB: "tn-compareNodeB",
  compareModeA: "tn-compareModeA",
  compareModeB: "tn-compareModeB",
  linkCameras3D: "tn-linkCameras3D",
  splitDirection: "tn-splitDirection",
};

function getStored(key: string): string | null {
  return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
}

function getStoredBool(key: string, fallback: boolean): boolean {
  const v = getStored(key);
  if (v === null) return fallback;
  return v === "true";
}

function getStoredFloat(key: string, fallback: number): number {
  const v = getStored(key);
  if (v === null) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function hydratePersistedState() {
  return {
    viewMode: (getStored("tn-viewMode") as ViewMode | null) ?? "graph",
    colormap: (getStored("tn-colormap") as ColormapId | null) ?? "blue-red",
    splitRatio: getStoredFloat("tn-splitRatio", 0.6),
    showInlinePreviews: getStoredBool("tn-showInlinePreviews", false),
    showContours: getStoredBool("tn-showContours", false),
    contourInterval: getStoredFloat("tn-contourInterval", 0.1),
    showStatistics: getStoredBool("tn-showStatistics", true),
    statisticsLogScale: getStoredBool("tn-statisticsLogScale", false),
    heightScale3D: getStoredFloat("tn-heightScale3D", 20),
    showWaterPlane: getStoredBool("tn-showWaterPlane", false),
    waterPlaneLevel: getStoredFloat("tn-waterPlaneLevel", 0.5),
    showFog3D: getStoredBool("tn-showFog3D", false),
    showSky3D: getStoredBool("tn-showSky3D", true),
    showCrossSection: getStoredBool("tn-showCrossSection", false),
    voxelYMin: getStoredFloat("tn-voxelYMin", 0),
    voxelYMax: getStoredFloat("tn-voxelYMax", 128),
    voxelYSlices: getStoredFloat("tn-voxelYSlices", useConfigStore.getState().defaultVoxelYSlices),
    voxelResolution: getStoredFloat("tn-voxelResolution", useConfigStore.getState().defaultVoxelRes),
    showThresholdView: getStoredBool("tn-showThresholdView", false),
    showMaterialColors: getStoredBool("tn-showMaterialColors", true),
    showVoxelWireframe: getStoredBool("tn-showVoxelWireframe", false),
    showMaterialLegend: getStoredBool("tn-showMaterialLegend", true),
    showSSAO: getStoredBool("tn-showSSAO", false),
    showEdgeOutline: getStoredBool("tn-showEdgeOutline", false),
    showHillShade: getStoredBool("tn-showHillShade", true),
    autoFitYEnabled: getStoredBool("tn-autoFitYEnabled", true),
    worldCenterX: getStoredFloat("tn-worldCenterX", 0),
    worldCenterZ: getStoredFloat("tn-worldCenterZ", 0),
    worldRadius: getStoredFloat("tn-worldRadius", 2),
    worldYMin: getStoredFloat("tn-worldYMin", 0),
    worldYMax: getStoredFloat("tn-worldYMax", 128),
    worldFollowPlayer: getStoredBool("tn-worldFollowPlayer", false),
    worldSurfaceDepth: Math.min(getStoredFloat("tn-worldSurfaceDepth", 32), 40),
    worldLavaLevel: getStoredFloat("tn-worldLavaLevel", 0),
    worldForceLoad: getStoredBool("tn-worldForceLoad", false),
    showPositionOverlay: getStoredBool("tn-showPositionOverlay", false),
    positionOverlayColor: getStored("tn-positionOverlayColor") ?? "#22c55e",
    positionOverlaySize: getStoredFloat("tn-positionOverlaySize", 1.5),
    positionOverlaySeed: getStoredFloat("tn-positionOverlaySeed", 42),
    compareNodeA: getStored("tn-compareNodeA") || null,
    compareNodeB: getStored("tn-compareNodeB") || null,
    compareModeA: (getStored("tn-compareModeA") as PreviewMode | null) ?? "2d",
    compareModeB: (getStored("tn-compareModeB") as PreviewMode | null) ?? "2d",
    linkCameras3D: getStoredBool("tn-linkCameras3D", true),
    splitDirection: (getStored("tn-splitDirection") as SplitDirection | null) ?? "horizontal",
  };
}

const DEFAULT_CANVAS_TRANSFORM: CanvasTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export const usePreviewStore = create<PreviewState>((originalSet) => {
  // Wrap set() to auto-persist any key in PERSIST_MAP
  const persistedSet: typeof originalSet = (partial) => {
    originalSet(partial);
    // Resolve the actual update object
    const updates = typeof partial === "function"
      ? partial(usePreviewStore.getState())
      : partial;
    for (const [key, lsKey] of Object.entries(PERSIST_MAP)) {
      if (key in updates) {
        const val = (updates as Record<string, unknown>)[key];
        localStorage.setItem(lsKey, String(val ?? ""));
      }
    }
  };

  const hydrated = hydratePersistedState();

  return {
    mode: "2d",
    resolution: useConfigStore.getState().defaultPreviewRes,
    rangeMin: -64,
    rangeMax: 64,
    yLevel: 64,
    selectedPreviewNodeId: null,
    values: null,
    minValue: 0,
    maxValue: 1,
    isLoading: false,
    previewError: null,
    autoRefresh: true,
    canvasTransform: { ...DEFAULT_CANVAS_TRANSFORM },
    crossSectionLine: null,
    voxelDensities: null,
    isVoxelLoading: false,
    voxelError: null,
    voxelMaterials: null,
    voxelPalette: [],
    voxelMeshData: null,
    fluidPlaneConfig: null,
    isWorldLoading: false,
    worldError: null,
    worldChunkCount: 0,
    worldTotalChunks: 0,
    positionOverlayNodeId: null,
    positionOverlayPoints: [],
    compareValuesA: null,
    compareValuesB: null,
    compareMinA: 0,
    compareMaxA: 1,
    compareMinB: 0,
    compareMaxB: 1,
    compareLoadingA: false,
    compareLoadingB: false,
    fidelityScore: 100,
    _autoFitGraphHash: "",
    _userManualYAdjust: false,
    isFitToContentRunning: false,

    // Hydrated persisted values
    ...hydrated,

    // ── Actions ──
    setMode: (mode) => originalSet({ mode }),
    setResolution: (resolution) => originalSet({ resolution }),
    setRange: (rangeMin, rangeMax) => originalSet({ rangeMin, rangeMax }),
    setYLevel: (yLevel) => originalSet({ yLevel }),
    setSelectedPreviewNodeId: (id) => originalSet({ selectedPreviewNodeId: id }),
    setValues: (values, minValue, maxValue) => originalSet({ values, minValue, maxValue }),
    setLoading: (isLoading) => originalSet({ isLoading }),
    setPreviewError: (error) => originalSet({ previewError: error }),
    setAutoRefresh: (autoRefresh) => originalSet({ autoRefresh }),
    setCanvasTransform: (canvasTransform) => originalSet({ canvasTransform }),
    resetCanvasTransform: () => originalSet({ canvasTransform: { ...DEFAULT_CANVAS_TRANSFORM } }),
    setCrossSectionLine: (crossSectionLine) => originalSet({ crossSectionLine }),
    setVoxelDensities: (voxelDensities) => originalSet({ voxelDensities }),
    setVoxelLoading: (isVoxelLoading) => originalSet({ isVoxelLoading }),
    setVoxelError: (voxelError) => originalSet({ voxelError }),
    setVoxelMaterials: (voxelMaterials, voxelPalette) => originalSet({ voxelMaterials, voxelPalette }),
    setVoxelMeshData: (voxelMeshData) => originalSet({ voxelMeshData }),
    setFluidPlaneConfig: (fluidPlaneConfig) => originalSet({ fluidPlaneConfig }),
    setWorldLoading: (isWorldLoading) => originalSet({ isWorldLoading }),
    setWorldError: (worldError) => originalSet({ worldError }),
    setWorldProgress: (worldChunkCount, worldTotalChunks) => originalSet({ worldChunkCount, worldTotalChunks }),
    setPositionOverlayNodeId: (positionOverlayNodeId) => originalSet({ positionOverlayNodeId }),
    setPositionOverlayPoints: (positionOverlayPoints) => originalSet({ positionOverlayPoints }),
    setCompareValuesA: (compareValuesA, compareMinA, compareMaxA) => originalSet({ compareValuesA, compareMinA, compareMaxA }),
    setCompareValuesB: (compareValuesB, compareMinB, compareMaxB) => originalSet({ compareValuesB, compareMinB, compareMaxB }),
    setCompareLoadingA: (compareLoadingA) => originalSet({ compareLoadingA }),
    setCompareLoadingB: (compareLoadingB) => originalSet({ compareLoadingB }),
    setFidelityScore: (fidelityScore) => originalSet({ fidelityScore }),
    _setAutoFitGraphHash: (_autoFitGraphHash) => originalSet({ _autoFitGraphHash }),
    _setUserManualYAdjust: (_userManualYAdjust) => originalSet({ _userManualYAdjust }),
    setFitToContentRunning: (isFitToContentRunning) => originalSet({ isFitToContentRunning }),

    // Persisted setters — use persistedSet for auto-localStorage sync
    setViewMode: (viewMode) => persistedSet({ viewMode }),
    setColormap: (colormap) => persistedSet({ colormap }),
    setSplitRatio: (splitRatio) => persistedSet({ splitRatio }),
    setShowInlinePreviews: (showInlinePreviews) => persistedSet({ showInlinePreviews }),
    setShowContours: (showContours) => persistedSet({ showContours }),
    setContourInterval: (contourInterval) => persistedSet({ contourInterval }),
    setShowStatistics: (showStatistics) => persistedSet({ showStatistics }),
    setStatisticsLogScale: (statisticsLogScale) => persistedSet({ statisticsLogScale }),
    setHeightScale3D: (heightScale3D) => persistedSet({ heightScale3D }),
    setShowWaterPlane: (showWaterPlane) => persistedSet({ showWaterPlane }),
    setWaterPlaneLevel: (waterPlaneLevel) => persistedSet({ waterPlaneLevel }),
    setShowFog3D: (showFog3D) => persistedSet({ showFog3D }),
    setShowSky3D: (showSky3D) => persistedSet({ showSky3D }),
    setShowCrossSection: (showCrossSection) => persistedSet({ showCrossSection }),
    setVoxelYMin: (voxelYMin) => persistedSet({ voxelYMin }),
    setVoxelYMax: (voxelYMax) => persistedSet({ voxelYMax }),
    setVoxelYSlices: (voxelYSlices) => persistedSet({ voxelYSlices }),
    setVoxelResolution: (voxelResolution) => persistedSet({ voxelResolution }),
    setShowThresholdView: (showThresholdView) => persistedSet({ showThresholdView }),
    setShowMaterialColors: (showMaterialColors) => persistedSet({ showMaterialColors }),
    setShowVoxelWireframe: (showVoxelWireframe) => persistedSet({ showVoxelWireframe }),
    setShowMaterialLegend: (showMaterialLegend) => persistedSet({ showMaterialLegend }),
    setShowSSAO: (showSSAO) => persistedSet({ showSSAO }),
    setShowEdgeOutline: (showEdgeOutline) => persistedSet({ showEdgeOutline }),
    setShowHillShade: (showHillShade) => persistedSet({ showHillShade }),
    setAutoFitYEnabled: (autoFitYEnabled) => persistedSet({ autoFitYEnabled }),
    setWorldCenterX: (worldCenterX) => persistedSet({ worldCenterX }),
    setWorldCenterZ: (worldCenterZ) => persistedSet({ worldCenterZ }),
    setWorldRadius: (worldRadius) => persistedSet({ worldRadius }),
    setWorldYMin: (worldYMin) => persistedSet({ worldYMin }),
    setWorldYMax: (worldYMax) => persistedSet({ worldYMax }),
    setWorldFollowPlayer: (worldFollowPlayer) => persistedSet({ worldFollowPlayer }),
    setWorldSurfaceDepth: (worldSurfaceDepth) => persistedSet({ worldSurfaceDepth }),
    setWorldLavaLevel: (worldLavaLevel) => persistedSet({ worldLavaLevel }),
    setWorldForceLoad: (worldForceLoad) => persistedSet({ worldForceLoad }),
    setShowPositionOverlay: (showPositionOverlay) => persistedSet({ showPositionOverlay }),
    setPositionOverlayColor: (positionOverlayColor) => persistedSet({ positionOverlayColor }),
    setPositionOverlaySize: (positionOverlaySize) => persistedSet({ positionOverlaySize }),
    setPositionOverlaySeed: (positionOverlaySeed) => persistedSet({ positionOverlaySeed }),
    setCompareNodeA: (compareNodeA) => persistedSet({ compareNodeA }),
    setCompareNodeB: (compareNodeB) => persistedSet({ compareNodeB }),
    setCompareModeA: (compareModeA) => persistedSet({ compareModeA }),
    setCompareModeB: (compareModeB) => persistedSet({ compareModeB }),
    setLinkCameras3D: (linkCameras3D) => persistedSet({ linkCameras3D }),

    setSplitDirection: (splitDirection) => persistedSet({ splitDirection }),
  };
});
