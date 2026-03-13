import { useEffect, useRef } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { useEditorStore } from "@/stores/editorStore";
import { evaluateVolumeInWorker, cancelVolumeEvaluation } from "@/utils/volumeWorkerClient";
import { extractSurfaceVoxels, type FluidConfig } from "@/utils/voxelExtractor";
import { resolveMaterials, DEFAULT_MATERIAL_PALETTE, matchMaterialName } from "@/utils/materialResolver";
import { evaluateMaterialGraph } from "@/utils/materialEvaluator";
import { createEvaluationContext } from "@/utils/densityEvaluator";
import { buildVoxelMeshes } from "@/utils/voxelMeshBuilder";
import { useConfigStore } from "@/stores/configStore";
import { scanDensityGridYBounds, computeGraphHash, analyzeGraphDefaults } from "@/utils/previewAutoFit";

/** Progressive resolution steps */
const PROGRESSIVE_STEPS = [16, 32, 64, 96, 128];

/**
 * Voxel evaluation hook — watches voxel mode params, runs volume
 * evaluation in worker, then extracts surface voxels + materials.
 *
 * Pipeline: volume worker produces raw densities → extractSurfaceVoxels
 * applies SOLID_THRESHOLD (density >= 0 = solid) to find the surface.
 * No smoothTerrainFill — raw densities match Hytale's actual generation
 * where the zero-crossing defines the terrain surface.
 */
