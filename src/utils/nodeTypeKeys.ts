import type { CategoryDefaultsEntry } from "@/schema/defaults";
import { AssetCategory } from "@/schema/types";

const CATEGORY_PREFIX: Partial<Record<AssetCategory, string>> = {
  [AssetCategory.Curve]: "Curve",
  [AssetCategory.MaterialProvider]: "Material",
  [AssetCategory.Pattern]: "Pattern",
  [AssetCategory.PositionProvider]: "Position",
  [AssetCategory.Prop]: "Prop",
  [AssetCategory.Scanner]: "Scanner",
  [AssetCategory.Assignment]: "Assignment",
  [AssetCategory.VectorProvider]: "Vector",
  [AssetCategory.EnvironmentProvider]: "Environment",
  [AssetCategory.TintProvider]: "Tint",
  [AssetCategory.BlockMask]: "BlockMask",
  [AssetCategory.Directionality]: "Directionality",
  [AssetCategory.PropDistribution]: "PropDistribution",
  [AssetCategory.Condition]: "Condition",
  [AssetCategory.Layer]: "Layer",
  [AssetCategory.PointGenerator]: "PointGenerator",
  [AssetCategory.Terrain]: "Terrain",
  [AssetCategory.CaveGenerator]: "CaveGenerator",
  [AssetCategory.Generator]: "Generator",
  [AssetCategory.Biome]: "Biome",
  [AssetCategory.WorldStructure]: "WorldStructure",
};

export function resolveNodeTypeKey(entry: CategoryDefaultsEntry): string {
  if (entry.type.includes(":")) return entry.type;
  const prefix = CATEGORY_PREFIX[entry.category];
  return prefix ? `${prefix}:${entry.type}` : entry.type;
}
