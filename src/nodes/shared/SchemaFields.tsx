/**
 * Schema-driven field renderer for node components.
 *
 * Reads field definitions from the bundle via `getNodeFields()` and
 * renders an appropriate display row for each field, using the node's
 * `data.fields` values with schema defaults as fallback.
 *
 * Usage:
 *   <SchemaFields typeKey={data.type} fields={data.fields} />
 */

import { memo } from "react";
import { getNodeFields, type FieldDef } from "@/schema/schemaLoader";
import { safeDisplay } from "./displayUtils";
import { formatRange, formatVec3 } from "./formatters";

/** Short display labels for common field names */
const SHORT_LABELS: Record<string, string> = {
  Frequency: "Freq",
  Amplitude: "Amp",
  Lacunarity: "Lac",
  Persistence: "Persist",
  Octaves: "Oct",
  Smoothness: "Smooth",
  Exponent: "Exp",
  Threshold: "Thresh",
  WarpFactor: "Factor",
  WarpScale: "Scale",
  WarpOctaves: "Oct",
  WarpLacunarity: "Lac",
  WarpPersistence: "Persist",
  AngleDegrees: "Angle",
  BaseHeightName: "Name",
  OverrideX: "X",
  OverrideY: "Y",
  OverrideZ: "Z",
  SampleRange: "Range",
  StepSize: "Step",
  InnerRadius: "Inner R",
  OuterRadius: "Outer R",
  IsAnchored: "Anchored",
  SingleInstance: "Single",
  ScaleXZ: "Scale XZ",
  ScaleY: "Scale Y",
  PlaneNormal: "Normal",
  NewYAxis: "Y Axis",
  SampleDistance: "Sample Dist",
  SampleOffset: "Sample Ofs",
  SwitchState: "State",
  FromMin: "From Min",
  FromMax: "From Max",
  ToMin: "To Min",
  ToMax: "To Max",
  WallA: "Wall A",
  WallB: "Wall B",
  MinYRead: "Min Y",
  MaxYRead: "Max Y",
  BedName: "Bed",
  Is2D: "2D",
  YFor2D: "Y for 2D",
};

function getLabel(fieldName: string): string {
  return SHORT_LABELS[fieldName] ?? fieldName;
}

/** Format a single field value for display */
function formatFieldValue(value: unknown, def: FieldDef): string | number {
  const fieldName = def.name;
  // Boolean fields
  if (def.type === "boolean" || typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Range objects (e.g. SourceRange, TargetRange)
  if (
    value &&
    typeof value === "object" &&
    "Min" in (value as Record<string, unknown>)
  ) {
    return formatRange(value);
  }

  // Vec3 objects (e.g. {x, y, z})
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "x" in (value as Record<string, unknown>)
  ) {
    return formatVec3(value);
  }

  // Vec3 arrays from schema defaults (e.g. [0, 1, 0])
  if (Array.isArray(value) && value.length === 3 && (def.type === "vector3d" || def.type === "vector3i")) {
    return `(${value[0]}, ${value[1]}, ${value[2]})`;
  }

  // Nested material objects from Hytale import ({ Solid: "Rock_Stone" })
  if (fieldName === "Material" || fieldName === "Solid") {
    if (typeof value === "string" && value.length > 0) return value;
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj.Solid === "string") return obj.Solid;
      if (typeof obj.Material === "string") return obj.Material;
    }
  }

  // Other array fields (e.g. Points) - show count
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }

  // Vec3 defaults from schema (stored as arrays like [0,1,0])
  if (value == null && Array.isArray(def.default) && def.default.length === 3) {
    return `(${def.default[0]}, ${def.default[1]}, ${def.default[2]})`;
  }

  return safeDisplay(value, def.default != null ? safeDisplay(def.default) : "\u2014");
}

interface SchemaFieldsProps {
  typeKey: string;
  fields: Record<string, unknown>;
}

/** Field types that represent asset references (handled by ports, not fields). */
const ASSET_REF_TYPES = new Set([
  "curveRef", "CurveAsset", "PatternAsset", "PositionProviderAsset",
  "VectorProviderAsset", "object",
]);

/** Returns true if a field definition represents a displayable scalar value. */
function isDisplayableField(def: FieldDef): boolean {
  return !ASSET_REF_TYPES.has(def.type);
}

/**
 * Renders all displayable fields defined in the schema for a given node type.
 * Filters out asset-reference fields (those are shown as port connections).
 * Returns null if the type has no displayable fields or is not in the bundle.
 */
export const SchemaFields = memo(function SchemaFields({
  typeKey,
  fields,
}: SchemaFieldsProps) {
  const defs = getNodeFields(typeKey);
  const displayable = defs.filter(isDisplayableField);
  if (displayable.length === 0) return null;

  return (
    <div className="space-y-1">
      {displayable.map((def) => {
        const value = fields[def.name];
        return (
          <div key={def.name} className="flex justify-between">
            <span className="text-tn-text-muted">{getLabel(def.name)}</span>
            <span>{formatFieldValue(value, def)}</span>
          </div>
        );
      })}
    </div>
  );
});

/**
 * Get schema field definitions for a given type key.
 * Re-exported for use in components that need custom rendering logic
 * but still want to derive their field list from the schema.
 */
export { getNodeFields };
export type { FieldDef };
