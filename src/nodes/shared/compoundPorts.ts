import { AssetCategory } from "@/schema/types";

/**
 * Configuration for compound (expandable) input ports.
 * Nodes listed here get dynamic handle expansion: an empty slot is always
 * appended after the last connected input so users can drag-connect more.
 */
export interface CompoundPortConfig {
  /** Base name for the array handles (e.g. "Inputs" → "Inputs[0]", "Inputs[1]", …) */
  arrayBase: string;
  /** Display label for each slot (index is appended when showIndex is true) */
  label: string;
  /** Category of the input handles */
  category: AssetCategory;
  /** Minimum number of visible slots (even when fewer are connected) */
  minSlots: number;
}

/**
 * Map from node type key → compound port config.
 * Only nodes where all same-category inputs serve the same semantic role
 * (i.e. they are interchangeable) should be listed here.
 */
export const COMPOUND_PORTS: Record<string, CompoundPortConfig> = {
  // ── Density ────────────────────────────────────────────────────
  Sum:              { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  Product:          { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  MinFunction:      { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  MaxFunction:      { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  AverageFunction:  { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  SmoothMin:        { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  SmoothMax:        { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  TerrainBoolean:   { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  WeightedSum:      { arrayBase: "Inputs", label: "Input", category: AssetCategory.Density, minSlots: 2 },
  Switch:           { arrayBase: "Inputs", label: "Case",  category: AssetCategory.Density, minSlots: 2 },
  MultiMix:         { arrayBase: "Densities", label: "Density", category: AssetCategory.Density, minSlots: 2 },

  // ── Curve ──────────────────────────────────────────────────────
  "Curve:Multiplier": { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:Sum":        { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:Blend":      { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:Min":        { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:Max":        { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:SmoothMin":  { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },
  "Curve:SmoothMax":  { arrayBase: "Inputs", label: "Input", category: AssetCategory.Curve, minSlots: 2 },

  // ── Pattern ────────────────────────────────────────────────────
  "Pattern:Union":        { arrayBase: "Patterns", label: "Pattern", category: AssetCategory.Pattern, minSlots: 2 },
  "Pattern:Intersection": { arrayBase: "Patterns", label: "Pattern", category: AssetCategory.Pattern, minSlots: 2 },
  "Pattern:And":          { arrayBase: "Patterns", label: "Pattern", category: AssetCategory.Pattern, minSlots: 2 },
  "Pattern:Or":           { arrayBase: "Patterns", label: "Pattern", category: AssetCategory.Pattern, minSlots: 2 },
  "Pattern:BlockSet":     { arrayBase: "Patterns", label: "Pattern", category: AssetCategory.Pattern, minSlots: 2 },

  // ── Prop ───────────────────────────────────────────────────────
  "Prop:Cluster":        { arrayBase: "Props",   label: "Prop",  category: AssetCategory.Prop, minSlots: 2 },
  "Prop:Union":          { arrayBase: "Props",   label: "Prop",  category: AssetCategory.Prop, minSlots: 2 },
  "Prop:WeightedRandom": { arrayBase: "Entries", label: "Entry", category: AssetCategory.Prop, minSlots: 2 },
  "Prop:Weighted":       { arrayBase: "Entries", label: "Entry", category: AssetCategory.Prop, minSlots: 2 },
  "Prop:Queue":          { arrayBase: "Props",   label: "Prop",  category: AssetCategory.Prop, minSlots: 2 },

  // ── Material ───────────────────────────────────────────────────
  "Material:WeightedRandom": { arrayBase: "Entries",   label: "Entry",    category: AssetCategory.MaterialProvider, minSlots: 2 },
  "Material:Queue":          { arrayBase: "Queue",     label: "Material", category: AssetCategory.MaterialProvider, minSlots: 2 },
  "Material:Striped":        { arrayBase: "Materials", label: "Material", category: AssetCategory.MaterialProvider, minSlots: 2 },
  "Material:FieldFunction":  { arrayBase: "Materials", label: "Material", category: AssetCategory.MaterialProvider, minSlots: 1 },
  "Material:SpaceAndDepth":  { arrayBase: "Layers",   label: "Layer",    category: AssetCategory.MaterialProvider, minSlots: 2 },
  "Material:NoiseSelectorMaterial": { arrayBase: "Inputs", label: "Input", category: AssetCategory.MaterialProvider, minSlots: 2 },
  "Material:NoiseSelector":         { arrayBase: "Inputs", label: "Input", category: AssetCategory.MaterialProvider, minSlots: 2 },

  // ── Position ───────────────────────────────────────────────────
  "Position:Union": { arrayBase: "Providers", label: "Provider", category: AssetCategory.PositionProvider, minSlots: 2 },

  // ── Assignment ─────────────────────────────────────────────────
  "Assignment:Weighted": { arrayBase: "Entries", label: "Entry", category: AssetCategory.Assignment, minSlots: 2 },
};
