import React from "react";
import { memo, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, SSAO } from "@react-three/postprocessing";
import { usePreviewStore } from "@/stores/previewStore";
import { useConfigStore } from "@/stores/configStore";
import { CameraPresets } from "./CameraPresets";
import { FluidPlane } from "./FluidPlane";
import { MaterialLegend } from "./MaterialLegend";
import { EdgeOutlineEffect } from "./EdgeOutlineEffect";
import { HytaleSky, HytaleFog, GroundShadow } from "./SceneEnvironment";
import type { VoxelData } from "@/utils/voxelExtractor";
import type { VoxelMeshData } from "@/utils/voxelMeshBuilder";
import { BufferGeometry, BufferAttribute, Vector2, Color, MathUtils } from "three";

// Materials that receive biome tint (grass surface, soil with grass, moss)
const TINTABLE_MATERIALS = new Set([
  "Grass", "Soil_Grass", "GrassDeep", "GrassDeepSunny",
  "Grass_Dry", "Grass_Dead", "Grass_Swamp", "Grass_Snow",
  "Soil_Moss", "Soil_Leaves", "Soil_Pathway",
  // Canonical Soil_Grass_* variants
  "Soil_Grass_Burnt", "Soil_Grass_Cold", "Soil_Grass_Deep", "Soil_Grass_Dry",
  "Soil_Grass_Full", "Soil_Grass_Sunny", "Soil_Grass_Wet",
  // Canonical leaf types that receive tint
  "Plant_Leaves_Oak", "Plant_Leaves_Birch", "Plant_Leaves_Fir",
  "Plant_Leaves_Jungle", "Plant_Leaves_Palm", "Plant_Leaves_Azure",
  "Plant_Leaves_Crystal", "Plant_Leaves_Goldentree", "Plant_Leaves_Amber",
  "Plant_Leaves_Autumn", "Plant_Leaves_Maple",
]);

// Lightly tinted — secondary influence (soil blends 50% with tint)
const SOIL_TINTABLE = new Set([
  "Soil_Dirt", "Soil_Loam", "Soil_Peat", "Tilled_Soil",
]);

// Sand tintable at low influence
const SAND_TINTABLE = new Set([
  "Sand", "Sand_White", "Sand_Red", "Sand_Dark", "Soil_Sand",
]);

const COOL_TINT_MATERIALS = new Set([
  "Grass_Swamp", "Grass_Snow", "Soil_Grass_Cold", "Soil_Grass_Wet",
  "Plant_Leaves_Azure", "Plant_Leaves_Crystal", "Plant_Leaves_Fir", "Plant_Leaves_Birch",
]);

const WARM_TINT_MATERIALS = new Set([
  "Grass_Dry", "Grass_Dead", "Soil_Grass_Burnt", "Soil_Grass_Dry", "Soil_Grass_Sunny",
  "Plant_Leaves_Autumn", "Plant_Leaves_Maple", "Plant_Leaves_Goldentree", "Plant_Leaves_Amber",
  "Plant_Leaves_Burnt", "Plant_Leaves_Fire",
]);

/** Blend hex color `a` toward `b` by factor [0..1] */
function blendHex(a: string, b: string, t: number): string {
  const ca = new Color(a);
  const cb = new Color(b);
  ca.lerp(cb, t);
  return "#" + ca.getHexString();
}

/* ── Single merged mesh per material ─────────────────────────────── */

const VoxelMesh = memo(function VoxelMesh({
  data,
  wireframe,
  tintColor,
}: {
  data: VoxelMeshData;
  wireframe: boolean;
  tintColor?: string;
}) {
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(data.positions, 3));
    geo.setAttribute("normal", new BufferAttribute(data.normals, 3));
    geo.setAttribute("color", new BufferAttribute(data.colors, 3));
    geo.setIndex(new BufferAttribute(data.indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        wireframe={wireframe}
        color={tintColor ?? "#ffffff"}
        roughness={data.materialProperties?.roughness ?? 0.8}
        metalness={data.materialProperties?.metalness ?? 0.0}
        emissive={data.materialProperties?.emissive ?? "#000000"}
        emissiveIntensity={data.materialProperties?.emissiveIntensity ?? 0.0}
      />
    </mesh>
  );
});

/* ── Mesh group ──────────────────────────────────────────────────── */

