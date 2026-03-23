/**
 * Schema-driven node metadata loader.
 * Reads the terranova-bundle.json and provides typed accessors
 * for handles, defaults, constraints, and descriptions.
 *
 * Existing hardcoded registries (handleRegistry, defaults, constraints,
 * fieldDescriptions) take precedence — this module fills gaps for
 * node types not yet manually registered.
 */

import bundleJson from "../data/terranova-bundle.json";
import type { HandleDef } from "@/nodes/shared/handles";
import { AssetCategory } from "./types";
import type { FieldConstraint } from "./validation";

/* ── Bundle types ─────────────────────────────────────────────────── */

interface BundleField {
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
  min?: number;
  max?: number;
  enum?: string[];
}

interface BundlePort {
  id: string;
  handleType: string;
  label: string;
  description?: string;
}

interface BundleNode {
  nodeType: string;
  displayName: string;
  category: string;
  subcategory: string;
  description: string;
  fields: Record<string, BundleField>;
  inputs: BundlePort[];
  outputs: BundlePort[];
  isSubType?: boolean;
}

/* ── Exported types for new accessors ────────────────────────────── */

export interface HandleInfo {
  id: string;
  handleType: string;
  label: string;
}

export interface FieldDef {
  name: string;
  type: string;
  default: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
}

const nodes = (bundleJson as { nodes: Record<string, BundleNode> }).nodes;

/* ── Node key resolution ─────────────────────────────────────────── */

/**
 * Maps the short category prefixes used in the app's nodeTypes registry
 * to the full category names used in the bundle.
 * E.g. "Material:" -> "MaterialProvider:", "Position:" -> "PositionProvider:"
 */
const SHORT_TO_FULL_PREFIX: Record<string, string> = {
  "Material:": "MaterialProvider:",
  "Position:": "PositionProvider:",
  "Vector:": "VectorProvider:",
  "Environment:": "EnvironmentProvider:",
  "Tint:": "TintProvider:",
};

/**
 * Resolve a node type key to a bundle key.
 * Tries the key as-is first, then attempts alternative prefix mappings.
 */
function resolveNodeKey(typeKey: string): BundleNode | undefined {
  // Direct match
  if (nodes[typeKey]) return nodes[typeKey];

  // Try expanding short prefix to full category prefix
  for (const [short, full] of Object.entries(SHORT_TO_FULL_PREFIX)) {
    if (typeKey.startsWith(short)) {
      const fullKey = full + typeKey.slice(short.length);
      if (nodes[fullKey]) return nodes[fullKey];
    }
  }

  // Try bare name (strip prefix) — some bundle entries use flat keys
  const colonIdx = typeKey.indexOf(":");
  if (colonIdx >= 0) {
    const bare = typeKey.slice(colonIdx + 1);
    if (nodes[bare]) return nodes[bare];
  }

  return undefined;
}

/* ── Category mapping ─────────────────────────────────────────────── */

const HANDLE_TYPE_TO_CATEGORY: Record<string, AssetCategory> = {
  Density: AssetCategory.Density,
  Curve: AssetCategory.Curve,
  MaterialProvider: AssetCategory.MaterialProvider,
  Pattern: AssetCategory.Pattern,
  PositionProvider: AssetCategory.PositionProvider,
  Prop: AssetCategory.Prop,
  Scanner: AssetCategory.Scanner,
  Assignment: AssetCategory.Assignment,
  VectorProvider: AssetCategory.VectorProvider,
  EnvironmentProvider: AssetCategory.EnvironmentProvider,
  TintProvider: AssetCategory.TintProvider,
  BlockMask: AssetCategory.BlockMask,
  Directionality: AssetCategory.Directionality,
  PropDistribution: AssetCategory.PropDistribution,
};

function mapCategory(handleType: string): AssetCategory {
  const cat = HANDLE_TYPE_TO_CATEGORY[handleType];
  if (!cat) {
    console.warn(`schemaLoader: unknown handleType "${handleType}", defaulting to Density`);
    return AssetCategory.Density;
  }
  return cat;
}

/* ── Public accessors ─────────────────────────────────────────────── */

/**
 * Get handle definitions from the schema bundle.
 * Returns null if the node type isn't in the bundle.
 */
export function getSchemaHandles(nodeType: string): HandleDef[] | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  const handles: HandleDef[] = [];

  for (const inp of node.inputs) {
    handles.push({
      id: inp.id,
      label: inp.label,
      type: "target",
      category: mapCategory(inp.handleType),
    });
  }

  for (const out of node.outputs) {
    handles.push({
      id: out.id,
      label: out.label,
      type: "source",
      category: mapCategory(out.handleType),
    });
  }

  // Ensure at least one output if none specified
  if (handles.filter((h) => h.type === "source").length === 0) {
    handles.push({
      id: "output",
      label: "Output",
      type: "source",
      category: mapCategory(node.category),
    });
  }

  return handles;
}

/**
 * Get default field values from the schema bundle.
 * Returns null if the node type isn't in the bundle.
 */
export function getSchemaDefaults(nodeType: string): Record<string, unknown> | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  const defaults: Record<string, unknown> = {};
  for (const [fieldName, field] of Object.entries(node.fields)) {
    if (field.default !== undefined && field.default !== null) {
      defaults[fieldName] = field.default;
    }
  }
  return defaults;
}

/**
 * Get field constraints from the schema bundle.
 * Returns null if the node type isn't in the bundle.
 */
