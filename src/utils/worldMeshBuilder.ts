import type { ChunkDataResponse } from "./ipc";
import type { VoxelMeshData } from "./voxelMeshBuilder";
import { resolveBlockColor, type BlockRenderInfo } from "./blockColorMap";
import { HASH_PRIME_A, HASH_PRIME_B, HASH_PRIME_C, HASH_PRIME_D } from "@/constants";

/**
 * Converts server chunk data into VoxelMeshData[] for VoxelPreview3D.
 *
 * Each chunk is meshed independently. Blocks are positioned in world-space
 * relative to the center chunk, then scaled to fit the Three.js scene box.
 */

/* ── Face definitions ────────────────────────────────────────────── */

type FaceDef = {
  dir: [number, number, number];
  vertices: [number, number, number][];
};

const FACES: FaceDef[] = [
  { dir: [0, 1, 0], vertices: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },   // +Y
  { dir: [0, -1, 0], vertices: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },   // -Y
  { dir: [1, 0, 0], vertices: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },    // +X
  { dir: [-1, 0, 0], vertices: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },   // -X
  { dir: [0, 0, 1], vertices: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },    // +Z
  { dir: [0, 0, -1], vertices: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },   // -Z
];

const FACE_BRIGHTNESS = [1.0, 0.6, 0.80, 0.72, 0.85, 0.68];

