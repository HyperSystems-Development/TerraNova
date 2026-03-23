import type { ReactFlowInstance, Edge } from "@xyflow/react";
import { AssetCategory, CATEGORY_COLORS } from "@/schema/types";
import { getDensityAccentColor } from "@/schema/densitySubcategories";
import { getHandles, HANDLE_REGISTRY } from "@/nodes/handleRegistry";
import { COMPOUND_PORTS } from "@/nodes/shared/compoundPorts";
import { HEADER_H, ROW_H, handleTop } from "@/nodes/shared/nodeLayout";
import { INPUT_HANDLE_COLOR, getHandleColor, categoryInput } from "@/nodes/shared/handles";
import type { HandleDef } from "@/nodes/shared/handles";
import { useEditorStore } from "@/stores/editorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { getLanguageHelpers } from "@/languages/useLanguage";
import type { FlowDirection } from "@/constants";

// ── Public types ──────────────────────────────────────────────────────────

export interface SvgExportOptions {
  scope: "full" | "viewport";
  showGrid: boolean;
  mode: "presentation" | "debug";
  padding: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const NODE_BG = "#262320";
const CANVAS_BG = "#1c1a17";
const ROOT_COLOR = "#8B4450";
const GROUP_COLOR_START = "#6B5B3E";
const GROUP_COLOR_END = "#8B7355";
const HANDLE_RADIUS = 7;
const HANDLE_STROKE_COLOR = "#000000";
const HANDLE_STROKE_OPACITY = "0.4";
const GRID_SIZE = 20;
const DEFAULT_NODE_W = 220;

const PREFIX_TO_CATEGORY: Record<string, AssetCategory> = {
  Curve: AssetCategory.Curve,
  Material: AssetCategory.MaterialProvider,
  Pattern: AssetCategory.Pattern,
  Position: AssetCategory.PositionProvider,
  Prop: AssetCategory.Prop,
  Scanner: AssetCategory.Scanner,
  Assignment: AssetCategory.Assignment,
  Vector: AssetCategory.VectorProvider,
  Environment: AssetCategory.EnvironmentProvider,
  Tint: AssetCategory.TintProvider,
  BlockMask: AssetCategory.BlockMask,
  Directionality: AssetCategory.Directionality,
};

// ── Helpers ───────────────────────────────────────────────────────────────

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getCategoryFromRfType(rfType: string): AssetCategory | null {
  const colonIdx = rfType.indexOf(":");
  if (colonIdx > 0) {
    return PREFIX_TO_CATEGORY[rfType.substring(0, colonIdx)] ?? null;
  }
  if (rfType === "Root" || rfType === "group") return null;
  return AssetCategory.Density;
}

/** Convert HSL to 6-digit hex string. */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Deterministic hash-based color for unknown/generic node types. */
function getGenericTypeColor(typeName: string): string {
  const KNOWN: Record<string, string> = {
    NoiseRange: "#5A6FA0",
    Constant: "#5B8DBF",
    SpaceAndDepth: "#C87D3A",
    DAOTerrain: "#4E9E8F",
  };
  if (KNOWN[typeName]) return KNOWN[typeName];
  let hash = 0;
  for (let i = 0; i < typeName.length; i++) {
    hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hslToHex(Math.abs(hash) % 360, 40, 48);
}

function isLabelSignificant(label: string): boolean {
  if (label === "Input" || label === "Output") return false;
  if (/^Input \d+$/.test(label) || /^Output \d+$/.test(label)) return false;
  if (/^Input [A-Z]$/.test(label)) return false;
  if (/^Entry \d+$/.test(label)) return false;
  return true;
}

// ── Static handle resolution (mirrors useCompoundHandles without hooks) ──

function resolveHandlesStatic(rfType: string, edges: Edge[], nodeId: string): HandleDef[] {
  const staticHandles = getHandles(rfType);
  const config = COMPOUND_PORTS[rfType];
  if (!config) return staticHandles;

  const { arrayBase, label, category, minSlots } = config;
  const pattern = new RegExp(
    `^${arrayBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(\\d+)\\]$`,
  );

  const connectedIndices = new Set<number>();
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const match = pattern.exec(e.targetHandle ?? "");
    if (match) connectedIndices.add(parseInt(match[1]));
  }

  const maxConnected = connectedIndices.size > 0 ? Math.max(...connectedIndices) : -1;
  const slotCount = Math.max(minSlots, maxConnected + 2);

  const compoundHandles: HandleDef[] = [];
  for (let i = 0; i < slotCount; i++) {
    compoundHandles.push(categoryInput(`${arrayBase}[${i}]`, `${label} ${i}`, category));
  }

  const nonCompound = staticHandles.filter((h) => {
    if (h.type === "source") return true;
    return !pattern.test(h.id);
  });
  const otherInputs = nonCompound.filter((h) => h.type === "target");
  const outputs = nonCompound.filter((h) => h.type === "source");

  return [...compoundHandles, ...otherInputs, ...outputs];
}

/** Discover handles for GenericNode by inspecting edges. */
function resolveGenericHandles(nodeId: string, edges: Edge[]): HandleDef[] {
  const handles: HandleDef[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    if (e.target === nodeId && e.targetHandle && !seen.has(e.targetHandle)) {
      seen.add(e.targetHandle);
      handles.push({ id: e.targetHandle, label: e.targetHandle, type: "target", category: AssetCategory.Density });
    }
  }
  if (handles.length === 0) {
    handles.push({ id: "input", label: "Input", type: "target", category: AssetCategory.Density });
  }
  handles.push({ id: "output", label: "Output", type: "source", category: AssetCategory.Density });
  return handles;
}

/** Discover handles for GroupNode by inspecting edges. */
function resolveGroupHandles(nodeId: string, edges: Edge[]): HandleDef[] {
  const inHandles: HandleDef[] = [];
  const outHandles: HandleDef[] = [];
  const inIds = new Set<string>();
  const outIds = new Set<string>();
  for (const e of edges) {
    if (e.target === nodeId && e.targetHandle && !inIds.has(e.targetHandle)) {
      inIds.add(e.targetHandle);
      inHandles.push({ id: e.targetHandle, label: e.targetHandle, type: "target", category: AssetCategory.Density });
    }
    if (e.source === nodeId && e.sourceHandle && !outIds.has(e.sourceHandle)) {
      outIds.add(e.sourceHandle);
      outHandles.push({ id: e.sourceHandle, label: e.sourceHandle, type: "source", category: AssetCategory.Density });
    }
  }
  return [...inHandles, ...outHandles];
}

// ── Node render data ──────────────────────────────────────────────────────

type NodeVariant = "base" | "root" | "group" | "generic";

interface NodeRenderData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  variant: NodeVariant;
  headerColor: string;
  displayName: string;
  rawType: string;
  handles: HandleDef[];
  fields: [string, unknown][];
  groupChildCount?: number;
}