export function getSchemaConstraints(nodeType: string): Record<string, FieldConstraint> | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  const constraints: Record<string, FieldConstraint> = {};
  for (const [fieldName, field] of Object.entries(node.fields)) {
    const constraint: FieldConstraint = {};
    if (field.required) {
      constraint.required = true;
      constraint.message = `${nodeType} requires ${fieldName}`;
    }
    if (field.min !== undefined) {
      constraint.min = field.min;
    }
    if (field.max !== undefined) {
      constraint.max = field.max;
    }
    if (Object.keys(constraint).length > 0) {
      constraints[fieldName] = constraint;
    }
  }
  return Object.keys(constraints).length > 0 ? constraints : null;
}

/**
 * Get field descriptions from the schema bundle.
 * Returns null if the node type isn't in the bundle.
 */
export function getSchemaDescriptions(nodeType: string): Record<string, string> | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  const descriptions: Record<string, string> = {};
  for (const [fieldName, field] of Object.entries(node.fields)) {
    if (field.description) {
      descriptions[fieldName] = field.description;
    }
  }
  return Object.keys(descriptions).length > 0 ? descriptions : null;
}

/**
 * Get the description for a specific port (input/output) on a node.
 */
export function getSchemaPortDescription(nodeType: string, portId: string): string | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  for (const inp of node.inputs) {
    if (inp.id === portId) return inp.description ?? null;
  }
  for (const out of node.outputs) {
    if (out.id === portId) return out.description ?? null;
  }
  return null;
}

/**
 * Get the node description from the schema bundle.
 */
export function getSchemaNodeDescription(nodeType: string): string | null {
  return resolveNodeKey(nodeType)?.description ?? null;
}

/**
 * Get all node types defined in the schema bundle.
 */
export function getAllSchemaTypes(): string[] {
  return Object.keys(nodes);
}

/**
 * Get the category of a node type from the schema bundle.
 */
export function getSchemaCategory(nodeType: string): AssetCategory | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;
  return HANDLE_TYPE_TO_CATEGORY[node.category] ?? null;
}

/**
 * Get bridge info: which categories a node bridges between.
 * Returns null if the node is not a bridge type.
 */
export function getSchemaBridgeInfo(nodeType: string): { from: AssetCategory; to: AssetCategory } | null {
  const node = resolveNodeKey(nodeType);
  if (!node) return null;

  const nodeCategory = mapCategory(node.category);
  const inputCategories = new Set(node.inputs.map((i) => mapCategory(i.handleType)));

  // A bridge node is one that accepts inputs from a different category than its own
  for (const inputCat of inputCategories) {
    if (inputCat !== nodeCategory) {
      return { from: nodeCategory, to: inputCat };
    }
  }
  return null;
}

/* ── Primary-source accessors ────────────────────────────────────── */

/**
 * Get default field values for a node type.
 * Returns `{}` if the type is not found in the bundle.
 */
export function getNodeDefaults(typeKey: string): Record<string, unknown> {
  const node = resolveNodeKey(typeKey);
  if (!node) return {};

  const defaults: Record<string, unknown> = {};
  for (const [fieldName, field] of Object.entries(node.fields)) {
    if (field.default !== undefined && field.default !== null) {
      defaults[fieldName] = field.default;
    }
  }
  return defaults;
}

/**
 * Get min/max/required constraints for each field of a node type.
 * Returns `{}` if the type is not found or has no constrained fields.
 */
export function getNodeConstraints(typeKey: string): Record<string, FieldConstraint> {
  const node = resolveNodeKey(typeKey);
  if (!node) return {};

  const constraints: Record<string, FieldConstraint> = {};
  for (const [fieldName, field] of Object.entries(node.fields)) {
    const constraint: FieldConstraint = {};
    if (field.required) {
      constraint.required = true;
    }
    if (field.min !== undefined) {
      constraint.min = field.min;
    }
    if (field.max !== undefined) {
      constraint.max = field.max;
    }
    if (Object.keys(constraint).length > 0) {
      constraints[fieldName] = constraint;
    }
  }
  return constraints;
}

/**
 * Get the input and output handle definitions for a node type.
 * Returns `{ inputs: [], outputs: [] }` if the type is not found.
 */
export function getNodeHandles(typeKey: string): { inputs: HandleInfo[]; outputs: HandleInfo[] } {
  const node = resolveNodeKey(typeKey);
  if (!node) return { inputs: [], outputs: [] };

  const inputs: HandleInfo[] = node.inputs.map((inp) => ({
    id: inp.id,
    handleType: inp.handleType,
    label: inp.label,
  }));

  const outputs: HandleInfo[] = node.outputs.map((out) => ({
    id: out.id,
    handleType: out.handleType,
    label: out.label,
  }));

  return { inputs, outputs };
}

/**
 * Get ordered field definitions for a node type.
 * Returns `[]` if the type is not found or has no fields.
 */
export function getNodeFields(typeKey: string): FieldDef[] {
  const node = resolveNodeKey(typeKey);
  if (!node) return [];

  return Object.entries(node.fields).map(([name, field]) => {
    const def: FieldDef = {
      name,
      type: field.type,
      default: field.default ?? undefined,
    };
    if (field.required !== undefined) def.required = field.required;
    if (field.min !== undefined) def.min = field.min;
    if (field.max !== undefined) def.max = field.max;
    if (field.enum !== undefined) def.enum = field.enum;
    return def;
  });
}

/**
 * Check whether a type key corresponds to a registered (non-sub-type) node.
 */
export function isRegisteredNodeType(typeKey: string): boolean {
  const node = resolveNodeKey(typeKey);
  if (!node) return false;
  return node.isSubType !== true;
}

/**
 * Get all registered (non-sub-type) node type keys from the bundle.
 */
export function getAllNodeTypes(): string[] {
  return Object.entries(nodes)
    .filter(([, node]) => node.isSubType !== true)
    .map(([key]) => key);
}