export function useVoxelEvaluation() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const contentFields = useEditorStore((s) => s.contentFields);
  const outputNodeId = useEditorStore((s) => s.outputNodeId);
  const materialConfig = useEditorStore((s) => s.materialConfig);
  const mode = usePreviewStore((s) => s.mode);
  const rangeMin = usePreviewStore((s) => s.rangeMin);
  const rangeMax = usePreviewStore((s) => s.rangeMax);
  const voxelYMin = usePreviewStore((s) => s.voxelYMin);
  const voxelYMax = usePreviewStore((s) => s.voxelYMax);
  const voxelYSlices = usePreviewStore((s) => s.voxelYSlices);
  const voxelResolution = usePreviewStore((s) => s.voxelResolution);
  const selectedPreviewNodeId = usePreviewStore((s) => s.selectedPreviewNodeId);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const autoRefresh = usePreviewStore((s) => s.autoRefresh);
  const showMaterialColors = usePreviewStore((s) => s.showMaterialColors);
  const autoFitYEnabled = usePreviewStore((s) => s.autoFitYEnabled);
  const setVoxelDensities = usePreviewStore((s) => s.setVoxelDensities);
  const setVoxelLoading = usePreviewStore((s) => s.setVoxelLoading);
  const setVoxelError = usePreviewStore((s) => s.setVoxelError);
  const setVoxelMaterials = usePreviewStore((s) => s.setVoxelMaterials);
  const debounceMs = useConfigStore((s) => s.debounceMs);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evalIdRef = useRef(0);
  const progressiveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // ── Feature 3: Graph-aware defaults ──
  // Pre-set Y bounds from static analysis before evaluation starts
  useEffect(() => {
    if (mode !== "voxel" || !autoFitYEnabled) return;

    const currentHash = computeGraphHash(nodes, edges);
    const store = usePreviewStore.getState();
    if (currentHash === store._autoFitGraphHash) return;

    const defaults = analyzeGraphDefaults(nodes, edges, contentFields);
    if (defaults.confidence === "high") {
      store.setVoxelYMin(defaults.suggestedYMin);
      store.setVoxelYMax(defaults.suggestedYMax);
      store.setRange(defaults.suggestedRangeMin, defaults.suggestedRangeMax);
    }
  }, [nodes, edges, contentFields, mode, autoFitYEnabled]);

  // ── Main voxel evaluation pipeline ──
  useEffect(() => {
    // Only run in voxel mode when preview is visible
    if (mode !== "voxel" || viewMode === "graph" || !autoRefresh) return;

    unmountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressiveRef.current) clearTimeout(progressiveRef.current);

    timerRef.current = setTimeout(() => {
      if (nodes.length === 0) {
        setVoxelDensities(null);
        setVoxelError(null);
        return;
      }

      const evalId = ++evalIdRef.current;

      // Progressive evaluation: start at lowest res, cascade up
      const targetRes = voxelResolution;
      const progressive = useConfigStore.getState().enableProgressiveVoxel;
      const steps = progressive
        ? PROGRESSIVE_STEPS.filter((s) => s <= targetRes)
        : [];
      if (!steps.includes(targetRes)) steps.push(targetRes);

      let stepIdx = 0;

      async function runStep() {
        if (evalId !== evalIdRef.current || unmountedRef.current) return;
        const res = steps[stepIdx];
        const ySlices = Math.round(voxelYSlices * (res / targetRes));

        if (stepIdx === 0) {
          setVoxelLoading(true);
          setVoxelError(null);
        }

        try {
          const result = await evaluateVolumeInWorker({
            nodes,
            edges,
            resolution: res,
            rangeMin,
            rangeMax,
            yMin: voxelYMin,
            yMax: voxelYMax,
            ySlices: Math.max(1, ySlices),
            rootNodeId: selectedPreviewNodeId ?? outputNodeId ?? undefined,
            options: { contentFields },
          });

          if (evalId !== evalIdRef.current || unmountedRef.current) return;

          // ── Feature 1: Auto-fit Y bounds after coarse pass ──
          if (stepIdx === 0 && autoFitYEnabled) {
            const store = usePreviewStore.getState();
            const currentHash = computeGraphHash(nodes, edges);
            if (currentHash !== store._autoFitGraphHash) {
              // Graph changed — reset manual flag and run auto-fit
              store._setUserManualYAdjust(false);
              const yBounds = scanDensityGridYBounds(
                result.densities,
                result.resolution,
                result.ySlices,
                voxelYMin,
                voxelYMax,
              );
              if (yBounds.hasSolids) {
                store._setAutoFitGraphHash(currentHash);
                store.setVoxelYMin(yBounds.worldYMin);
                store.setVoxelYMax(yBounds.worldYMax);
                // The Y bound change will trigger a re-eval, but the hash
                // will now match, so auto-fit won't loop.
                return;
              }
            }
          }

          setVoxelDensities(result.densities);

          // Resolve materials — graph-based evaluation with depth-based fallback
          let materialIds: Uint8Array | undefined;
          let palette = DEFAULT_MATERIAL_PALETTE;

          if (showMaterialColors) {
            // Check if there's a material graph to evaluate
            const hasMaterialGraph = nodes.some(n =>
              typeof n.type === 'string' && n.type.startsWith('Material:')
            );

            if (hasMaterialGraph) {
              const densityCtx = createEvaluationContext(nodes, edges,
                selectedPreviewNodeId ?? outputNodeId ?? undefined,
                { contentFields });
              const matResult = evaluateMaterialGraph(
                nodes, edges, result.densities,
                result.resolution, result.ySlices,
                rangeMin, rangeMax, voxelYMin, voxelYMax,
                densityCtx ?? undefined,
              );
              if (matResult) {
                materialIds = matResult.materialIds;
                palette = matResult.palette;
              }
            }

            // Fallback: no material graph or evaluation returned null
            if (!materialIds) {
              const matResult = resolveMaterials(
                result.densities,
                result.resolution,
                result.ySlices,
                undefined,
                materialConfig ?? undefined,
              );
              materialIds = matResult.materialIds;
              palette = matResult.palette;
            }
          }

          // Compute fluid config if biome has fluid (e.g. lava sea)
          let fluidCfg: FluidConfig | undefined;
          if (materialConfig?.fluidLevel != null && materialConfig.fluidMaterial) {
            // Convert world-space fluid level to Y-slice index
            const yRange = voxelYMax - voxelYMin;
            const fluidSlice = yRange > 0
              ? Math.round(((materialConfig.fluidLevel - voxelYMin) / yRange) * result.ySlices)
              : 0;
            // Find or add fluid material in palette
            const fluidMatName = materialConfig.fluidMaterial;
            let fluidIdx = palette.findIndex((m) => m.name === fluidMatName);
            if (fluidIdx < 0) {
              fluidIdx = palette.length;
              palette = [...palette, { name: fluidMatName, color: matchMaterialName(fluidMatName) }];
            }
            if (fluidSlice >= 0 && fluidSlice < result.ySlices) {
              fluidCfg = { fluidLevel: fluidSlice, fluidMaterialIndex: fluidIdx };
            }
          }

          // Compute fluid plane config for the 3D scene
          if (fluidCfg) {
            const sceneSize = 50;
            const meshScaleY = sceneSize / Math.max(result.resolution, result.ySlices);
            const meshOffsetY = -sceneSize / 2;
            const fluidY = meshOffsetY + (fluidCfg.fluidLevel * meshScaleY);
            const fluidMatName = materialConfig?.fluidMaterial ?? "";
            const isLava = fluidMatName.toLowerCase().includes("lava");
            usePreviewStore.getState().setFluidPlaneConfig({
              type: isLava ? "lava" : "water",
              yPosition: fluidY,
            });
          } else {
            usePreviewStore.getState().setFluidPlaneConfig(null);
          }

          const voxels = extractSurfaceVoxels(
            result.densities,
            result.resolution,
            result.ySlices,
            materialIds,
            palette,
            fluidCfg,
          );

          if (evalId !== evalIdRef.current || unmountedRef.current) return;

          setVoxelMaterials(
            voxels.materialIds,
            voxels.materials,
          );

          // Build merged geometry meshes with AO + face shading
          const sceneSize = 50;
          const meshScaleX = sceneSize / result.resolution;
          const meshScaleZ = sceneSize / result.resolution;
          const meshScaleY = sceneSize / Math.max(result.resolution, result.ySlices);
          const meshOffsetX = -sceneSize / 2;
          const meshOffsetZ = -sceneSize / 2;
          const meshOffsetY = -sceneSize / 2;

          const meshData = buildVoxelMeshes(
            voxels,
            result.densities,
            result.resolution,
            result.ySlices,
            meshScaleX, meshScaleY, meshScaleZ,
            meshOffsetX, meshOffsetY, meshOffsetZ,
          );

          // Store extracted voxel data on the store for the renderer
          usePreviewStore.setState({
            _voxelData: voxels,
            _voxelVolumeRes: result.resolution,
            _voxelVolumeYSlices: result.ySlices,
            voxelMeshData: meshData,
          } as any);

          // Schedule next progressive step
          stepIdx++;
          if (stepIdx < steps.length && evalId === evalIdRef.current) {
            progressiveRef.current = setTimeout(runStep, 100);
          }
        } catch (err) {
          if (err === "cancelled") return;
          if (evalId === evalIdRef.current) {
            setVoxelDensities(null);
            setVoxelError(`Voxel evaluation failed: ${err}`);
          }
        } finally {
          if (evalId === evalIdRef.current && stepIdx >= steps.length) {
            setVoxelLoading(false);
          }
        }
      }

      runStep();
    }, debounceMs);

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressiveRef.current) clearTimeout(progressiveRef.current);
      cancelVolumeEvaluation();
    };
  }, [
    nodes, edges, contentFields, outputNodeId, materialConfig, mode, rangeMin, rangeMax, voxelYMin, voxelYMax,
    voxelYSlices, voxelResolution, selectedPreviewNodeId, viewMode,
    autoRefresh, showMaterialColors, autoFitYEnabled, debounceMs,
    setVoxelDensities, setVoxelLoading, setVoxelError, setVoxelMaterials,
  ]);
}
