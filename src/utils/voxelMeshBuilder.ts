import { SOLID_THRESHOLD, type VoxelData } from "./voxelExtractor";
import { HASH_PRIME_A, HASH_PRIME_B, HASH_PRIME_C, HASH_PRIME_D } from "@/constants";

/* ── Types ────────────────────────────────────────────────────────── */

export interface VoxelMeshData {
  materialIndex: number;
  materialName: string;
  color: string;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  materialProperties?: {
    roughness: number;
    metalness: number;
    emissive: string;
    emissiveIntensity: number;
  };
}

/* ── Face definitions ────────────────────────────────────────────── */

// Each face: normal direction, 4 vertex offsets, 2 AO edge axes + corner for each vertex
// Vertices wound counter-clockwise when viewed from outside

type Face = {
  dir: [number, number, number]; // neighbor direction to check
  vertices: [number, number, number][]; // 4 vertex positions (offsets from block origin)
  // For each vertex: [edge1, edge2, corner] indices into neighbor offsets for AO
  ao: [number, number, number][];
};

// Neighbor offsets for AO computation (relative to block position)
// For +Y face: the 8 neighbors in the Y+1 plane
const FACES: Face[] = [
  // +Y (top) — brightness 1.0
  {
    dir: [0, 1, 0],
    vertices: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    ao: [
      [[-1, 1, 0], [0, 1, -1], [-1, 1, -1]],
      [[-1, 1, 0], [0, 1, 1], [-1, 1, 1]],
      [[1, 1, 0], [0, 1, 1], [1, 1, 1]],
      [[1, 1, 0], [0, 1, -1], [1, 1, -1]],
    ] as any,
  },
  // -Y (bottom) — brightness 0.5
  {
    dir: [0, -1, 0],
    vertices: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    ao: [
      [[-1, -1, 0], [0, -1, 1], [-1, -1, 1]],
      [[-1, -1, 0], [0, -1, -1], [-1, -1, -1]],
      [[1, -1, 0], [0, -1, -1], [1, -1, -1]],
      [[1, -1, 0], [0, -1, 1], [1, -1, 1]],
    ] as any,
  },
  // +X — brightness 0.80
  {
    dir: [1, 0, 0],
    vertices: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    ao: [
      [[1, -1, 0], [1, 0, -1], [1, -1, -1]],
      [[1, 1, 0], [1, 0, -1], [1, 1, -1]],
      [[1, 1, 0], [1, 0, 1], [1, 1, 1]],
      [[1, -1, 0], [1, 0, 1], [1, -1, 1]],
    ] as any,
  },
  // -X — brightness 0.70
  {
    dir: [-1, 0, 0],
    vertices: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    ao: [
      [[-1, -1, 0], [-1, 0, 1], [-1, -1, 1]],
      [[-1, 1, 0], [-1, 0, 1], [-1, 1, 1]],
      [[-1, 1, 0], [-1, 0, -1], [-1, 1, -1]],
      [[-1, -1, 0], [-1, 0, -1], [-1, -1, -1]],
    ] as any,
  },
  // +Z — brightness 0.85
  {
    dir: [0, 0, 1],
    vertices: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    ao: [
      [[1, 0, 1], [0, -1, 1], [1, -1, 1]],
      [[1, 0, 1], [0, 1, 1], [1, 1, 1]],
      [[-1, 0, 1], [0, 1, 1], [-1, 1, 1]],
      [[-1, 0, 1], [0, -1, 1], [-1, -1, 1]],
    ] as any,
  },
  // -Z — brightness 0.65
  {
    dir: [0, 0, -1],
    vertices: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    ao: [
      [[-1, 0, -1], [0, -1, -1], [-1, -1, -1]],
      [[-1, 0, -1], [0, 1, -1], [-1, 1, -1]],
      [[1, 0, -1], [0, 1, -1], [1, 1, -1]],
      [[1, 0, -1], [0, -1, -1], [1, -1, -1]],
    ] as any,
  },
];

