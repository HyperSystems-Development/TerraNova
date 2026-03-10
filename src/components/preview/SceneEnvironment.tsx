import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ShaderMaterial, BackSide, FogExp2, Color } from "three";
import { usePreviewStore } from "@/stores/previewStore";

/* ── Hytale-style sky dome ───────────────────────────────────────── */

const skyVertShader = `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const skyFragShader = `
uniform vec3 uHorizon;
uniform vec3 uZenith;
varying vec3 vWorldPos;
void main() {
  float h = normalize(vWorldPos).y;
  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
}
`;

export function HytaleSky() {
  const atm = usePreviewStore((s) => s.atmosphereSettings);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertShader,
        fragmentShader: skyFragShader,
        uniforms: {
          uHorizon: { value: new Color(atm.skyHorizon) },
          uZenith: { value: new Color(atm.skyZenith) },
        },
        side: BackSide,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.uniforms.uHorizon.value.set(atm.skyHorizon);
    material.uniforms.uZenith.value.set(atm.skyZenith);
  }, [material, atm.skyHorizon, atm.skyZenith]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh>
      <sphereGeometry args={[200, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/* ── Ground shadow plane ─────────────────────────────────────────── */

export function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25.5, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <shadowMaterial opacity={0.25} />
    </mesh>
  );
}

/* ── Hytale-style fog ────────────────────────────────────────────── */

export function HytaleFog() {
  const { scene } = useThree();
  const atm = usePreviewStore((s) => s.atmosphereSettings);

  useEffect(() => {
    scene.fog = new FogExp2(atm.fogColor, atm.fogDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene, atm.fogColor, atm.fogDensity]);

  return null;
}
