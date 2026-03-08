import type { BaseFields } from "./types";

/**
 * All V2 Position Provider types.
 */
export type PositionProviderType =
  | "List"
  | "Mesh2D"
  | "Mesh3D"
  | "FieldFunction"
  | "Occurrence"
  | "Offset"
  | "Union"
  | "SimpleHorizontal"
  | "Cache"
  | "Conditional"
  | "DensityBased"
  | "SurfaceProjection"
  | "BaseHeight"
  | "Anchor"
  | "Bound"
  | "Framework"
  | "SquareGrid2d"
  | "SquareGrid3d"
  | "Scaler"
  | "Jitter2d"
  | "Jitter3d"
  | "TriangularGrid2d"
  | "Clusters"
  | "Empty"
  | "Imported"
  | "Exported";

export interface PositionProviderFields extends BaseFields {
  Type: PositionProviderType;
}

export interface ListPosition extends PositionProviderFields {
  Type: "List";
  Positions?: Array<{ x: number; y: number; z: number }>;
}

export interface Mesh2DPosition extends PositionProviderFields {
  Type: "Mesh2D";
  Resolution?: number;
  Jitter?: number;
}

export interface Mesh3DPosition extends PositionProviderFields {
  Type: "Mesh3D";
  Resolution?: number;
  Jitter?: number;
}

export interface FieldFunctionPosition extends PositionProviderFields {
  Type: "FieldFunction";
  FieldFunction?: unknown;
  Threshold?: number;
  PositionProvider?: PositionProviderFields;
}

export interface OccurrencePosition extends PositionProviderFields {
  Type: "Occurrence";
  Chance?: number;
  PositionProvider?: PositionProviderFields;
}

export interface OffsetPosition extends PositionProviderFields {
  Type: "Offset";
  PositionProvider?: PositionProviderFields;
  Offset?: { x: number; y: number; z: number };
}

export interface UnionPosition extends PositionProviderFields {
  Type: "Union";
  Providers?: PositionProviderFields[];
}

export type AnyPositionProvider =
  | ListPosition
  | Mesh2DPosition
  | Mesh3DPosition
  | FieldFunctionPosition
  | OccurrencePosition
  | OffsetPosition
  | UnionPosition
  | PositionProviderFields;