const VoxelMeshGroup = memo(function VoxelMeshGroup({
  meshData,
  wireframe,
  color1,
  color2,
  color3,
}: {
  meshData: VoxelMeshData[];
  wireframe: boolean;
  color1: string;
  color2: string;
  color3: string;
}) {
    return (
      <>
        {meshData.map((data) => {
          const name = data.materialName ?? "";
          let tintColor: string | undefined;
          // Universal tinting: apply tint to all materials, not just certain types
          // Use baseTint logic for climate flavor, but allow override for all
          const baseTint = COOL_TINT_MATERIALS.has(name)
            ? color1
            : WARM_TINT_MATERIALS.has(name)
              ? color3
              : color2;

          // Apply tinting universally, blending for non-tintable types
          if (TINTABLE_MATERIALS.has(name)) {
            tintColor = baseTint;
          } else if (SOIL_TINTABLE.has(name)) {
            tintColor = blendHex("#ffffff", baseTint, 0.3);
          } else if (SAND_TINTABLE.has(name)) {
            tintColor = blendHex("#ffffff", blendHex(color2, color3, 0.5), 0.15);
          } else {
            // For all other materials, apply a subtle universal tint (10% blend)
            tintColor = blendHex("#ffffff", baseTint, 0.1);
          }

          return (
            <VoxelMesh
              key={data.materialIndex}
              data={data}
              wireframe={wireframe}
              tintColor={tintColor}
            />
          );
        })}
      </>
    );
});

/* ── Canvas ref capture ──────────────────────────────────────────── */

function CanvasRefCapture({ onCanvas }: { onCanvas: (el: HTMLCanvasElement) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    onCanvas(gl.domElement);
  }, [gl, onCanvas]);
  return null;
}

/* ── Edge outline effect wrapper ─────────────────────────────────── */

function EdgeOutline() {
  const { size } = useThree();
  const effect = useMemo(() => {
    return new EdgeOutlineEffect({
      resolution: new Vector2(size.width, size.height),
    });
  }, []);

  useEffect(() => {
    effect.setSize(size.width, size.height);
  }, [size, effect]);

  useEffect(() => () => effect.dispose(), [effect]);

  return <primitive object={effect} />;
}

/* ── Post-processing ─────────────────────────────────────────────── */

function SSAOEffect() {
  const ssaoSamples = useConfigStore((s) => s.ssaoSamples);
  return <SSAO samples={ssaoSamples} radius={0.5} intensity={1.5} luminanceInfluence={0.5} />;
}

function PostProcessing() {
  const showSSAO = usePreviewStore((s) => s.showSSAO);
  const showEdgeOutline = usePreviewStore((s) => s.showEdgeOutline);

  if (showSSAO && showEdgeOutline) {
    return (
      <EffectComposer>
        <SSAOEffect />
        <EdgeOutline />
      </EffectComposer>
    );
  }
  if (showSSAO) {
    return (
      <EffectComposer>
        <SSAOEffect />
      </EffectComposer>
    );
  }
  if (showEdgeOutline) {
    return (
      <EffectComposer>
        <EdgeOutline />
      </EffectComposer>
    );
  }
  return null;
}

/* ── Voxel Scene ─────────────────────────────────────────────────── */

