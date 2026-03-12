const PREVIEW_DISTANCE_BIAS = 1.15;
const NEGATIVE_NEAR_OFFSET_RATIO = 0.35;

export interface PreviewFogDistances {
  near: number;
  far: number;
}

/**
 * Map Hytale fog distances to the editor preview scale.
 * Negative near values are softened so fog does not start at the camera.
 */
export function mapPreviewFogDistances(
  fogNear: number,
  fogFar: number,
  fogDistanceScale: number,
  fogMinSpan: number,
): PreviewFogDistances {
  const scale = Math.max(fogDistanceScale, 0.001) * PREVIEW_DISTANCE_BIAS;
  const minSpan = Math.max(fogMinSpan, 1);

  const scaledNear = fogNear * scale;
  const scaledFar = fogFar * scale;
  const normalizedFar = Math.max(scaledFar, scaledNear + minSpan);

  // When source near is behind the camera, keep some clear foreground.
  const negativeNearOffset = scaledNear < 0
    ? Math.min(-scaledNear, normalizedFar * NEGATIVE_NEAR_OFFSET_RATIO)
    : 0;

  const near = Math.max(scaledNear, 0) + negativeNearOffset;
  const far = Math.max(normalizedFar + negativeNearOffset, near + minSpan);

  return { near, far };
}
