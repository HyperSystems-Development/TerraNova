import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, SSAO } from "@react-three/postprocessing";
import { usePreviewStore } from "@/stores/previewStore";
import { useConfigStore } from "@/stores/configStore";
import { getColormap } from "@/utils/colormaps";
import { CameraPresets } from "./CameraPresets";
import { WaterPlane } from "./FluidPlane";
import { PositionMarkers3D } from "./PositionMarkers3D";
import { EdgeOutlineEffect } from "./EdgeOutlineEffect";
import { HytaleSky, HytaleFog, GroundShadow } from "./SceneEnvironment";
import { BufferAttribute, Vector2 } from "three";
import type { Mesh } from "three";

function Heightfield({ wireframe }: { wireframe: boolean }) {
  const values = usePreviewStore((s) => s.values);
  const resolution = usePreviewStore((s) => s.resolution);
  const minValue = usePreviewStore((s) => s.minValue);
  const maxValue = usePreviewStore((s) => s.maxValue);
  const colormap = usePreviewStore((s) => s.colormap);
  const heightScale3D = usePreviewStore((s) => s.heightScale3D);
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    if (!values) return null;

    const cm = getColormap(colormap);
    const n = resolution;
    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    const range = maxValue - minValue || 1;
    const isFlat = maxValue === minValue;

    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        const normalized = isFlat ? 0.5 : (values[i] - minValue) / range;
        const height = normalized * heightScale3D;
        positions[i * 3] = (x / n - 0.5) * 50;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = (z / n - 0.5) * 50;

        const [r, g, b] = cm.rampVec(normalized);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }

    const indices: number[] = [];
    for (let z = 0; z < n - 1; z++) {
      for (let x = 0; x < n - 1; x++) {
        const tl = z * n + x;
        const tr = tl + 1;
        const bl = (z + 1) * n + x;
        const br = bl + 1;
        indices.push(tl, bl, tr);
        indices.push(tr, bl, br);
      }
    }

    return { positions, colors, indices: new Uint32Array(indices) };
  }, [values, resolution, minValue, maxValue, colormap, heightScale3D]);

  useEffect(() => {
    if (!meshRef.current || !geometry) return;
    const geo = meshRef.current.geometry;
    geo.setAttribute("position", new BufferAttribute(geometry.positions, 3));
    geo.setAttribute("color", new BufferAttribute(geometry.colors, 3));
    geo.setIndex(new BufferAttribute(geometry.indices, 1));
    geo.computeVertexNormals();
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <bufferGeometry />
      <meshStandardMaterial vertexColors wireframe={wireframe} roughness={0.8} />
    </mesh>
  );
}

/** Registers the Three.js canvas element with the parent via callback ref */
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
  }, [size.width, size.height]);

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

export function Preview3D({ onCanvasRef }: { onCanvasRef?: (el: HTMLCanvasElement | null) => void }) {
  const [wireframe, setWireframe] = useState(false);
  const showWaterPlane = usePreviewStore((s) => s.showWaterPlane);
  const showFog3D = usePreviewStore((s) => s.showFog3D);
  const showSky3D = usePreviewStore((s) => s.showSky3D);
  const atm = usePreviewStore((s) => s.atmosphereSettings);
  const enableShadows = useConfigStore((s) => s.enableShadows);
  const shadowMapSize = useConfigStore((s) => s.shadowMapSize);
  const gpuPowerPreference = useConfigStore((s) => s.gpuPowerPreference);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [30, 25, 30], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, powerPreference: gpuPowerPreference }}
        shadows={enableShadows}
      >
        {/* Hytale-style lighting */}
        <hemisphereLight args={[atm.skyHorizon, "#8B7355", 0.4]} />
        <directionalLight
          position={[15, 30, 10]}
          intensity={0.8}
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
        <directionalLight position={[-12, 15, -8]} intensity={0.2} color="#b0c4de" />

        <Heightfield wireframe={wireframe} />
        <OrbitControls enableDamping dampingFactor={0.1} />
        <gridHelper args={[50, 50, "#4a4438", "#312d28"]} />
        <GroundShadow />
        <PositionMarkers3D />
        {showWaterPlane && <WaterPlane />}
        {showFog3D && <HytaleFog />}
        {showSky3D && <HytaleSky />}
        <CameraPresets />
        {onCanvasRef && <CanvasRefCapture onCanvas={onCanvasRef} />}

        <PostProcessing />
      </Canvas>

      {/* Wireframe toggle */}
      <div className="absolute top-2 left-2 z-10">
        <button
          onClick={() => setWireframe((w) => !w)}
          className={`px-2 py-1 text-[10px] rounded border transition-colors ${
            wireframe
              ? "bg-tn-accent/20 text-tn-accent border-tn-accent/40"
              : "bg-tn-panel/80 text-tn-text-muted border-tn-border hover:text-tn-text"
          }`}
        >
          {wireframe ? "Wireframe" : "Solid"}
        </button>
      </div>
    </div>
  );
}