const VoxelScene = memo(function VoxelScene({ wireframe }: { wireframe: boolean }) {
  const showWaterPlane = usePreviewStore((s) => s.showWaterPlane);
  const showFog3D = usePreviewStore((s) => s.showFog3D);
  const showSky3D = usePreviewStore((s) => s.showSky3D);
  const voxelMeshData = usePreviewStore((s) => s.voxelMeshData);
  const enableShadows = useConfigStore((s) => s.enableShadows);
  const shadowMapSize = useConfigStore((s) => s.shadowMapSize);
  const atm = usePreviewStore((s) => s.atmosphereSettings);
  const tint = usePreviewStore((s) => s.tintColors);

  // Sun position derived from sunAngle (0=east horizon, 90=zenith, 180=west horizon)
  const sunAngleRad = MathUtils.degToRad(atm.sunAngle ?? 60);
  const sunRadius = 35;
  const sunX = Math.cos(sunAngleRad) * sunRadius;
  const sunY = Math.max(0.5, Math.sin(sunAngleRad) * sunRadius);
  const sunZ = -Math.sin(sunAngleRad * 0.4) * 10;
  // Dim the sun intensity as it approaches the horizon (sin < 0.15)
  const sunElevation = Math.sin(sunAngleRad);
  const sunIntensity = Math.max(0, Math.min(1, sunElevation * 6)) * 0.8;
  const ambientIntensity = Math.max(0.05, 0.4 - sunElevation * 0.25);

  return (
    <>
      {/* Atmosphere-driven lighting */}
      <hemisphereLight args={[atm.skyHorizon, "#8B7355", ambientIntensity]} />
      <directionalLight
        position={[sunX, sunY, sunZ]}
        intensity={sunIntensity}
        color={atm.sunColor}
        castShadow={enableShadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />
      <directionalLight position={[-12, 15, -8]} intensity={0.2} color={atm.ambientColor} />

      {voxelMeshData && voxelMeshData.length > 0 && (
        <VoxelMeshGroup
          meshData={voxelMeshData}
          wireframe={wireframe}
          color1={tint.color1}
          color2={tint.color2}
          color3={tint.color3}
        />
      )}

      <OrbitControls enableDamping dampingFactor={0.1} />
      <group position={[0, -25, 0]}>
        <gridHelper args={[50, 50, "#4a4438", "#312d28"]} />
      </group>
      <GroundShadow />
      {showWaterPlane && <FluidPlane />}
      {showFog3D && <HytaleFog />}
      {showSky3D && <HytaleSky />}
      <CameraPresets />

      <PostProcessing />
    </>
  );
});

/* ── Main export ──────────────────────────────────────────────────── */

export function VoxelPreview3D({ onCanvasRef }: { onCanvasRef?: (el: HTMLCanvasElement | null) => void }) {
  const showVoxelWireframe = usePreviewStore((s) => s.showVoxelWireframe);
  const showMaterialLegend = usePreviewStore((s) => s.showMaterialLegend);
  const isVoxelLoading = usePreviewStore((s) => s.isVoxelLoading);
  const voxelError = usePreviewStore((s) => s.voxelError);
  const voxelData = (usePreviewStore.getState() as any)._voxelData as VoxelData | undefined;
  const enableShadows = useConfigStore((s) => s.enableShadows);
  const gpuPowerPreference = useConfigStore((s) => s.gpuPowerPreference);

  // Draggable legend position (persisted)
  const [legendPos, setLegendPos] = React.useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem("tn-voxelMaterialLegendPos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed;
        }
      } catch {}
    }
    return { x: 16, y: 16 };
  });
  React.useEffect(() => {
    localStorage.setItem("tn-voxelMaterialLegendPos", JSON.stringify(legendPos));
  }, [legendPos]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [35, 30, 35], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, powerPreference: gpuPowerPreference }}
        shadows={enableShadows}
      >
        <VoxelScene wireframe={showVoxelWireframe} />
        {onCanvasRef && <CanvasRefCapture onCanvas={onCanvasRef} />}
      </Canvas>

      {/* Loading indicator */}
      {isVoxelLoading && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 bg-tn-panel/90 rounded text-xs text-tn-text-muted">
          <span className="inline-block w-3 h-3 border-2 border-tn-accent border-t-transparent rounded-full animate-spin" />
          Evaluating volume...
        </div>
      )}

      {/* Voxel count */}
      {voxelData && (
        <div className="absolute bottom-2 left-2 z-10 px-2 py-1 bg-tn-panel/90 rounded text-[10px] text-tn-text-muted font-mono">
          {voxelData.count.toLocaleString()} surface voxels
        </div>
      )}

      {/* Error */}
      {voxelError && (
        <div className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-red-900/80 rounded text-[10px] text-red-300">
          {voxelError}
        </div>
      )}

      {/* Material Legend — draggable, persisted position */}
      {showMaterialLegend && voxelData && voxelData.materials && voxelData.materials.length > 0 && (
        <div
          style={{ position: "absolute", left: legendPos.x, top: legendPos.y, zIndex: 20, cursor: "grab", userSelect: "none" }}
          onMouseDown={e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const orig = { ...legendPos };
            const handleMove = (moveEvt: MouseEvent) => {
              setLegendPos({
                x: Math.max(0, orig.x + (moveEvt.clientX - startX)),
                y: Math.max(0, orig.y + (moveEvt.clientY - startY)),
              });
            };
            const handleUp = () => {
              window.removeEventListener("mousemove", handleMove);
              window.removeEventListener("mouseup", handleUp);
            };
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
          }}
        >
          <MaterialLegend materials={voxelData.materials} />
        </div>
      )}
    </div>
  );
}