// ── Main export ───────────────────────────────────────────────────────────

export function generateSvg(
  reactFlow: ReactFlowInstance,
  options: SvgExportOptions,
): string {
  const { nodes, edges } = useEditorStore.getState();
  const flowDirection = useSettingsStore.getState().flowDirection;
  const { getTypeDisplayName } = getLanguageHelpers();
  const isLR = flowDirection === "LR";

  // ── 1. Build render data for each node ──────────────────────────────────

  const allNodeData: NodeRenderData[] = [];
  /** Map from "nodeId-source-handleId" or "nodeId-target-handleId" → absolute position */
  const handlePosMap = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    const rfType = node.type ?? "default";
    const data = node.data as Record<string, unknown>;
    const dataType = (data.type as string) ?? rfType;
    const fields = (data.fields ?? {}) as Record<string, unknown>;

    // Determine variant
    let variant: NodeVariant;
    if (rfType === "Root") variant = "root";
    else if (rfType === "group") variant = "group";
    else if (!(rfType in HANDLE_REGISTRY)) variant = "generic";
    else variant = "base";

    // Internal node from React Flow for measured dimensions + handle bounds
    const internal = reactFlow.getInternalNode(node.id);
    const posAbs = internal?.internals?.positionAbsolute ?? node.position;
    const measuredW = internal?.measured?.width;
    const measuredH = internal?.measured?.height;

    // Resolve handles
    let handles: HandleDef[];
    if (variant === "root") handles = getHandles("Root");
    else if (variant === "group") handles = resolveGroupHandles(node.id, edges);
    else if (variant === "generic") handles = resolveGenericHandles(node.id, edges);
    else handles = resolveHandlesStatic(rfType, edges, node.id);

    const inputs = handles.filter((h) => h.type === "target");
    const outputs = handles.filter((h) => h.type === "source");
    const maxRows = Math.max(inputs.length, outputs.length, variant === "root" ? 1 : 0);

    // Scalar fields for the children zone
    const scalarFields = Object.entries(fields).filter(
      ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean",
    );
    const showFields = variant !== "root" && variant !== "group" && scalarFields.length > 0;
    const fieldsZoneH = showFields ? scalarFields.length * 18 + 12 : 0;

    const width = measuredW ?? DEFAULT_NODE_W;
    const height = measuredH ?? (HEADER_H + maxRows * ROW_H + fieldsZoneH);

    // Header color
    let headerColor: string;
    if (variant === "root") {
      headerColor = ROOT_COLOR;
    } else if (variant === "group") {
      headerColor = GROUP_COLOR_END;
    } else if (variant === "generic") {
      headerColor = getGenericTypeColor(dataType);
    } else {
      const cat = getCategoryFromRfType(rfType);
      if (cat === AssetCategory.Density) {
        headerColor = getDensityAccentColor(dataType) ?? CATEGORY_COLORS[AssetCategory.Density];
      } else if (cat) {
        headerColor = CATEGORY_COLORS[cat];
      } else {
        headerColor = "#8C8878";
      }
    }

    // Display name
    const displayName =
      variant === "root"
        ? "ROOT"
        : variant === "group"
          ? ((data.label as string) ?? "Group")
          : getTypeDisplayName(dataType);

    // ── Handle positions ────────────────────────────────────────────────
    const hBounds = internal?.internals?.handleBounds;
    let usedBounds = false;

    if (hBounds) {
      for (const hb of hBounds.source ?? []) {
        if (!hb.id) continue;
        const ax = posAbs.x + hb.x + hb.width / 2;
        const ay = posAbs.y + hb.y + hb.height / 2;
        handlePosMap.set(`${node.id}-source-${hb.id}`, { x: ax, y: ay });
        usedBounds = true;
      }
      for (const hb of hBounds.target ?? []) {
        if (!hb.id) continue;
        const ax = posAbs.x + hb.x + hb.width / 2;
        const ay = posAbs.y + hb.y + hb.height / 2;
        handlePosMap.set(`${node.id}-target-${hb.id}`, { x: ax, y: ay });
        usedBounds = true;
      }
    }

    // Fallback: compute from layout constants
    if (!usedBounds) {
      const inputX = isLR ? 0 : width;
      const outputX = isLR ? width : 0;
      inputs.forEach((h, i) => {
        handlePosMap.set(`${node.id}-target-${h.id}`, {
          x: posAbs.x + inputX,
          y: posAbs.y + HEADER_H + handleTop(i),
        });
      });
      outputs.forEach((h, i) => {
        handlePosMap.set(`${node.id}-source-${h.id}`, {
          x: posAbs.x + outputX,
          y: posAbs.y + HEADER_H + handleTop(i),
        });
      });
    }

    // Group-specific data
    const groupChildCount =
      variant === "group" ? ((data._groupChildren as string[])?.length ?? 0) : undefined;

    allNodeData.push({
      id: node.id,
      x: posAbs.x,
      y: posAbs.y,
      width,
      height,
      variant,
      headerColor,
      displayName,
      rawType: dataType,
      handles,
      fields: scalarFields,
      groupChildCount,
    });
  }

  // ── 2. Viewport filtering ───────────────────────────────────────────────

  let visibleNodes = allNodeData;
  let visibleEdges = edges;

  if (options.scope === "viewport") {
    const vp = reactFlow.getViewport();
    const wrapper = document.querySelector(".react-flow");
    const wW = wrapper?.clientWidth ?? 1200;
    const wH = wrapper?.clientHeight ?? 800;

    const visLeft = -vp.x / vp.zoom;
    const visTop = -vp.y / vp.zoom;
    const visRight = (wW - vp.x) / vp.zoom;
    const visBottom = (wH - vp.y) / vp.zoom;

    visibleNodes = allNodeData.filter(
      (n) =>
        n.x + n.width >= visLeft &&
        n.x <= visRight &&
        n.y + n.height >= visTop &&
        n.y <= visBottom,
    );
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }

  // ── 3. Compute viewBox ──────────────────────────────────────────────────

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of visibleNodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 400;
    maxY = 300;
  }

  const pad = options.padding;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  // ── 4. Build SVG string ─────────────────────────────────────────────────

  const svg: string[] = [];

  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">`,
  );

  // Defs
  svg.push(`<defs>`);
  svg.push(
    `<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">`,
    `<feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />`,
    `<feOffset in="blur" dx="0" dy="2" result="shifted" />`,
    `<feFlood flood-color="#000000" flood-opacity="0.4" result="color" />`,
    `<feComposite in="color" in2="shifted" operator="in" result="shadow" />`,
    `<feMerge>`,
    `<feMergeNode in="shadow" />`,
    `<feMergeNode in="SourceGraphic" />`,
    `</feMerge>`,
    `</filter>`,
  );
  if (options.showGrid) {
    svg.push(
      `<pattern id="grid" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">`,
      `<path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="#333" stroke-width="0.5" />`,
      `</pattern>`,
    );
  }
  // Group gradient (defined once, referenced by all group nodes)
  svg.push(
    `<linearGradient id="groupGrad" x1="0" y1="0" x2="1" y2="0">`,
    `<stop offset="0%" stop-color="${GROUP_COLOR_START}" />`,
    `<stop offset="100%" stop-color="${GROUP_COLOR_END}" />`,
    `</linearGradient>`,
  );
  svg.push(`</defs>`);

  // Background
  svg.push(`<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="${CANVAS_BG}" />`);
  if (options.showGrid) {
    svg.push(`<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="url(#grid)" />`);
  }

  // ── Edges layer ─────────────────────────────────────────────────────────

  svg.push(`<g class="edges">`);

  for (const edge of visibleEdges) {
    const srcKey = `${edge.source}-source-${edge.sourceHandle ?? "output"}`;
    const tgtKey = `${edge.target}-target-${edge.targetHandle ?? "input"}`;
    const sp = handlePosMap.get(srcKey);
    const tp = handlePosMap.get(tgtKey);
    if (!sp || !tp) continue;

    // Bezier control point offset (matches React Flow default)
    const dx = tp.x - sp.x;
    const offset = Math.max(Math.abs(dx) * 0.5, 50);
    const cx1 = sp.x + (isLR ? offset : -offset);
    const cy1 = sp.y;
    const cx2 = tp.x + (isLR ? -offset : offset);
    const cy2 = tp.y;

    // Edge color from source output handle's category
    let edgeColor = "#666";
    const srcNode = allNodeData.find((n) => n.id === edge.source);
    if (srcNode) {
      const outH = srcNode.handles.find(
        (h) => h.type === "source" && h.id === (edge.sourceHandle ?? "output"),
      );
      if (outH) edgeColor = getHandleColor(outH.category);
    }

    svg.push(
      `<path d="M ${sp.x} ${sp.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${tp.x} ${tp.y}" ` +
        `fill="none" stroke="${edgeColor}" stroke-width="2" stroke-opacity="0.6" />`,
    );
  }

  svg.push(`</g>`);

  // ── Nodes layer ─────────────────────────────────────────────────────────

  svg.push(`<g class="nodes">`);

  for (const nd of visibleNodes) {
    svg.push(renderNodeSvg(nd, options.mode, flowDirection));
  }

  svg.push(`</g>`);
  svg.push(`</svg>`);

  return svg.join("\n");
}

