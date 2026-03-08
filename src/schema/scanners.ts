import type { BaseFields } from "./types";

/**
 * All V2 Scanner types.
 */
export type ScannerType =
  | "Origin"
  | "ColumnLinear"
  | "ColumnRandom"
  | "Area"
  | "Linear"
  | "Random"
  | "Radial"
  | "Queue"
  | "Direct"
  | "Imported";

export interface ScannerFields extends BaseFields {
  Type: ScannerType;
}

export interface OriginScanner extends ScannerFields {
  Type: "Origin";
}

export interface ColumnLinearScanner extends ScannerFields {
  Type: "ColumnLinear";
  StepSize?: number;
  Range?: { Min: number; Max: number };
}

export interface ColumnRandomScanner extends ScannerFields {
  Type: "ColumnRandom";
  Count?: number;
  Range?: { Min: number; Max: number };
}

export interface AreaScanner extends ScannerFields {
  Type: "Area";
  Size?: { x: number; y: number; z: number };
  ChildScanner?: ScannerFields;
}

export type AnyScanner =
  | OriginScanner
  | ColumnLinearScanner
  | ColumnRandomScanner
  | AreaScanner
  | ScannerFields;