/* ── Color helpers ───────────────────────────────────────────────── */

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function blockHash(x: number, y: number, z: number): number {
  let h = (x * HASH_PRIME_A + y * HASH_PRIME_B + z * HASH_PRIME_D) | 0;
  h = ((h ^ (h >> 13)) * HASH_PRIME_C) | 0;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function blockJitter(x: number, y: number, z: number): number {
  return ((blockHash(x, y, z) % 1000) / 1000 - 0.5) * 0.12;
}

/* ── Main builder ────────────────────────────────────────────────── */

export interface WorldMeshResult {
  meshes: VoxelMeshData[];
  /** Transform params for converting world Y → scene Y */
  sceneYMin: number;
  sceneScale: number;
  /** Scene-space footprint size (X and Z) of the loaded terrain */
  terrainSize: number;
}

export function buildWorldMeshes(
  chunks: ChunkDataResponse[],
  palette: Record<string, string>,
  centerX: number,
  centerZ: number,
  surfaceDepth = 32,
): WorldMeshResult {
  if (chunks.length === 0) return { meshes: [], sceneYMin: 0, sceneScale: 1, terrainSize: 0 };

  // Build block ID → render info lookup from palette
  const blockInfoCache = new Map<number, BlockRenderInfo>();
  for (const [idStr, name] of Object.entries(palette)) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id) && id !== 0) {
      blockInfoCache.set(id, resolveBlockColor(name));
    }
  }

  // Determine scene scale: fit the entire region into ~50 unit box
  const sizeX = 32; // Hytale chunk is 32x32
  const sizeZ = 32;

  // Collect all chunk ranges to compute total extent
  let minCX = Infinity, maxCX = -Infinity, minCZ = Infinity, maxCZ = -Infinity;
  let yMin = Infinity, yMax = -Infinity;
  for (const c of chunks) {
    minCX = Math.min(minCX, c.chunkX);
    maxCX = Math.max(maxCX, c.chunkX);
    minCZ = Math.min(minCZ, c.chunkZ);
    maxCZ = Math.max(maxCZ, c.chunkZ);
    yMin = Math.min(yMin, c.yMin);
    yMax = Math.max(yMax, c.yMax);
  }

  // Compute world-space midpoint for centering terrain in the scene
  const worldMidX = ((minCX + maxCX + 1) / 2 - centerX) * sizeX;
  const worldMidZ = ((minCZ + maxCZ + 1) / 2 - centerZ) * sizeZ;

  // Clamp surface depth to prevent perf issues from stale cached values
  const clampedDepth = Math.min(surfaceDepth, 40);

  const totalBlocksX = (maxCX - minCX + 1) * sizeX;
  const totalBlocksZ = (maxCZ - minCZ + 1) * sizeZ;
  const totalBlocksY = yMax - yMin;
  const maxExtent = Math.max(totalBlocksX, totalBlocksZ, totalBlocksY);
  const sceneSize = 50;
  const scale = sceneSize / maxExtent;

  // Collect quads per material color
  const materialQuads = new Map<string, {
    info: BlockRenderInfo;
    positions: number[];
    normals: number[];
    colors: number[];
    indices: number[];
  }>();

  for (const chunk of chunks) {
    const yRange = chunk.yMax - chunk.yMin;
    const blocks = chunk.blocks;
    const heightmap = chunk.heightmap;

    // Build quick lookup for this chunk
    function getBlock(lx: number, y: number, lz: number): number {
      if (lx < 0 || lx >= sizeX || lz < 0 || lz >= sizeZ || y < chunk.yMin || y >= chunk.yMax) return -1;
      const idx = (lz * sizeX + lx) * yRange + (y - chunk.yMin);
      return blocks[idx] ?? 0;
    }

    // World-space offset for this chunk (relative to center)
    const worldOffsetX = (chunk.chunkX - centerX) * sizeX;
    const worldOffsetZ = (chunk.chunkZ - centerZ) * sizeZ;

    for (let lz = 0; lz < sizeZ; lz++) {
      for (let lx = 0; lx < sizeX; lx++) {
        // Use heightmap to skip air above surface and deeply-buried blocks
        // +4 buffer above surface catches fluids sitting on top of solid ground
        const surfaceY = heightmap[lz * sizeX + lx] || 0;
        const colYMax = Math.min(chunk.yMax, surfaceY + 4);
        const colYMin = Math.max(chunk.yMin, surfaceY - clampedDepth);
        if (colYMin >= colYMax) continue;

        for (let y = colYMin; y < colYMax; y++) {
          const blockId = getBlock(lx, y, lz);
          if (blockId <= 0) continue; // air or invalid

          const info = blockInfoCache.get(blockId);
          if (!info) continue;

          // World position
          const wx = worldOffsetX + lx;
          const wy = y - yMin;
          const wz = worldOffsetZ + lz;

          // Check each face for exposure
          for (let fi = 0; fi < 6; fi++) {
            const face = FACES[fi];
            const nx = lx + face.dir[0];
            const ny = y + face.dir[1];
            const nz = lz + face.dir[2];

            // Get neighbor block (out of chunk bounds treated as air for now)
            const neighborId = getBlock(nx, ny, nz);
            if (neighborId > 0) continue; // neighbor is solid, face hidden

            // Emit this face
            const key = info.color;
            let entry = materialQuads.get(key);
            if (!entry) {
              entry = { info, positions: [], normals: [], colors: [], indices: [] };
              materialQuads.set(key, entry);
            }

            const baseVert = entry.positions.length / 3;
            const baseRGB = hexToRGB(info.color);
            const faceBrightness = FACE_BRIGHTNESS[fi];
            const jitter = blockJitter(wx, wy, wz);

            for (let vi = 0; vi < 4; vi++) {
              const vert = face.vertices[vi];
              entry.positions.push(
                (wx + vert[0] - worldMidX) * scale,
                (wy + vert[1]) * scale - sceneSize / 2,
                (wz + vert[2] - worldMidZ) * scale,
              );
              entry.normals.push(face.dir[0], face.dir[1], face.dir[2]);

              const brightness = faceBrightness * (1 + jitter);
              entry.colors.push(
                Math.min(1, Math.max(0, baseRGB[0] * brightness)),
                Math.min(1, Math.max(0, baseRGB[1] * brightness)),
                Math.min(1, Math.max(0, baseRGB[2] * brightness)),
              );
            }

            // Two triangles
            entry.indices.push(
              baseVert, baseVert + 1, baseVert + 2,
              baseVert, baseVert + 2, baseVert + 3,
            );
          }
        }
      }
    }
  }

  // Convert to VoxelMeshData[]
  const results: VoxelMeshData[] = [];
  let matIdx = 0;

  for (const [, entry] of materialQuads) {
    if (entry.positions.length === 0) continue;

    results.push({
      materialIndex: matIdx++,
      materialName: entry.info.name ?? "",
      color: entry.info.color,
      positions: new Float32Array(entry.positions),
      normals: new Float32Array(entry.normals),
      colors: new Float32Array(entry.colors),
      indices: new Uint32Array(entry.indices),
      materialProperties: {
        roughness: entry.info.roughness,
        metalness: entry.info.metalness,
        emissive: "#000000",
        emissiveIntensity: 0,
      },
    });
  }

  const terrainSize = Math.max(totalBlocksX, totalBlocksZ) * scale;
  return { meshes: results, sceneYMin: yMin, sceneScale: scale, terrainSize };
}