// ── Per-node SVG rendering ────────────────────────────────────────────────

function renderNodeSvg(nd: NodeRenderData, mode: string, flowDirection: FlowDirection): string {
  const isLR = flowDirection === "LR";
  const w = nd.width;
  const inputs = nd.handles.filter((h) => h.type === "target");
  const outputs = nd.handles.filter((h) => h.type === "source");
  const maxRows = Math.max(inputs.length, outputs.length, nd.variant === "root" ? 1 : 0);
  const handleZoneH = maxRows * ROW_H;

  const showFields = nd.variant !== "root" && nd.variant !== "group" && nd.fields.length > 0;
  const fieldsH = showFields ? nd.fields.length * 18 + 12 : 0;
  const totalH = HEADER_H + handleZoneH + fieldsH;

  const p: string[] = [];
  p.push(`<g transform="translate(${nd.x}, ${nd.y})" filter="url(#shadow)">`);

  // Body
  p.push(`<rect width="${w}" height="${totalH}" rx="5" fill="${NODE_BG}" />`);

  // Header
  const headerFill = nd.variant === "group" ? "url(#groupGrad)" : nd.headerColor;
  p.push(`<rect width="${w}" height="${HEADER_H}" rx="5" fill="${headerFill}" />`);
  // Square off bottom corners of header (overlap with a non-rounded rect)
  p.push(`<rect x="0" y="${HEADER_H - 5}" width="${w}" height="5" fill="${headerFill}" />`);

  // Header text
  const nameY = nd.variant !== "root" && nd.displayName !== nd.rawType
    ? HEADER_H / 2 - 3
    : HEADER_H / 2 + 1;
  p.push(
    `<text x="12" y="${nameY}" dominant-baseline="middle" ` +
      `font-family="${FONT}" font-size="11" font-weight="600" fill="white">${escXml(nd.displayName)}</text>`,
  );

  // Raw type subtext (when display name differs, or always in debug mode)
  if (nd.variant !== "root" && nd.variant !== "group") {
    if (mode === "debug" || nd.displayName !== nd.rawType) {
      p.push(
        `<text x="12" y="${HEADER_H / 2 + 8}" dominant-baseline="middle" ` +
          `font-family="${FONT}" font-size="8" fill="#ffffff" fill-opacity="0.5">${escXml(nd.rawType)}</text>`,
      );
    }
  }

  // Group node child count badge
  if (nd.variant === "group" && nd.groupChildCount !== undefined) {
    const bx = w - 32;
    const by = (HEADER_H - 16) / 2;
    p.push(`<rect x="${bx}" y="${by}" width="24" height="16" rx="3" fill="#000000" fill-opacity="0.3" />`);
    p.push(
      `<text x="${bx + 12}" y="${HEADER_H / 2 + 1}" text-anchor="middle" dominant-baseline="middle" ` +
        `font-family="${FONT}" font-size="9" fill="white">${nd.groupChildCount}</text>`,
    );
  }

  // ── Handles ───────────────────────────────────────────────────────────

  const inputX = isLR ? 0 : w;
  const outputX = isLR ? w : 0;
  const labelInX = isLR ? 16 : w - 16;
  const labelOutX = isLR ? w - 16 : 16;
  const anchorIn = isLR ? "start" : "end";
  const anchorOut = isLR ? "end" : "start";
  const showIdx = inputs.length >= 2;
  const showOutIdx = outputs.length >= 2;

  for (let i = 0; i < inputs.length; i++) {
    const h = inputs[i];
    const cy = HEADER_H + handleTop(i);
    p.push(
      `<circle cx="${inputX}" cy="${cy}" r="${HANDLE_RADIUS}" fill="${INPUT_HANDLE_COLOR}" stroke="${HANDLE_STROKE_COLOR}" stroke-opacity="${HANDLE_STROKE_OPACITY}" stroke-width="2" />`,
    );
    if (isLabelSignificant(h.label) || showIdx) {
      const lbl = showIdx
        ? isLabelSignificant(h.label)
          ? `[${i}] ${h.label}`
          : `[${i}]`
        : h.label;
      p.push(
        `<text x="${labelInX}" y="${cy}" dominant-baseline="middle" text-anchor="${anchorIn}" ` +
          `font-family="${FONT}" font-size="10" fill="#8C8878">${escXml(lbl)}</text>`,
      );
    }
  }

  for (let i = 0; i < outputs.length; i++) {
    const h = outputs[i];
    const cy = HEADER_H + handleTop(i);
    const color = getHandleColor(h.category);
    p.push(
      `<circle cx="${outputX}" cy="${cy}" r="${HANDLE_RADIUS}" fill="${color}" stroke="${HANDLE_STROKE_COLOR}" stroke-opacity="${HANDLE_STROKE_OPACITY}" stroke-width="2" />`,
    );
    if (isLabelSignificant(h.label) || showOutIdx) {
      const lbl = showOutIdx
        ? isLabelSignificant(h.label)
          ? `[${i}] ${h.label}`
          : `[${i}]`
        : h.label;
      p.push(
        `<text x="${labelOutX}" y="${cy}" dominant-baseline="middle" text-anchor="${anchorOut}" ` +
          `font-family="${FONT}" font-size="10" fill="#8C8878">${escXml(lbl)}</text>`,
      );
    }
  }

  // ── Fields zone ───────────────────────────────────────────────────────

  if (showFields) {
    const fieldY = HEADER_H + handleZoneH;
    p.push(
      `<line x1="0" y1="${fieldY}" x2="${w}" y2="${fieldY}" stroke="${nd.headerColor}" stroke-opacity="0.2" stroke-width="1" />`,
    );
    for (let i = 0; i < nd.fields.length; i++) {
      const [key, value] = nd.fields[i];
      const y = fieldY + 10 + i * 18 + 4;
      const displayValue =
        typeof value === "boolean" ? (value ? "true" : "false") : String(value);
      p.push(
        `<text x="12" y="${y}" font-family="${FONT}" font-size="10" fill="#8C8878">${escXml(key)}</text>`,
      );
      p.push(
        `<text x="${w - 12}" y="${y}" text-anchor="end" font-family="monospace, ${FONT}" font-size="10" fill="#ccc">${escXml(displayValue)}</text>`,
      );
    }
  }

  // Debug mode: node ID overlay
  if (mode === "debug") {
    p.push(
      `<text x="${w / 2}" y="${totalH + 14}" text-anchor="middle" ` +
        `font-family="${FONT}" font-size="8" fill="#ffffff" fill-opacity="0.4">${escXml(nd.id)}</text>`,
    );
  }

  p.push(`</g>`);
  return p.join("\n");
}

// ── File writing ──────────────────────────────────────────────────────────

export async function writeSvgToFile(svgString: string): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@/utils/ipc");
  const addToast = useToastStore.getState().addToast;

  const exportPath = useSettingsStore.getState().exportPath;
  const filePath = await save({
    defaultPath: exportPath ? `${exportPath}/graph.svg` : undefined,
    filters: [{ name: "SVG Image", extensions: ["svg"] }],
  });
  if (!filePath) return;

  await writeTextFile(filePath, svgString);

  // Remember directory for next export
  const dirPortion = filePath.replace(/[/\\][^/\\]+$/, "");
  useSettingsStore.getState().setExportPath(dirPortion);

  addToast(`Exported SVG to ${filePath}`, "success");
}
