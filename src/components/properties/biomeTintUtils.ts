/**
 * Utility functions for biome tint provider editing.
 * Kept separate from PropertyPanel.tsx so Vite Fast Refresh HMR works correctly
 * (HMR requires that files exporting React components don't also export plain values).
 */

import type { DelimiterEnvironmentProviderType } from "@/utils/environmentDelimiters";

const DEFAULT_BIOME_TINT_COLORS = ["#5b9e28", "#6ca229", "#7ea629"] as const;

// Real Hytale DensityDelimited tint bands span -1 to 1, split into thirds.
const DEFAULT_TINT_RANGES: Array<{ MinInclusive: number; MaxExclusive: number }> = [
  { MinInclusive: -1, MaxExclusive: -0.33 },
  { MinInclusive: -0.33, MaxExclusive: 0.33 },
  { MinInclusive: 0.33, MaxExclusive: 1 },
];

// Every real Hytale DensityDelimited TintProvider uses a SimplexNoise2D density
// node with these parameters (consistent across all observed biomes).
const DEFAULT_TINT_DENSITY: Record<string, unknown> = {
  Type: "SimplexNoise2D",
  Seed: "tints",
  Scale: 100,
  Octaves: 2,
  Persistence: 0.2,
  Lacunarity: 5,
};

export function applyBiomeTintBand(
  tintProvider: Record<string, unknown> | undefined,
  index: number,
  color: string,
): Record<string, unknown> {
  const sourceTintProvider = tintProvider ?? {};
  const providerType = typeof sourceTintProvider.Type === "string" ? sourceTintProvider.Type : "DensityDelimited";

  if (providerType === "Constant") {
    const nextTint: Record<string, unknown> = {
      ...sourceTintProvider,
      Type: "Constant",
      Color: color,
    };
    delete nextTint.Delimiters;
    delete nextTint.Density;
    return nextTint;
  }

  const sourceDelimiters = Array.isArray(sourceTintProvider.Delimiters)
    ? (sourceTintProvider.Delimiters as Array<Record<string, unknown>>)
    : [];

  const delimiters: Array<Record<string, unknown>> = sourceDelimiters.map((d) => ({ ...d }));
  while (delimiters.length < 3) {
    delimiters.push({});
  }
  while (delimiters.length <= index) {
    delimiters.push({});
  }

  // Always persist the first 3 tint bands so biome export keeps a complete gradient.
  for (let band = 0; band < 3; band++) {
    const existing = delimiters[band] ?? {};
    const existingTint = (existing.Tint as Record<string, unknown>) ?? {};
    const fallbackColor = DEFAULT_BIOME_TINT_COLORS[band];
    const existingColor = typeof existingTint.Color === "string" ? existingTint.Color : fallbackColor;
    // Ensure Range exists — real Hytale assets always have Range on each delimiter.
    const existingRange = (existing.Range as Record<string, unknown>) ?? DEFAULT_TINT_RANGES[band] ?? DEFAULT_TINT_RANGES[0];
    delimiters[band] = {
      ...existing,
      Range: existingRange,
      // Tint.Type is always "Constant" in real Hytale assets.
      Tint: { Type: "Constant", ...existingTint, Color: existingColor },
    };
  }

  const targetDelimiter = delimiters[index] ?? {};
  const targetTint = (targetDelimiter.Tint as Record<string, unknown>) ?? {};
  delimiters[index] = { ...targetDelimiter, Tint: { Type: "Constant", ...targetTint, Color: color } };

  const density = providerType === "DensityDelimited" && !sourceTintProvider.Density
    ? DEFAULT_TINT_DENSITY
    : sourceTintProvider.Density;

  return {
    ...sourceTintProvider,
    Type: providerType,
    ...(density !== undefined ? { Density: density } : {}),
    Delimiters: delimiters,
  };
}

export interface DelimiterTypeOption {
  value: string;
  label: string;
  supported: boolean;
}

export interface AdvancedDelimiterTypeDetails {
  label: string;
  description: string;
  guidance: string;
}

const DELIMITER_ENVIRONMENT_PROVIDER_TYPES: DelimiterEnvironmentProviderType[] = [
  "Constant",
  "Default",
  "Imported",
];

export function isDelimiterEnvironmentProviderType(
  value: string,
): value is DelimiterEnvironmentProviderType {
  return ["Constant", "Default", "Imported"].includes(value);
}

function normalizeTypeHint(value: string): string {
  return value.trim();
}

export function buildDelimiterTypeOptions(typeHints: string[]): DelimiterTypeOption[] {
  const options: DelimiterTypeOption[] = [];
  const seen = new Set<string>();
  const pushOption = (value: string, supported: boolean, label?: string) => {
    const normalizedValue = normalizeTypeHint(value);
    if (!normalizedValue) return;
    const key = normalizedValue.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push({
      value: normalizedValue,
      supported,
      label: label ?? normalizedValue,
    });
  };

  for (const type of DELIMITER_ENVIRONMENT_PROVIDER_TYPES) {
    pushOption(type, true);
  }

  for (const hint of typeHints) {
    const normalizedHint = normalizeTypeHint(hint);
    if (!normalizedHint) continue;
    if (isDelimiterEnvironmentProviderType(normalizedHint)) continue;
    pushOption(normalizedHint, false, `${normalizedHint} (advanced/read-only)`);
  }

  return options;
}

export function getAdvancedDelimiterTypeDetails(type: string): AdvancedDelimiterTypeDetails {
  const normalized = type.trim().toLowerCase();
  if (normalized === "densitydelimited") {
    return {
      label: "DensityDelimited",
      description: "Chooses an environment through its own nested density + delimiters graph.",
      guidance: "Edit this provider in the full EnvironmentProvider node graph; the table only supports direct Constant/Default/Imported refs.",
    };
  }
  if (normalized === "biome") {
    return {
      label: "Biome",
      description: "Resolves environment from biome context rather than a direct environment asset reference.",
      guidance: "Edit this provider in the graph editor where biome context inputs are available.",
    };
  }
  if (normalized === "exported") {
    return {
      label: "Exported",
      description: "References a named exported environment provider node.",
      guidance: "Edit the exported provider target in the graph editor, then reference that export.",
    };
  }
  return {
    label: type,
    description: "This environment provider type is available in workspace schema but not editable in the inline delimiter table.",
    guidance: "Use the node graph editor for full configuration of this advanced provider.",
  };
}
