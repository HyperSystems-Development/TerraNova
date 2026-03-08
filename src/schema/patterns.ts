import type { BaseFields } from "./types";

/**
 * All V2 Pattern types.
 */
export type PatternType =
  | "Floor"
  | "Ceiling"
  | "Wall"
  | "Surface"
  | "BlockType"
  | "BlockSet"
  | "Cuboid"
  | "Offset"
  | "Conditional"
  | "Blend"
  | "Union"
  | "Intersection"
  | "And"
  | "Or"
  | "Not"
  | "Constant"
  | "FieldFunction"
  | "Imported"
  | "Exported";

export interface PatternFields extends BaseFields {
  Type: PatternType;
}

export interface FloorPattern extends PatternFields {
  Type: "Floor";
  SubPattern?: PatternFields;
  Depth?: number;
}

export interface CeilingPattern extends PatternFields {
  Type: "Ceiling";
  SubPattern?: PatternFields;
  Depth?: number;
}

export interface SurfacePattern extends PatternFields {
  Type: "Surface";
  Floor?: PatternFields;
  Ceiling?: PatternFields;
  Origin?: unknown;
  Surface?: unknown;
}

export interface BlockTypePattern extends PatternFields {
  Type: "BlockType";
  Material?: string;
}

export interface CuboidPattern extends PatternFields {
  Type: "Cuboid";
  Min?: { x: number; y: number; z: number };
  Max?: { x: number; y: number; z: number };
  Material?: string;
}

export interface OffsetPattern extends PatternFields {
  Type: "Offset";
  SubPattern?: PatternFields;
  Offset?: { x: number; y: number; z: number };
}

export interface ConditionalPattern extends PatternFields {
  Type: "Conditional";
  Condition?: unknown;
  TrueInput?: PatternFields;
  FalseInput?: PatternFields;
}

export type AnyPattern =
  | FloorPattern
  | CeilingPattern
  | SurfacePattern
  | BlockTypePattern
  | CuboidPattern
  | OffsetPattern
  | ConditionalPattern
  | PatternFields;