const FACE_BRIGHTNESS = [1.0, 0.6, 0.80, 0.72, 0.85, 0.68];
const AO_CURVE = [1.0, 0.78, 0.60, 0.45];

/* ── Deterministic hash for per-block color jitter ───────────────── */

function blockHash(x: number, y: number, z: number): number {
  let h = (x * HASH_PRIME_A + y * HASH_PRIME_B + z * HASH_PRIME_D) | 0;
  h = ((h ^ (h >> 13)) * HASH_PRIME_C) | 0;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function blockJitter(x: number, y: number, z: number): number {
  // Returns value in [-0.08, +0.08]
  return ((blockHash(x, y, z) % 1000) / 1000 - 0.5) * 0.16;
}

/* ── Color parsing ───────────────────────────────────────────────── */

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

/* ── Solid voxel lookup ──────────────────────────────────────────── */

function isSolid(
  densities: Float32Array,
  x: number, y: number, z: number,
  n: number, ys: number,
): boolean {
  if (x < 0 || x >= n || y < 0 || y >= ys || z < 0 || z >= n) return false;
  return densities[y * n * n + z * n + x] >= SOLID_THRESHOLD;
}

/* ── Vertex AO computation ───────────────────────────────────────── */

export function computeVertexAO(
  densities: Float32Array,
  bx: number, by: number, bz: number,
  edge1: [number, number, number],
  edge2: [number, number, number],
  corner: [number, number, number],
  n: number, ys: number,
): number {
  const s1 = isSolid(densities, bx + edge1[0], by + edge1[1], bz + edge1[2], n, ys) ? 1 : 0;
  const s2 = isSolid(densities, bx + edge2[0], by + edge2[1], bz + edge2[2], n, ys) ? 1 : 0;
  const sc = isSolid(densities, bx + corner[0], by + corner[1], bz + corner[2], n, ys) ? 1 : 0;

  if (s1 && s2) return 3; // corner is occluded by both edges
  return s1 + s2 + sc;
}

/* ── Greedy meshing types ────────────────────────────────────────── */

interface MaskEntry {
  matId: number;
  ao: [number, number, number, number];
  jitter: number;
  bx: number;
  by: number;
  bz: number;
}

/* ── Axis mappings for greedy meshing ────────────────────────────── */

// For each face direction, defines which axes form the 2D slice
// [sliceAxis, uAxis, vAxis] where slice iterates perpendicular to face
// and (u, v) are the 2D coordinates within each slice

interface FaceAxisMap {
  // Convert (slice, u, v) to (bx, by, bz)
  toBxyz: (slice: number, u: number, v: number) => [number, number, number];
  // Dimensions of the slice
  sliceCount: (n: number, ys: number) => number;
  uCount: (n: number, ys: number) => number;
  vCount: (n: number, ys: number) => number;
  // Neighbor in face direction
  neighborOffset: (slice: number, u: number, v: number) => [number, number, number];
  // Index into face.vertices[i] that aligns with U / V axis
  uVertComponent: number;
  vVertComponent: number;
}

const FACE_AXIS_MAPS: FaceAxisMap[] = [
  // +Y: slice=Y, u=X, v=Z, neighbor at (x, y+1, z)
  {
    toBxyz: (s, u, v) => [u, s, v],
    sliceCount: (_n, ys) => ys,
    uCount: (n) => n,
    vCount: (n) => n,
    neighborOffset: (s, u, v) => [u, s + 1, v],
    uVertComponent: 0, // X
    vVertComponent: 2, // Z
  },
  // -Y: slice=Y, u=X, v=Z, neighbor at (x, y-1, z)
  {
    toBxyz: (s, u, v) => [u, s, v],
    sliceCount: (_n, ys) => ys,
    uCount: (n) => n,
    vCount: (n) => n,
    neighborOffset: (s, u, v) => [u, s - 1, v],
    uVertComponent: 0, // X
    vVertComponent: 2, // Z
  },
  // +X: slice=X, u=Z, v=Y, neighbor at (x+1, y, z)
  {
    toBxyz: (s, u, v) => [s, v, u],
    sliceCount: (n) => n,
    uCount: (n) => n,
    vCount: (_n, ys) => ys,
    neighborOffset: (s, u, v) => [s + 1, v, u],
    uVertComponent: 2, // Z
    vVertComponent: 1, // Y
  },
  // -X: slice=X, u=Z, v=Y, neighbor at (x-1, y, z)
  {
    toBxyz: (s, u, v) => [s, v, u],
    sliceCount: (n) => n,
    uCount: (n) => n,
    vCount: (_n, ys) => ys,
    neighborOffset: (s, u, v) => [s - 1, v, u],
    uVertComponent: 2, // Z
    vVertComponent: 1, // Y
  },
  // +Z: slice=Z, u=X, v=Y, neighbor at (x, y, z+1)
  {
    toBxyz: (s, u, v) => [u, v, s],
    sliceCount: (n) => n,
    uCount: (n) => n,
    vCount: (_n, ys) => ys,
    neighborOffset: (s, u, v) => [u, v, s + 1],
    uVertComponent: 0, // X
    vVertComponent: 1, // Y
  },
  // -Z: slice=Z, u=X, v=Y, neighbor at (x, y, z-1)
  {
    toBxyz: (s, u, v) => [u, v, s],
    sliceCount: (n) => n,
    uCount: (n) => n,
    vCount: (_n, ys) => ys,
    neighborOffset: (s, u, v) => [u, v, s - 1],
    uVertComponent: 0, // X
    vVertComponent: 1, // Y
  },
];

/* ── Main mesh builder (greedy meshing) ──────────────────────────── */

export function buildVoxelMeshes(
  voxelData: VoxelData,
  densities: Float32Array,
  resolution: number,
  ySlices: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  offsetX: number,
  offsetY: number,
  offsetZ: number,
): VoxelMeshData[] {
  const n = resolution;
  const ys = ySlices;

  // Build material grid: (x, y, z) → material ID (-1 for air)
  const matGrid = new Int8Array(n * n * ys);
  matGrid.fill(-1);

  for (let i = 0; i < voxelData.count; i++) {
    const bx = Math.round(voxelData.positions[i * 3]);
    const by = Math.round(voxelData.positions[i * 3 + 1]);
    const bz = Math.round(voxelData.positions[i * 3 + 2]);
    if (bx < 0 || bx >= n || by < 0 || by >= ys || bz < 0 || bz >= n) continue;
    const idx = by * n * n + bz * n + bx;
    matGrid[idx] = voxelData.materialIds[i];
  }

  // Collect quads per material: matId → array of quads
  const materialQuads = new Map<number, Array<{
    // 4 corner positions in block space
    corners: [number, number, number][];
    // Face index for normal and brightness
    fi: number;
    // AO values for the 4 vertices
    ao: [number, number, number, number];
    // Jitter from origin block
    jitter: number;
  }>>();

  // Process each of the 6 face directions
  for (let fi = 0; fi < 6; fi++) {
    const face = FACES[fi];
    const axisMap = FACE_AXIS_MAPS[fi];
    const sliceCount = axisMap.sliceCount(n, ys);
    const uCount = axisMap.uCount(n, ys);
    const vCount = axisMap.vCount(n, ys);

    // Process each slice
    for (let slice = 0; slice < sliceCount; slice++) {
      // Build 2D mask for this slice
      const mask: (MaskEntry | null)[] = new Array(uCount * vCount).fill(null);

      for (let v = 0; v < vCount; v++) {
        for (let u = 0; u < uCount; u++) {
          const [bx, by, bz] = axisMap.toBxyz(slice, u, v);

          // Check if this voxel has a surface voxel (is in matGrid)
          const gridIdx = by * n * n + bz * n + bx;
          const matId = matGrid[gridIdx];
          if (matId < 0) continue; // not a surface voxel

          // Check if face is exposed (neighbor in face direction is not solid)
          const [nx, ny, nz] = axisMap.neighborOffset(slice, u, v);
          if (isSolid(densities, nx, ny, nz, n, ys)) continue;

          // Compute AO for 4 vertices
          const ao: [number, number, number, number] = [0, 0, 0, 0];
          for (let vi = 0; vi < 4; vi++) {
            const aoData = face.ao[vi] as unknown as [[number, number, number], [number, number, number], [number, number, number]];
            ao[vi] = computeVertexAO(densities, bx, by, bz, aoData[0], aoData[1], aoData[2], n, ys);
          }

          const jitter = blockJitter(bx, by, bz);
          mask[v * uCount + u] = { matId, ao, jitter, bx, by, bz };
        }
      }

      // Greedy merge the mask
      const visited = new Uint8Array(uCount * vCount);

      for (let v = 0; v < vCount; v++) {
        for (let u = 0; u < uCount; u++) {
          const maskIdx = v * uCount + u;
          if (visited[maskIdx] || !mask[maskIdx]) continue;

          const entry = mask[maskIdx]!;

          // Extend width
          let w = 1;
          while (u + w < uCount) {
            const nextIdx = v * uCount + (u + w);
            if (visited[nextIdx] || !mask[nextIdx]) break;
            if (!canMerge(entry, mask[nextIdx]!)) break;
            w++;
          }

          // Extend height
          let h = 1;
          outer:
          while (v + h < vCount) {
            for (let du = 0; du < w; du++) {
              const checkIdx = (v + h) * uCount + (u + du);
              if (visited[checkIdx] || !mask[checkIdx]) break outer;
              if (!canMerge(entry, mask[checkIdx]!)) break outer;
            }
            h++;
          }

          // Mark as visited
          for (let dv = 0; dv < h; dv++) {
            for (let du = 0; du < w; du++) {
              visited[(v + dv) * uCount + (u + du)] = 1;
            }
          }

          // Emit merged quad
          const matId = entry.matId;
          let quads = materialQuads.get(matId);
          if (!quads) {
            quads = [];
            materialQuads.set(matId, quads);
          }

          // Compute 4 corner positions of the merged quad
          // The face vertices define the quad for a single block.
          // For a merged WxH quad, we need to scale the vertex offsets
          // along the U and V axes.
          const corners = computeMergedCorners(face, axisMap, slice, u, v, w, h);

          quads.push({
            corners,
            fi,
            ao: entry.ao,
            jitter: entry.jitter,
          });
        }
      }
    }
  }

  // Build VoxelMeshData per material
  const results: VoxelMeshData[] = [];

  for (const [matId, quads] of materialQuads) {
    const material = voxelData.materials[matId] ?? voxelData.materials[0];
    const baseRGB = hexToRGB(material?.color ?? "#808080");
    const faceCount = quads.length;

    // Each quad = 4 vertices, 6 indices
    const positions = new Float32Array(faceCount * 4 * 3);
    const normals = new Float32Array(faceCount * 4 * 3);
    const colors = new Float32Array(faceCount * 4 * 3);
    const indices = new Uint32Array(faceCount * 6);

    let vertIdx = 0;
    let idxIdx = 0;

    for (const quad of quads) {
      const face = FACES[quad.fi];
      const faceBrightness = FACE_BRIGHTNESS[quad.fi];
      const baseVert = vertIdx;

      // Emit 4 vertices
      for (let vi = 0; vi < 4; vi++) {
        const corner = quad.corners[vi];
        positions[vertIdx * 3] = corner[0] * scaleX + offsetX;
        positions[vertIdx * 3 + 1] = corner[1] * scaleY + offsetY;
        positions[vertIdx * 3 + 2] = corner[2] * scaleZ + offsetZ;

        normals[vertIdx * 3] = face.dir[0];
        normals[vertIdx * 3 + 1] = face.dir[1];
        normals[vertIdx * 3 + 2] = face.dir[2];

        const aoBrightness = AO_CURVE[quad.ao[vi]];
        const brightness = faceBrightness * aoBrightness * (1 + quad.jitter);

        colors[vertIdx * 3] = Math.min(1, Math.max(0, baseRGB[0] * brightness));
        colors[vertIdx * 3 + 1] = Math.min(1, Math.max(0, baseRGB[1] * brightness));
        colors[vertIdx * 3 + 2] = Math.min(1, Math.max(0, baseRGB[2] * brightness));

        vertIdx++;
      }

      // AO-aware triangle winding
      if (quad.ao[0] + quad.ao[2] > quad.ao[1] + quad.ao[3]) {
        indices[idxIdx++] = baseVert + 1;
        indices[idxIdx++] = baseVert + 2;
        indices[idxIdx++] = baseVert + 3;
        indices[idxIdx++] = baseVert + 1;
        indices[idxIdx++] = baseVert + 3;
        indices[idxIdx++] = baseVert + 0;
      } else {
        indices[idxIdx++] = baseVert + 0;
        indices[idxIdx++] = baseVert + 1;
        indices[idxIdx++] = baseVert + 2;
        indices[idxIdx++] = baseVert + 0;
        indices[idxIdx++] = baseVert + 2;
        indices[idxIdx++] = baseVert + 3;
      }
    }

    results.push({
      materialIndex: matId,
      materialName: material?.name ?? "",
      color: material?.color ?? "#808080",
      positions,
      normals,
      colors,
      indices,
      materialProperties: {
        roughness: material?.roughness ?? 0.8,
        metalness: material?.metalness ?? 0.0,
        emissive: material?.emissive ?? "#000000",
        emissiveIntensity: material?.emissiveIntensity ?? 0.0,
      },
    });
  }

  return results;
}

/* ── Merge compatibility ─────────────────────────────────────────── */

function canMerge(a: MaskEntry, b: MaskEntry): boolean {
  return a.matId === b.matId &&
    a.ao[0] === b.ao[0] &&
    a.ao[1] === b.ao[1] &&
    a.ao[2] === b.ao[2] &&
    a.ao[3] === b.ao[3];
}

/* ── Compute merged quad corners ─────────────────────────────────── */

/**
 * Given a face definition and a merged rectangle of w×h blocks starting at (u, v)
 * in the slice, compute the 4 corner positions in block coordinates.
 *
 * The face.vertices define the 4 corners of a single-block face.
 * For a merged quad, we need to extend those corners along the U and V axes.
 */
function computeMergedCorners(
  face: Face,
  axisMap: FaceAxisMap,
  slice: number,
  u: number,
  v: number,
  w: number,
  h: number,
): [number, number, number][] {
  const [ox, oy, oz] = axisMap.toBxyz(slice, u, v);
  const corners: [number, number, number][] = [];

  // U/V direction vectors in block-coordinate space
  const [u1x, u1y, u1z] = axisMap.toBxyz(slice, 1, 0);
  const [u0x, u0y, u0z] = axisMap.toBxyz(slice, 0, 0);
  const uDirX = u1x - u0x;
  const uDirY = u1y - u0y;
  const uDirZ = u1z - u0z;

  const [v1x, v1y, v1z] = axisMap.toBxyz(slice, 0, 1);
  const vDirX = v1x - u0x;
  const vDirY = v1y - u0y;
  const vDirZ = v1z - u0z;

  for (let i = 0; i < 4; i++) {
    const vert = face.vertices[i];
    // Determine if this vertex sits at the "high" end of U or V
    // by checking the component of the vertex offset that aligns with each axis.
    const isHighU = vert[axisMap.uVertComponent] > 0.5 ? 1 : 0;
    const isHighV = vert[axisMap.vVertComponent] > 0.5 ? 1 : 0;
    const uExt = isHighU * (w - 1);
    const vExt = isHighV * (h - 1);

    corners.push([
      ox + vert[0] + uExt * uDirX + vExt * vDirX,
      oy + vert[1] + uExt * uDirY + vExt * vDirY,
      oz + vert[2] + uExt * uDirZ + vExt * vDirZ,
    ]);
  }

  return corners;
}
