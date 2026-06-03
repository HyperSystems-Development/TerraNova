/** V2 asset categories for UI organization and node coloring */
export enum AssetCategory {
  Density = "Density",
  Curve = "Curve",
  Pattern = "Pattern",
  MaterialProvider = "MaterialProvider",
  PositionProvider = "PositionProvider",
  Prop = "Prop",
  Scanner = "Scanner",
  Assignment = "Assignment",
  VectorProvider = "VectorProvider",
  EnvironmentProvider = "EnvironmentProvider",
  TintProvider = "TintProvider",
  BlockMask = "BlockMask",
  Framework = "Framework",
  WorldStructure = "WorldStructure",
  Biome = "Biome",
  Settings = "Settings",
  Directionality = "Directionality",
  PropDistribution = "PropDistribution",
  Condition = "Condition",
  Layer = "Layer",
  PointGenerator = "PointGenerator",
  Terrain = "Terrain",
  CaveGenerator = "CaveGenerator",
  Generator = "Generator",
}

/** Base fields shared by most V2 asset types */
export interface BaseFields {
  Type: string;
  Skip?: boolean;
  ExportAs?: string;
}

/** 3D vector with double precision */
export interface Vector3d {
  x: number;
  y: number;
  z: number;
}

/** 3D vector with integer components */
export interface Vector3i {
  x: number;
  y: number;
  z: number;
}

/** Material definition (solid/fluid pair) */
export interface MaterialAsset {
  Solid: string;
  Fluid?: string;
  SolidBottomUp?: boolean;
}

/** Range with min/max values */
export interface RangeDouble {
  Min: number;
  Max: number;
}

/** Evaluation status for density nodes */
export enum EvalStatus {
  /** Fully evaluated — pure function with accurate preview */
  Full = "full",
  /** Approximated — stub or simplified evaluator */
  Approximated = "approximated",
  /** Unsupported — context-dependent, returns 0 */
  Unsupported = "unsupported",
}

/** Category → CSS color mapping for node headers */
export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  [AssetCategory.Density]: "#5B8DBF",
  [AssetCategory.Curve]: "#A67EB8",
  [AssetCategory.Pattern]: "#D4A843",
  [AssetCategory.MaterialProvider]: "#C87D3A",
  [AssetCategory.PositionProvider]: "#6B9E5A",
  [AssetCategory.Prop]: "#C76B6B",
  [AssetCategory.Scanner]: "#5AACA6",
  [AssetCategory.Assignment]: "#8B7355",
  [AssetCategory.VectorProvider]: "#7B8E92",
  [AssetCategory.EnvironmentProvider]: "#7DB350",
  [AssetCategory.TintProvider]: "#D46A4A",
  [AssetCategory.BlockMask]: "#8C8878",
  [AssetCategory.Framework]: "#8C8878",
  [AssetCategory.WorldStructure]: "#5A6FA0",
  [AssetCategory.Biome]: "#4E9E8F",
  [AssetCategory.Settings]: "#8C8878",
  [AssetCategory.Directionality]: "#B8648B",
  [AssetCategory.PropDistribution]: "#9B6EA5",
  [AssetCategory.Condition]: "#8E7CC3",
  [AssetCategory.Layer]: "#B59A5B",
  [AssetCategory.PointGenerator]: "#6A9A8F",
  [AssetCategory.Terrain]: "#6E8F58",
  [AssetCategory.CaveGenerator]: "#6F6B9E",
  [AssetCategory.Generator]: "#6D7F8F",
};
