import type { BaseFields } from "./types";

/**
 * All V2 Prop types.
 */
export type PropType =
  | "Box"
  | "Column"
  | "Cluster"
  | "Density"
  | "Prefab"
  | "Conditional"
  | "WeightedRandom"
  | "Weighted"
  | "Union"
  | "Surface"
  | "Cave"
  | "PondFiller"
  | "Queue"
  | "Offset"
  | "Cuboid"
  | "Manual"
  | "Locator"
  | "Mask"
  | "RandomRotator"
  | "StaticRotator"
  | "Orienter"
  | "DensitySelector"
  | "UniquePrefab"
  | "Imported"
  | "Exported";

export interface PropFields extends BaseFields {
  Type: PropType;
}

export interface BoxProp extends PropFields {
  Type: "Box";
  Size?: { x: number; y: number; z: number };
  Material?: string;
}

export interface ColumnProp extends PropFields {
  Type: "Column";
  Height?: number;
  Material?: string;
}

export interface ClusterProp extends PropFields {
  Type: "Cluster";
  Props?: PropFields[];
}

export interface DensityProp extends PropFields {
  Type: "Density";
  DensityFunction?: unknown;
  Material?: unknown;
}

export interface PrefabProp extends PropFields {
  Type: "Prefab";
  Path?: string;
  WeightedPrefabPaths?: Array<{ Path: string; Weight: number }>;
  LegacyPath?: boolean;
  LoadEntities?: boolean;
  MoldingDirection?: "NONE" | "UP" | "DOWN" | "NORTH" | "SOUTH" | "EAST" | "WEST";
  MoldingChildren?: boolean;
}

export type AnyProp =
  | BoxProp
  | ColumnProp
  | ClusterProp
  | DensityProp
  | PrefabProp
  | PropFields;
