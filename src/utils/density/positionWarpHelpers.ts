import type { Edge } from "@xyflow/react";
import type { EvalCtx } from "./evalContext";
import { evaluatePositions, type EvaluatedPosition, type WorldRange } from "../positionEvaluator";
import type { Vec3 } from "../vectorEvaluator";

const DEFAULT_RANGE: WorldRange = { minX: -128, maxX: 128, minZ: -128, maxZ: 128 };

function getPreviewWorldRange(ctx: EvalCtx): WorldRange {
  const min = ctx.contentFields.previewRangeMin;
  const max = ctx.contentFields.previewRangeMax;
  if (typeof min === "number" && typeof max === "number") {
    return { minX: min, maxX: max, minZ: min, maxZ: max };
  }
  return DEFAULT_RANGE;
}

function getCachedPositions(ctx: EvalCtx, positionsNodeId: string): EvaluatedPosition[] {
  let cache = ctx.positionListCache;
  if (!cache) {
    cache = new Map();
    ctx.positionListCache = cache;
  }
  let list = cache.get(positionsNodeId);
  if (!list) {
    const nodes = [...ctx.nodeById.values()];
    const edges: Edge[] = [];
    let edgeIdx = 0;
    for (const [targetId, handleMap] of ctx.inputEdges) {
      for (const [targetHandle, sourceId] of handleMap) {
        edges.push({
          id: `pw-${edgeIdx++}`,
          source: sourceId,
          target: targetId,
          targetHandle,
        });
      }
    }
    const range = getPreviewWorldRange(ctx);
    list = evaluatePositions(nodes, edges, range, 0, positionsNodeId);
    cache.set(positionsNodeId, list);
  }
  return list;
}

export interface PositionAnchor {
  x: number;
  y: number;
  z: number;
}

/** Effective Y upper bound — extend for 2D preview slice so default PositionsMaxY still resolves anchors. */
export function effectivePositionsMaxY(
  positionsMaxY: number,
  queryY: number,
  previewYLevel: number | undefined,
): number {
  if (
    typeof previewYLevel === "number" &&
    Math.abs(queryY - previewYLevel) < 1e-6 &&
    queryY >= positionsMaxY
  ) {
    return queryY + 1e-6;
  }
  return positionsMaxY;
}

/** Nearest position-provider anchor within MaxDistance, respecting Y bounds. */
export function findNearestPositionAnchor(
  ctx: EvalCtx,
  positionsNodeId: string,
  x: number,
  y: number,
  z: number,
  maxDistance: number,
  positionsMinY: number,
  positionsMaxY: number,
  zeroPositionsY: boolean,
): PositionAnchor | null {
  const positions = getCachedPositions(ctx, positionsNodeId);
  if (positions.length === 0) return null;

  const queryY = zeroPositionsY ? 0 : y;
  const maxY = effectivePositionsMaxY(
    positionsMaxY,
    queryY,
    ctx.contentFields.previewYLevel,
  );
  if (queryY < positionsMinY || queryY >= maxY) return null;

  let best: PositionAnchor | null = null;
  let bestDistSq = maxDistance * maxDistance;

  for (const p of positions) {
    const dx = x - p.x;
    const dz = z - p.z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = { x: p.x, y: zeroPositionsY ? 0 : queryY, z: p.z };
    }
  }

  return best;
}

/** Rotate (x,z) around a Y-axis line through (anchorX, anchorZ) by radians. */
export function rotateXZAroundAnchor(
  x: number,
  z: number,
  anchorX: number,
  anchorZ: number,
  cos: number,
  sin: number,
): { x: number; z: number } {
  const relX = x - anchorX;
  const relZ = z - anchorZ;
  return {
    x: anchorX + relX * cos - relZ * sin,
    z: anchorZ + relX * sin + relZ * cos,
  };
}

/** Rotate offset vector around arbitrary axis (Rodrigues), for TwistAxis preview. */
export function rotateOffsetAroundAxis(offset: Vec3, axis: Vec3, radians: number): Vec3 {
  const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
  if (len < 1e-10 || Math.abs(radians) < 1e-10) return offset;
  const ux = axis.x / len;
  const uy = axis.y / len;
  const uz = axis.z / len;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const dot = offset.x * ux + offset.y * uy + offset.z * uz;
  const crossX = uy * offset.z - uz * offset.y;
  const crossY = uz * offset.x - ux * offset.z;
  const crossZ = ux * offset.y - uy * offset.x;
  return {
    x: offset.x * c + crossX * s + ux * dot * (1 - c),
    y: offset.y * c + crossY * s + uy * dot * (1 - c),
    z: offset.z * c + crossZ * s + uz * dot * (1 - c),
  };
}
