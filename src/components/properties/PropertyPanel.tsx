import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useFieldChange } from "@/hooks/useFieldChange";
import { SliderField } from "./SliderField";
import { VectorField } from "./VectorField";
import { RangeField } from "./RangeField";
import { ToggleField } from "./ToggleField";
import { TextField } from "./TextField";
import { ArrayField } from "./ArrayField";
import { CurveCanvas } from "./CurveCanvas";
import { CurvePointList } from "./CurvePointList";
import { BiomeDashboard } from "./BiomeDashboard";
import { SettingsPanel } from "./SettingsPanel";
import { PropOverviewPanel } from "./PropOverviewPanel";
import { MaterialLayerStack } from "./MaterialLayerStack";
import { AtmosphereTab } from "./AtmosphereTab";
import { DebugTab } from "./DebugTab";
import { PropPlacementGrid } from "./PropPlacementGrid";
import { POSITION_TYPE_NAMES } from "@/utils/positionEvaluator";
import { getCurveEvaluator } from "@/utils/curveEvaluators";
import { validateField, type ValidationIssue } from "@/schema/validation";
import { FIELD_CONSTRAINTS } from "@/schema/constraints";
import { NODE_TIPS } from "@/schema/nodeTips";
import { FIELD_DESCRIPTIONS, getShortDescription, getExtendedDescription } from "@/schema/fieldDescriptions";
import { useLanguage } from "@/languages/useLanguage";
import { listDirectory, readAssetFile, type DirectoryEntryData } from "@/utils/ipc";

const DEFAULT_BIOME_TINT_COLORS = ["#5b9e28", "#6ca229", "#7ea629"] as const;

export function applyBiomeTintBand(
  tintProvider: Record<string, unknown> | undefined,
  index: number,
  color: string,
): Record<string, unknown> {
  const sourceTintProvider = tintProvider ?? {};
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
    delimiters[band] = {
      ...existing,
      Tint: { ...existingTint, Color: existingColor },
    };
  }

  const targetDelimiter = delimiters[index] ?? {};
  const targetTint = (targetDelimiter.Tint as Record<string, unknown>) ?? {};
  delimiters[index] = { ...targetDelimiter, Tint: { ...targetTint, Color: color } };

  return {
    ...sourceTintProvider,
    Type: typeof sourceTintProvider.Type === "string" ? sourceTintProvider.Type : "DensityDelimited",
    Delimiters: delimiters,
  };
}

export interface DelimiterValidationIssue {
  kind:
    | "invalid-range"
    | "missing-range"
    | "overlap"
    | "gap"
    | "missing-environment"
    | "unknown-environment"
    | "unsupported-environment-type";
  message: string;
  severity: "error" | "warning";
  delimiterIndex?: number;
}

type DelimiterEnvironmentProviderType = "Constant" | "Default" | "Imported";

interface DelimiterEnvironmentReference {
  providerType: DelimiterEnvironmentProviderType;
  name: string;
  rawType: string | null;
}

const DELIMITER_ENVIRONMENT_PROVIDER_TYPES: DelimiterEnvironmentProviderType[] = [
  "Constant",
  "Default",
  "Imported",
];

interface EnvironmentNameLookup {
  status: "idle" | "loading" | "ready" | "error";
  names: string[];
  source: "project-server" | "workspace-schema" | null;
  typeHints: string[];
  workspacePath: string | null;
  error: string | null;
}

const ENVIRONMENT_LOOKUP_CACHE = new Map<string, Promise<string[]>>();
const WORKSPACE_ENVIRONMENT_HINT_CACHE = new Map<string, Promise<string[]>>();
const RANGE_EPSILON = 1e-6;
const WORKSPACE_FILE_NAME = "_Workspace.json";
const WORKSPACE_SUFFIX = "Client\\NodeEditor\\Workspaces\\HytaleGenerator Java";
const ROAMING_WORKSPACE_SUFFIX = `AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\${WORKSPACE_SUFFIX}`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeEnvironmentName(value: string): string {
  return value.trim().replace(/\.json$/i, "");
}

function readDelimiterRangeMin(delimiter: Record<string, unknown>): number | null {
  const range = asRecord(delimiter.Range);
  if (!range) return null;
  return (
    toFiniteNumber(range.MinInclusive)
    ?? toFiniteNumber(range.Min)
    ?? toFiniteNumber(range.From)
  );
}

function readDelimiterRangeMax(delimiter: Record<string, unknown>): number | null {
  const range = asRecord(delimiter.Range);
  if (!range) return null;
  return (
    toFiniteNumber(range.MaxExclusive)
    ?? toFiniteNumber(range.Max)
    ?? toFiniteNumber(range.To)
  );
}

function isDelimiterEnvironmentProviderType(
  value: string,
): value is DelimiterEnvironmentProviderType {
  return DELIMITER_ENVIRONMENT_PROVIDER_TYPES.includes(value as DelimiterEnvironmentProviderType);
}

function readDelimiterEnvironmentReference(
  delimiter: Record<string, unknown>,
): DelimiterEnvironmentReference {
  const rawEnvironment = delimiter.Environment;
  if (typeof rawEnvironment === "string") {
    return {
      providerType: "Constant",
      name: normalizeEnvironmentName(rawEnvironment),
      rawType: "Constant",
    };
  }

  const rawObject = asRecord(rawEnvironment);
  if (!rawObject) {
    return {
      providerType: "Constant",
      name: "",
      rawType: null,
    };
  }

  const rawType = typeof rawObject.Type === "string" ? rawObject.Type : null;
  const providerType = rawType && isDelimiterEnvironmentProviderType(rawType)
    ? rawType
    : "Constant";

  if (providerType === "Default") {
    return {
      providerType,
      name: "",
      rawType,
    };
  }

  if (providerType === "Imported") {
    return {
      providerType,
      name: typeof rawObject.Name === "string" ? normalizeEnvironmentName(rawObject.Name) : "",
      rawType,
    };
  }

  const constantName =
    typeof rawObject.Environment === "string"
      ? normalizeEnvironmentName(rawObject.Environment)
      : typeof rawObject.Name === "string"
        ? normalizeEnvironmentName(rawObject.Name)
        : "";
  return {
    providerType,
    name: constantName,
    rawType,
  };
}

function writeDelimiterEnvironmentReference(
  delimiter: Record<string, unknown>,
  providerType: DelimiterEnvironmentProviderType,
  rawName: string,
): Record<string, unknown> {
  const name = normalizeEnvironmentName(rawName);
  const existing = asRecord(delimiter.Environment) ? { ...(delimiter.Environment as Record<string, unknown>) } : {};
  delete existing.Environment;
  delete existing.Name;
  delete existing.BiomeId;

  const nextEnvironment: Record<string, unknown> = {
    ...existing,
    Type: providerType,
  };

  if (providerType === "Constant") {
    nextEnvironment.Environment = name;
  } else if (providerType === "Imported") {
    nextEnvironment.Name = name;
  }

  return {
    ...delimiter,
    Environment: nextEnvironment,
  };
}

function writeDelimiterEnvironmentType(
  delimiter: Record<string, unknown>,
  providerType: DelimiterEnvironmentProviderType,
): Record<string, unknown> {
  const reference = readDelimiterEnvironmentReference(delimiter);
  return writeDelimiterEnvironmentReference(delimiter, providerType, reference.name);
}

function writeDelimiterRangeValue(
  delimiter: Record<string, unknown>,
  key: "MinInclusive" | "MaxExclusive",
  rawValue: string,
): Record<string, unknown> {
  const parsed =
    rawValue.trim() === ""
      ? null
      : Number.isFinite(Number(rawValue))
        ? Number(rawValue)
        : undefined;
  if (parsed === undefined) return delimiter;

  const existingRange = asRecord(delimiter.Range) ? { ...(delimiter.Range as Record<string, unknown>) } : {};
  delete existingRange.Min;
  delete existingRange.Max;
  delete existingRange.From;
  delete existingRange.To;

  if (parsed === null) {
    delete existingRange[key];
  } else {
    existingRange[key] = parsed;
  }

  return {
    ...delimiter,
    Range: existingRange,
  };
}

function writeDelimiterEnvironmentName(
  delimiter: Record<string, unknown>,
  rawEnvironmentName: string,
): Record<string, unknown> {
  const reference = readDelimiterEnvironmentReference(delimiter);
  return writeDelimiterEnvironmentReference(
    delimiter,
    reference.providerType,
    rawEnvironmentName,
  );
}

function formatRangeValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function validateEnvironmentDelimiters(
  delimiters: Array<Record<string, unknown>>,
  knownEnvironmentNames: string[],
): DelimiterValidationIssue[] {
  const issues: DelimiterValidationIssue[] = [];
  const knownNames = new Set(knownEnvironmentNames.map((name) => normalizeEnvironmentName(name).toLowerCase()));
  const ranges: Array<{ index: number; min: number; max: number }> = [];

  for (let index = 0; index < delimiters.length; index++) {
    const delimiter = delimiters[index];
    const min = readDelimiterRangeMin(delimiter);
    const max = readDelimiterRangeMax(delimiter);
    const environmentReference = readDelimiterEnvironmentReference(delimiter);
    const environmentName = environmentReference.name;

    if (min === null || max === null) {
      issues.push({
        kind: "missing-range",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] is missing MinInclusive or MaxExclusive.`,
      });
    } else if (min >= max) {
      issues.push({
        kind: "invalid-range",
        severity: "error",
        delimiterIndex: index,
        message: `Delimiter [${index}] has MinInclusive >= MaxExclusive.`,
      });
    } else {
      ranges.push({ index, min, max });
    }

    if (
      environmentReference.rawType &&
      !isDelimiterEnvironmentProviderType(environmentReference.rawType)
    ) {
      issues.push({
        kind: "unsupported-environment-type",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] uses unsupported environment provider type "${environmentReference.rawType}".`,
      });
    }

    if (
      environmentReference.providerType !== "Default"
      && !environmentName
    ) {
      issues.push({
        kind: "missing-environment",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] is missing an environment reference.`,
      });
    }

    if (
      environmentReference.providerType === "Constant"
      && environmentName
      && knownNames.size > 0
      && !knownNames.has(environmentName.toLowerCase())
    ) {
      issues.push({
        kind: "unknown-environment",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] references unknown environment "${environmentName}".`,
      });
    }
  }

  ranges.sort((a, b) => (a.min === b.min ? a.max - b.max : a.min - b.min));
  for (let i = 1; i < ranges.length; i++) {
    const previous = ranges[i - 1];
    const current = ranges[i];

    if (current.min < previous.max - RANGE_EPSILON) {
      issues.push({
        kind: "overlap",
        severity: "warning",
        delimiterIndex: current.index,
        message: `Delimiter [${previous.index}] overlaps [${current.index}] (${formatRangeValue(current.min)} < ${formatRangeValue(previous.max)}).`,
      });
    } else if (current.min > previous.max + RANGE_EPSILON) {
      issues.push({
        kind: "gap",
        severity: "warning",
        delimiterIndex: current.index,
        message: `Gap in delimiter coverage between ${formatRangeValue(previous.max)} and ${formatRangeValue(current.min)}.`,
      });
    }
  }

  return issues;
}

function findServerRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  const marker = "/server/";
  const markerIndex = normalized.toLowerCase().lastIndexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(0, markerIndex + marker.length - 1).replace(/\//g, "\\");
  }
  if (normalized.toLowerCase().endsWith("/server")) {
    return normalized.replace(/\//g, "\\");
  }
  return null;
}

function getParentPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return null;
  return normalized.slice(0, index).replace(/\//g, "\\");
}

function joinWindowsPath(base: string, child: string): string {
  return `${base.replace(/[\\/]+$/, "")}\\${child}`;
}

function inferServerRoot(currentFile: string | null, projectPath: string | null): string | null {
  const fromCurrentFile = findServerRoot(currentFile);
  if (fromCurrentFile) return fromCurrentFile;

  const fromProjectPath = findServerRoot(projectPath);
  if (fromProjectPath) return fromProjectPath;

  if (!projectPath) return null;
  if (projectPath.toLowerCase().endsWith("\\hytalegenerator")) {
    return getParentPath(projectPath);
  }
  return joinWindowsPath(projectPath, "Server");
}

function inferUserProfileRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\//g, "\\");
  const match = /^[A-Za-z]:\\Users\\[^\\]+/i.exec(normalized);
  return match ? match[0] : null;
}

function deriveWorkspacePathFromServerRoot(serverRoot: string): string | null {
  const gameRoot = getParentPath(serverRoot);
  if (!gameRoot) return null;
  return joinWindowsPath(gameRoot, WORKSPACE_SUFFIX);
}

function buildWorkspaceCandidates(
  currentFile: string | null,
  projectPath: string | null,
  serverRoot: string | null,
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (candidate: string | null) => {
    if (!candidate) return;
    const normalized = candidate.replace(/\//g, "\\").replace(/[\\/]+$/, "");
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(normalized);
  };

  pushCandidate(serverRoot ? deriveWorkspacePathFromServerRoot(serverRoot) : null);

  const profileRoot =
    inferUserProfileRoot(currentFile)
    ?? inferUserProfileRoot(projectPath);
  if (profileRoot) {
    pushCandidate(joinWindowsPath(profileRoot, ROAMING_WORKSPACE_SUFFIX));
  }

  return candidates;
}

export function deriveServerRootFromWorkspacePath(workspacePath: string): string | null {
  if (!workspacePath) return null;
  const normalized = workspacePath.replace(/\//g, "\\").replace(/[\\/]+$/, "");
  const lower = normalized.toLowerCase();
  const marker = `\\${WORKSPACE_SUFFIX.toLowerCase()}`;
  const markerIndex = lower.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return `${normalized.slice(0, markerIndex)}\\Server`;
  }

  const workspacesDir = getParentPath(normalized);
  const nodeEditorDir = workspacesDir ? getParentPath(workspacesDir) : null;
  const clientDir = nodeEditorDir ? getParentPath(nodeEditorDir) : null;
  const gameRoot = clientDir ? getParentPath(clientDir) : null;
  return gameRoot ? joinWindowsPath(gameRoot, "Server") : null;
}

export function extractWorkspaceEnvironmentTypeHints(workspaceDoc: unknown): string[] {
  const workspace = asRecord(workspaceDoc);
  if (!workspace) return [];
  const variants = asRecord(workspace.Variants);
  if (!variants) return [];
  const environmentVariants = asRecord(variants["EnvironmentProvider.Variants"]);
  if (!environmentVariants) return [];
  const entries = asRecord(environmentVariants.Variants);
  if (!entries) return [];
  return Object.keys(entries).sort((a, b) => a.localeCompare(b));
}

async function loadWorkspaceEnvironmentTypeHints(workspacePath: string): Promise<string[]> {
  const cacheKey = workspacePath.toLowerCase();
  const existing = WORKSPACE_ENVIRONMENT_HINT_CACHE.get(cacheKey);
  if (existing) return existing;

  const pending = readAssetFile(joinWindowsPath(workspacePath, WORKSPACE_FILE_NAME))
    .then((workspaceDoc) => extractWorkspaceEnvironmentTypeHints(workspaceDoc))
    .catch((error) => {
      WORKSPACE_ENVIRONMENT_HINT_CACHE.delete(cacheKey);
      throw error;
    });
  WORKSPACE_ENVIRONMENT_HINT_CACHE.set(cacheKey, pending);
  return pending;
}

function collectJsonPaths(entries: DirectoryEntryData[]): string[] {
  const stack = [...entries];
  const jsonPaths: string[] = [];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.is_dir) {
      if (Array.isArray(entry.children)) {
        for (const child of entry.children) stack.push(child);
      }
      continue;
    }
    if (entry.path.toLowerCase().endsWith(".json")) {
      jsonPaths.push(entry.path);
    }
  }
  return jsonPaths;
}

function getFileStem(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const filename = normalized.slice(normalized.lastIndexOf("/") + 1);
  return filename.replace(/\.json$/i, "");
}

function collectEnvironmentNames(entries: DirectoryEntryData[]): string[] {
  const names = new Map<string, string>();
  const paths = collectJsonPaths(entries).sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    const name = getFileStem(path);
    const key = name.toLowerCase();
    if (!names.has(key)) {
      names.set(key, name);
    }
  }
  return [...names.values()];
}

async function loadEnvironmentNames(serverRoot: string): Promise<string[]> {
  const cacheKey = serverRoot.toLowerCase();
  const existing = ENVIRONMENT_LOOKUP_CACHE.get(cacheKey);
  if (existing) return existing;

  const pending = listDirectory(joinWindowsPath(serverRoot, "Environments"))
    .then((entries) => collectEnvironmentNames(entries))
    .catch((error) => {
      ENVIRONMENT_LOOKUP_CACHE.delete(cacheKey);
      throw error;
    });
  ENVIRONMENT_LOOKUP_CACHE.set(cacheKey, pending);
  return pending;
}

interface ResolvedEnvironmentLookup {
  names: string[];
  source: "project-server" | "workspace-schema";
  typeHints: string[];
  workspacePath: string | null;
  warning: string | null;
}

async function resolveEnvironmentLookup(
  currentFile: string | null,
  projectPath: string | null,
): Promise<ResolvedEnvironmentLookup> {
  const inferredServerRoot = inferServerRoot(currentFile, projectPath);
  if (inferredServerRoot) {
    try {
      const names = await loadEnvironmentNames(inferredServerRoot);
      return {
        names,
        source: "project-server",
        typeHints: [],
        workspacePath: null,
        warning: null,
      };
    } catch {
      // Fall back to workspace schema/asset paths below.
    }
  }

  const workspaceCandidates = buildWorkspaceCandidates(currentFile, projectPath, inferredServerRoot);
  if (workspaceCandidates.length === 0) {
    throw new Error("Could not infer Server/Environments or NodeEditor workspace paths.");
  }

  let lastError: string | null = null;
  for (const workspacePath of workspaceCandidates) {
    try {
      const typeHints = await loadWorkspaceEnvironmentTypeHints(workspacePath);
      const fallbackServerRoot = deriveServerRootFromWorkspacePath(workspacePath);
      let names: string[] = [];
      let warning: string | null = null;

      if (fallbackServerRoot) {
        try {
          names = await loadEnvironmentNames(fallbackServerRoot);
        } catch (error) {
          warning = `Loaded workspace schema from ${workspacePath}, but Server/Environments lookup failed: ${String(error)}`;
        }
      } else {
        warning = `Loaded workspace schema from ${workspacePath}, but could not derive a Server root.`;
      }

      return {
        names,
        source: "workspace-schema",
        typeHints,
        workspacePath,
        warning,
      };
    } catch (error) {
      lastError = String(error);
    }
  }

  throw new Error(lastError ?? "Failed to load workspace schema fallback.");
}

export function PropertyPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const commitState = useEditorStore((s) => s.commitState);
  const setDirty = useProjectStore((s) => s.setDirty);
  const currentFile = useProjectStore((s) => s.currentFile);
  const projectPath = useProjectStore((s) => s.projectPath);
  const editingContext = useEditorStore((s) => s.editingContext);
  const { getTypeDisplayName, getFieldDisplayName, getFieldTransform } = useLanguage();
  const helpMode = useUIStore((s) => s.helpMode);
  const toggleHelpMode = useUIStore((s) => s.toggleHelpMode);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [environmentLookup, setEnvironmentLookup] = useState<EnvironmentNameLookup>({
    status: "idle",
    names: [],
    source: null,
    typeHints: [],
    workspacePath: null,
    error: null,
  });
  const noiseRangeConfig = useEditorStore((s) => s.noiseRangeConfig);
  const setNoiseRangeConfig = useEditorStore((s) => s.setNoiseRangeConfig);
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const setBiomeConfig = useEditorStore((s) => s.setBiomeConfig);
  const settingsConfig = useEditorStore((s) => s.settingsConfig);
  const setSettingsConfig = useEditorStore((s) => s.setSettingsConfig);
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);

  const hasPendingSnapshotRef = useRef(false);
  const lastChangedFieldRef = useRef<{ field: string; nodeType: string }>({ field: "", nodeType: "" });

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const selectedNodeData = selectedNode?.data as Record<string, unknown> | undefined;
  const selectedNodeType = typeof selectedNodeData?.type === "string" ? selectedNodeData.type : "";
  const selectedNodeBiomeField = typeof selectedNodeData?._biomeField === "string"
    ? selectedNodeData._biomeField
    : "";
  const shouldLoadEnvironmentNames =
    selectedNode?.type === "Environment:DensityDelimited"
    || (selectedNodeType === "DensityDelimited" && selectedNodeBiomeField === "EnvironmentProvider");

  useEffect(() => {
    if (!shouldLoadEnvironmentNames) {
      setEnvironmentLookup({
        status: "idle",
        names: [],
        source: null,
        typeHints: [],
        workspacePath: null,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setEnvironmentLookup((prev) => ({
      status: "loading",
      names: prev.names,
      source: prev.source,
      typeHints: prev.typeHints,
      workspacePath: prev.workspacePath,
      error: null,
    }));

    void resolveEnvironmentLookup(currentFile, projectPath)
      .then((lookup) => {
        if (cancelled) return;
        setEnvironmentLookup({
          status: "ready",
          names: lookup.names,
          source: lookup.source,
          typeHints: lookup.typeHints,
          workspacePath: lookup.workspacePath,
          error: lookup.warning,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setEnvironmentLookup({
          status: "error",
          names: [],
          source: null,
          typeHints: [],
          workspacePath: null,
          error: String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoadEnvironmentNames, currentFile, projectPath]);

  /**
   * Flush any pending history snapshot immediately.
   */
  const flushPendingSnapshot = useCallback(() => {
    if (hasPendingSnapshotRef.current) {
      const { field, nodeType } = lastChangedFieldRef.current;
      commitState(field ? `Edit ${field} on ${nodeType}` : "Edit");
      hasPendingSnapshotRef.current = false;
    }
  }, [commitState]);

  /**
   * For discrete changes (toggle clicks): update field then commit.
   */
  const handleDiscreteChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (!selectedNodeId) return;
      flushPendingSnapshot();
      const node = useEditorStore.getState().nodes.find((n) => n.id === selectedNodeId);
      const nodeType = (node?.data as Record<string, unknown>)?.type as string ?? "node";
      updateNodeField(selectedNodeId, fieldName, value);
      commitState(`Edit ${fieldName} on ${nodeType}`);
      setDirty(true);
    },
    [selectedNodeId, commitState, updateNodeField, setDirty, flushPendingSnapshot],
  );

  /**
   * For continuous changes (slider drags, text typing): update immediately
   * but only commit to history on blur (interaction end) so a single drag
   * produces exactly one undo entry.
   */
  const handleContinuousChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (!selectedNodeId) return;

      // Track field name + node type for descriptive history label
      const node = useEditorStore.getState().nodes.find((n) => n.id === selectedNodeId);
      const nodeType = (node?.data as Record<string, unknown>)?.type as string ?? "node";
      lastChangedFieldRef.current = { field: fieldName, nodeType };

      updateNodeField(selectedNodeId, fieldName, value);
      setDirty(true);

      // Mark that we have uncommitted changes — commit happens on blur
      hasPendingSnapshotRef.current = true;
    },
    [selectedNodeId, updateNodeField, setDirty],
  );

  /**
   * On blur, flush any pending snapshot so undo state is clean before
   * other actions (like deletion) can occur.
   */
  const handleBlur = useCallback(() => {
    flushPendingSnapshot();
  }, [flushPendingSnapshot]);

  // Flush pending snapshot when switching nodes so changes aren't lost
  useEffect(() => {
    return () => {
      flushPendingSnapshot();
    };
  }, [selectedNodeId, flushPendingSnapshot]);

  const { debouncedChange: debouncedConfigChange, flush: flushConfig } = useFieldChange(commitState, setDirty, 300);

  const handleConfigBlur = useCallback(() => {
    flushConfig();
  }, [flushConfig]);

  const handleNoiseRangeConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!noiseRangeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setNoiseRangeConfig({ ...noiseRangeConfig, [field]: value }));
    },
    [noiseRangeConfig, setNoiseRangeConfig, debouncedConfigChange],
  );

  const handleBiomeConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!biomeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setBiomeConfig({ ...biomeConfig, [field]: value }));
    },
    [biomeConfig, setBiomeConfig, debouncedConfigChange],
  );

  const handleSettingsConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!settingsConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setSettingsConfig({ ...settingsConfig, [field]: value }));
    },
    [settingsConfig, setSettingsConfig, debouncedConfigChange],
  );

  const handleBiomeTintChange = useCallback(
    (field: string, value: string) => {
      if (!biomeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => {
        // Handle Delimiters[n].Tint.Color path written by AtmosphereTab
        const delimPattern = /^Delimiters\[(\d+)\]\.Tint\.Color$/;
        const delimMatch = delimPattern.exec(field);
        if (delimMatch) {
          const idx = parseInt(delimMatch[1], 10);
          const updatedTint = applyBiomeTintBand(
            biomeConfig.TintProvider as Record<string, unknown> | undefined,
            idx,
            value,
          );
          setBiomeConfig({ ...biomeConfig, TintProvider: updatedTint });
        } else {
          // Legacy flat field path
          const tint = { ...(biomeConfig.TintProvider as Record<string, unknown>), [field]: value };
          setBiomeConfig({ ...biomeConfig, TintProvider: tint });
        }
      });
    },
    [biomeConfig, setBiomeConfig, debouncedConfigChange],
  );

  const handlePropMetaChange = useCallback(
    (index: number, field: string, value: unknown) => {
      if (!biomeConfig) return;
      const propMeta = [...biomeConfig.propMeta];
      propMeta[index] = { ...propMeta[index], [field]: value };
      setBiomeConfig({ ...biomeConfig, propMeta });
      setDirty(true);
      commitState(`Edit prop ${field}`);
    },
    [biomeConfig, setBiomeConfig, commitState, setDirty],
  );

  if (!selectedNode) {
    if (editingContext === "NoiseRange" && noiseRangeConfig) {
      return (
        <div className="flex flex-col p-3 gap-3">
          <div className="border-b border-tn-border pb-2">
            <h3 className="text-sm font-semibold">NoiseRange Config</h3>
            <p className="text-xs text-tn-text-muted">Global biome range settings</p>
          </div>
          <TextField
            label="DefaultBiome"
            value={noiseRangeConfig.DefaultBiome}
            onChange={(v) => handleNoiseRangeConfigChange("DefaultBiome", v)}
            onBlur={handleConfigBlur}
          />
          <SliderField
            label="DefaultTransitionDistance"
            value={noiseRangeConfig.DefaultTransitionDistance}
            min={0}
            max={128}
            step={1}
            onChange={(v) => handleNoiseRangeConfigChange("DefaultTransitionDistance", v)}
            onBlur={handleConfigBlur}
          />
          <SliderField
            label="MaxBiomeEdgeDistance"
            value={noiseRangeConfig.MaxBiomeEdgeDistance}
            min={0}
            max={128}
            step={1}
            onChange={(v) => handleNoiseRangeConfigChange("MaxBiomeEdgeDistance", v)}
            onBlur={handleConfigBlur}
          />
        </div>
      );
    }

    if (editingContext === "Settings" && settingsConfig) {
      return (
        <SettingsPanel
          onSettingsConfigChange={handleSettingsConfigChange}
          onBlur={handleConfigBlur}
        />
      );
    }

    if (editingContext === "Biome" && biomeConfig) {
      return (
        <BiomeInspector
          activeBiomeSection={activeBiomeSection}
          onBiomeConfigChange={handleBiomeConfigChange}
          onBiomeTintChange={handleBiomeTintChange}
          onPropMetaChange={handlePropMetaChange}
          onBlur={handleConfigBlur}
        />
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-tn-text-muted text-center">
          Select a node to edit its properties
        </p>
      </div>
    );
  }

  const data = selectedNode.data as Record<string, unknown>;
  const fields = (data.fields as Record<string, unknown>) ?? {};
  const typeName = (data.type as string) ?? "Unknown";
  const rfType = selectedNode.type ?? typeName;
  const rfDisplayName = getTypeDisplayName(rfType);
  const displayTypeName = (rfDisplayName !== rfType) ? rfDisplayName : getTypeDisplayName(typeName);
  const typeConstraints = FIELD_CONSTRAINTS[displayTypeName] ?? FIELD_CONSTRAINTS[typeName] ?? {};
  const tips = NODE_TIPS[rfType] ?? NODE_TIPS[typeName] ?? [];
  const typeDescriptions = FIELD_DESCRIPTIONS[rfType] ?? FIELD_DESCRIPTIONS[typeName] ?? {};
  const isCurveNode = selectedNode.type?.startsWith("Curve:") ?? false;
  const isManualCurve = selectedNode.type === "Curve:Manual";
  const isPositionNode = (selectedNode.type?.startsWith("Position:") ?? false) || (POSITION_TYPE_NAMES as readonly string[]).includes(typeName);
  const isEnvironmentDensityDelimitedNode =
    rfType === "Environment:DensityDelimited"
    || (typeName === "DensityDelimited" && (data._biomeField as string | undefined) === "EnvironmentProvider");

  return (
    <div className="flex flex-col p-3 gap-3">
      <div className="border-b border-tn-border pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{displayTypeName}</h3>
          <button
            onClick={toggleHelpMode}
            title={helpMode ? "Exit help mode (?)" : "Toggle help mode (?)"}
            className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
              helpMode
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-tn-border text-tn-text-muted hover:border-tn-text-muted"
            }`}
          >
            ?
          </button>
        </div>
        <p className="text-xs text-tn-text-muted">ID: {selectedNode.id}</p>
      </div>

      {helpMode && (
        <div className="text-[10px] px-2 py-1.5 rounded border bg-sky-500/10 border-sky-500/30 text-sky-300 flex items-center gap-1.5">
          <span className="font-bold">?</span>
          <span>Help mode active — click any field for extended docs. Press <kbd className="px-1 py-0.5 bg-sky-500/20 rounded text-[9px]">?</kbd> to exit.</span>
        </div>
      )}

      {tips.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tips.map((tip, i) => (
            <div
              key={i}
              className={`text-[11px] leading-relaxed px-2.5 py-2 rounded border ${
                tip.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-300"
              }`}
            >
              <span className="font-semibold">
                {tip.severity === "warning" ? "Tip: " : "Info: "}
              </span>
              {tip.message}
            </div>
          ))}
        </div>
      )}

      {Object.entries(fields).map(([key, value]) => {
        const fieldLabel = getFieldDisplayName(typeName, key);
        const transform = typeof value === "number" ? getFieldTransform(typeName, key) : null;
        const constraint = typeConstraints[key] ?? typeConstraints[fieldLabel];
        const validationValue = (transform && typeof value === "number") ? transform.toDisplay(value as number) : value;
        const issue = constraint ? validateField(fieldLabel, validationValue, constraint) : null;
        const rawDescription = typeDescriptions[key];
        const description = rawDescription ? getShortDescription(rawDescription) : undefined;
        const extendedDesc = rawDescription ? getExtendedDescription(rawDescription) : undefined;
        const isExpanded = helpMode && expandedField === key;
        const handleHelpClick = helpMode && extendedDesc
          ? () => setExpandedField(expandedField === key ? null : key)
          : undefined;

        if (typeof value === "number") {
          const displayValue = transform ? transform.toDisplay(value) : value;
          const handleTransformedChange = transform
            ? (v: number) => handleContinuousChange(key, transform.fromDisplay(v))
            : (v: number) => handleContinuousChange(key, v);
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <SliderField
                label={fieldLabel}
                value={displayValue}
                min={constraint?.min ?? -100}
                max={constraint?.max ?? 100}
                description={description}
                onChange={handleTransformedChange}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "boolean") {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ToggleField
                label={fieldLabel}
                value={value}
                description={description}
                onChange={(v) => handleDiscreteChange(key, v)}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "string") {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <TextField
                label={fieldLabel}
                value={value}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "x" in (value as Record<string, unknown>)
        ) {
          const v = value as { x: number; y: number; z: number };
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <VectorField
                label={fieldLabel}
                value={v}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "Min" in (value as Record<string, unknown>) &&
          "Max" in (value as Record<string, unknown>)
        ) {
          const v = value as { Min: number; Max: number };
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <RangeField
                label={fieldLabel}
                value={v}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (Array.isArray(value) && key === "Delimiters" && isEnvironmentDensityDelimitedNode) {
          const delimiters = value as Array<Record<string, unknown>>;
          const delimiterIssues = validateEnvironmentDelimiters(delimiters, environmentLookup.names);
          const datalistId = selectedNodeId ? `env-names-${selectedNodeId}` : "env-names";
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <EnvironmentDelimitersField
                label={fieldLabel}
                description={description}
                delimiters={delimiters}
                issues={delimiterIssues}
                datalistId={datalistId}
                environmentNames={environmentLookup.names}
                lookupStatus={environmentLookup.status}
                lookupSource={environmentLookup.source}
                typeHints={environmentLookup.typeHints}
                workspacePath={environmentLookup.workspacePath}
                lookupError={environmentLookup.error}
                onChange={(nextDelimiters) => handleContinuousChange("Delimiters", nextDelimiters)}
                onAdd={() => {
                  const last = delimiters[delimiters.length - 1];
                  const lastMax = last ? readDelimiterRangeMax(last) : null;
                  const nextMin = lastMax ?? 0;
                  const nextMax = nextMin + 1;
                  const defaultEnvironment = environmentLookup.names[0] ?? "";
                  const nextDelimiter: Record<string, unknown> = {
                    Range: {
                      MinInclusive: nextMin,
                      MaxExclusive: nextMax,
                    },
                    Environment: {
                      Type: "Constant",
                      Environment: defaultEnvironment,
                    },
                  };
                  handleDiscreteChange("Delimiters", [...delimiters, nextDelimiter]);
                }}
                onRemove={(index) => {
                  handleDiscreteChange("Delimiters", delimiters.filter((_, i) => i !== index));
                }}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (Array.isArray(value) && key === "DelimiterRanges") {
          const ranges = value as { From?: number; To?: number }[];
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ArrayField
                label={fieldLabel}
                values={ranges}
                description={description}
                renderItem={(item, index) => {
                  const range = item as { From?: number; To?: number };
                  return (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="text-[10px] text-tn-text-muted w-4 shrink-0">[{index}]</span>
                      <label className="text-[10px] text-tn-text-muted shrink-0">From</label>
                      <input
                        type="number"
                        step="any"
                        value={range.From ?? 0}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          const newRanges = ranges.map((r, i) => i === index ? { ...r, From: v } : r);
                          handleContinuousChange("DelimiterRanges", newRanges);
                        }}
                        onBlur={handleBlur}
                        className="w-16 shrink-0 px-1.5 py-0.5 text-xs bg-tn-bg border border-tn-border rounded text-right"
                      />
                      <label className="text-[10px] text-tn-text-muted shrink-0">To</label>
                      <input
                        type="number"
                        step="any"
                        value={range.To ?? 1000}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          const newRanges = ranges.map((r, i) => i === index ? { ...r, To: v } : r);
                          handleContinuousChange("DelimiterRanges", newRanges);
                        }}
                        onBlur={handleBlur}
                        className="w-16 shrink-0 px-1.5 py-0.5 text-xs bg-tn-bg border border-tn-border rounded text-right"
                      />
                    </div>
                  );
                }}
                onAdd={() => {
                  const lastTo = ranges.length > 0 ? (ranges[ranges.length - 1].To ?? 0) : 0;
                  handleDiscreteChange("DelimiterRanges", [...ranges, { From: lastTo, To: lastTo + 25 }]);
                }}
                onRemove={(index) => {
                  handleDiscreteChange("DelimiterRanges", ranges.filter((_, i) => i !== index));
                }}
              />
            </FieldWrapper>
          );
        }
        if (Array.isArray(value)) {
          if (isManualCurve && key === "Points") {
            return (
              <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
                <CurveCanvas
                  key={selectedNodeId}
                  label={`Points (${value.length})`}
                  points={value}
                  onChange={(pts) => {
                    if (selectedNodeId) {
                      updateNodeField(selectedNodeId, "Points", pts);
                      setDirty(true);
                    }
                  }}
                  onCommit={() => commitState("Edit curve")}
                />
                <CurvePointList
                  points={value}
                  onChange={(pts) => {
                    if (selectedNodeId) {
                      updateNodeField(selectedNodeId, "Points", pts);
                      setDirty(true);
                    }
                  }}
                  onCommit={() => commitState("Edit curve point")}
                />
              </FieldWrapper>
            );
          }
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ArrayField
                label={fieldLabel}
                values={value}
                description={description}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "object" && value !== null) {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-tn-text-muted">{fieldLabel}</span>
                <pre className="text-xs text-tn-text bg-tn-bg p-2 rounded border border-tn-border overflow-x-auto max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            </FieldWrapper>
          );
        }
        return null;
      })}

      {isCurveNode && !isManualCurve && (() => {
        const evaluator = getCurveEvaluator(typeName, fields);
        if (!evaluator) return null;
        return <CurveCanvas label="Preview (read-only)" evaluator={evaluator} />;
      })()}

      {/* Show material layer stack when SpaceAndDepth is selected */}
      {typeName === "SpaceAndDepth" && <MaterialLayerStack />}

      {/* Show placement preview for position provider nodes */}
      {isPositionNode && (
        <div className="border-t border-tn-border pt-2 mt-1">
          <PropPlacementGrid
            nodes={nodes}
            edges={edges}
            rootNodeId={selectedNodeId ?? undefined}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BiomeInspector - tabbed wrapper for the Biome editing context
// ---------------------------------------------------------------------------

type BiomeTab = "biome" | "atmosphere" | "debug";

function BiomeInspector({
  activeBiomeSection,
  onBiomeConfigChange,
  onBiomeTintChange,
  onPropMetaChange,
  onBlur,
}: {
  activeBiomeSection: string | null | undefined;
  onBiomeConfigChange: (field: string, value: unknown) => void;
  onBiomeTintChange: (field: string, value: string) => void;
  onPropMetaChange: (index: number, field: string, value: unknown) => void;
  onBlur: () => void;
}) {
  const [tab, setTab] = useState<BiomeTab>("biome");

  const propIndex = activeBiomeSection?.startsWith("Props[")
    ? parseInt(/\[(\d+)\]/.exec(activeBiomeSection)?.[1] ?? "-1", 10)
    : -1;

  function renderBiomeContent(): ReactNode {
    if (propIndex >= 0) {
      return (
        <PropOverviewPanel
          propIndex={propIndex}
          onPropMetaChange={onPropMetaChange}
          onBlur={onBlur}
        />
      );
    }
    if (activeBiomeSection === "MaterialProvider") {
      return <MaterialLayerStack />;
    }
    return (
      <BiomeDashboard
        onBiomeConfigChange={onBiomeConfigChange}
        onBlur={onBlur}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-tn-border shrink-0">
        {(["biome", "atmosphere", "debug"] as BiomeTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${
              tab === t
                ? "text-tn-accent border-b-2 border-tn-accent"
                : "text-tn-text-muted hover:text-tn-text"
            }`}
          >
            {t === "biome" ? "Biome" : t === "atmosphere" ? "Atmosphere" : "Debug"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "biome" && renderBiomeContent()}
        {tab === "atmosphere" && <AtmosphereTab onBlur={onBlur} onBiomeTintChange={onBiomeTintChange} />}
        {tab === "debug" && <DebugTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EnvironmentDelimitersField({
  label,
  description,
  delimiters,
  issues,
  datalistId,
  environmentNames,
  lookupStatus,
  lookupSource,
  typeHints,
  workspacePath,
  lookupError,
  onChange,
  onAdd,
  onRemove,
  onBlur,
}: {
  label: string;
  description?: string;
  delimiters: Array<Record<string, unknown>>;
  issues: DelimiterValidationIssue[];
  datalistId: string;
  environmentNames: string[];
  lookupStatus: "idle" | "loading" | "ready" | "error";
  lookupSource: "project-server" | "workspace-schema" | null;
  typeHints: string[];
  workspacePath: string | null;
  lookupError: string | null;
  onChange: (nextDelimiters: Array<Record<string, unknown>>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onBlur: () => void;
}) {
  const rowIssueMap = new Map<number, DelimiterValidationIssue[]>();
  for (const issue of issues) {
    if (issue.delimiterIndex === undefined) continue;
    const existing = rowIssueMap.get(issue.delimiterIndex) ?? [];
    existing.push(issue);
    rowIssueMap.set(issue.delimiterIndex, existing);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-tn-text-muted">{label} ({delimiters.length})</span>
          {description && <span className="text-[10px] text-tn-text-muted/80">{description}</span>}
        </div>
        <button
          onClick={onAdd}
          className="text-xs text-tn-accent hover:text-tn-accent/80"
        >
          + Add
        </button>
      </div>

      <datalist id={datalistId}>
        {environmentNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="rounded border border-tn-border/80 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_0.95fr_1.25fr_auto] gap-1 bg-tn-panel/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-tn-text-muted">
          <span>MinInclusive</span>
          <span>MaxExclusive</span>
          <span>Type</span>
          <span>Environment</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="flex flex-col divide-y divide-tn-border/60">
          {delimiters.map((delimiter, index) => {
            const min = readDelimiterRangeMin(delimiter);
            const max = readDelimiterRangeMax(delimiter);
            const environmentReference = readDelimiterEnvironmentReference(delimiter);
            const environmentType = environmentReference.providerType;
            const environmentName = environmentReference.name;
            const rowIssues = rowIssueMap.get(index) ?? [];
            const hasRowError = rowIssues.some((issue) => issue.severity === "error");
            const hasRowWarning = rowIssues.some((issue) => issue.severity === "warning");
            const hasUnknownEnvironment = rowIssues.some((issue) => issue.kind === "unknown-environment");
            const hasMissingEnvironment = rowIssues.some((issue) => issue.kind === "missing-environment");
            const hasUnsupportedType = rowIssues.some((issue) => issue.kind === "unsupported-environment-type");
            const showEnvironmentNameInput = environmentType !== "Default";
            return (
              <div
                key={index}
                className={`grid grid-cols-[1fr_1fr_0.95fr_1.25fr_auto] gap-1 px-2 py-1.5 items-start ${
                  hasRowError
                    ? "bg-red-500/10"
                    : hasRowWarning
                      ? "bg-amber-500/5"
                      : "bg-transparent"
                }`}
              >
                <input
                  type="number"
                  step="any"
                  value={min ?? ""}
                  onChange={(event) => {
                    const nextDelimiter = writeDelimiterRangeValue(delimiter, "MinInclusive", event.target.value);
                    const nextDelimiters = delimiters.map((item, itemIndex) => (
                      itemIndex === index ? nextDelimiter : item
                    ));
                    onChange(nextDelimiters);
                  }}
                  onBlur={onBlur}
                  className={`px-1.5 py-1 text-xs bg-tn-bg border rounded text-right ${
                    hasRowError ? "border-red-400/70" : "border-tn-border"
                  }`}
                />
                <input
                  type="number"
                  step="any"
                  value={max ?? ""}
                  onChange={(event) => {
                    const nextDelimiter = writeDelimiterRangeValue(delimiter, "MaxExclusive", event.target.value);
                    const nextDelimiters = delimiters.map((item, itemIndex) => (
                      itemIndex === index ? nextDelimiter : item
                    ));
                    onChange(nextDelimiters);
                  }}
                  onBlur={onBlur}
                  className={`px-1.5 py-1 text-xs bg-tn-bg border rounded text-right ${
                    hasRowError ? "border-red-400/70" : "border-tn-border"
                  }`}
                />
                <select
                  value={environmentType}
                  onChange={(event) => {
                    const nextDelimiter = writeDelimiterEnvironmentType(
                      delimiter,
                      event.target.value as DelimiterEnvironmentProviderType,
                    );
                    const nextDelimiters = delimiters.map((item, itemIndex) => (
                      itemIndex === index ? nextDelimiter : item
                    ));
                    onChange(nextDelimiters);
                  }}
                  onBlur={onBlur}
                  className={`px-1.5 py-1 text-xs bg-tn-bg border rounded ${
                    hasUnsupportedType ? "border-amber-400/70" : "border-tn-border"
                  }`}
                >
                  <option value="Constant">Constant</option>
                  <option value="Default">Default</option>
                  <option value="Imported">Imported</option>
                </select>
                {showEnvironmentNameInput ? (
                  <input
                    type="text"
                    value={environmentName}
                    list={environmentType === "Constant" ? datalistId : undefined}
                    onChange={(event) => {
                      const nextDelimiter = writeDelimiterEnvironmentName(delimiter, event.target.value);
                      const nextDelimiters = delimiters.map((item, itemIndex) => (
                        itemIndex === index ? nextDelimiter : item
                      ));
                      onChange(nextDelimiters);
                    }}
                    onBlur={onBlur}
                    placeholder={environmentType === "Imported" ? "Imported name" : "Env_*"}
                    className={`px-1.5 py-1 text-xs bg-tn-bg border rounded ${
                      hasUnknownEnvironment || hasMissingEnvironment
                        ? "border-amber-400/70"
                        : "border-tn-border"
                    }`}
                  />
                ) : (
                  <span className="px-1.5 py-1 text-[10px] text-tn-text-muted border border-tn-border/60 rounded bg-tn-panel/30">
                    Uses biome default
                  </span>
                )}
                <button
                  className="text-[11px] text-red-400 hover:text-red-300 px-1 py-1 text-right"
                  onClick={() => onRemove(index)}
                  title={`Remove delimiter ${index}`}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {lookupStatus === "loading" && (
        <p className="text-[10px] text-tn-text-muted">Loading environment names from Server/Environments...</p>
      )}
      {lookupStatus === "ready" && lookupSource === "workspace-schema" && (
        <p className="text-[10px] text-amber-300">
          Using NodeEditor workspace fallback
          {workspacePath ? ` (${workspacePath})` : ""}.
        </p>
      )}
      {lookupStatus === "ready" && typeHints.length > 0 && (
        <p className="text-[10px] text-tn-text-muted">
          Workspace type hints: {typeHints.join(", ")}
        </p>
      )}
      {lookupError && (
        <p className={`text-[10px] ${lookupStatus === "error" ? "text-amber-300" : "text-tn-text-muted"}`}>
          {lookupError}
        </p>
      )}

      {issues.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {issues.map((issue, index) => (
            <p
              key={`${issue.kind}-${index}`}
              className={`text-[10px] ${
                issue.severity === "error" ? "text-red-400" : "text-amber-300"
              }`}
            >
              {issue.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FieldWrapper({
  children,
  issue,
  helpMode,
  onHelpClick,
  extendedDesc,
}: {
  children: React.ReactNode;
  issue: ValidationIssue | null;
  helpMode?: boolean;
  onHelpClick?: () => void;
  extendedDesc?: string;
}) {
  return (
    <div>
      <div
        className={`${issue ? "ring-1 ring-red-500/60 rounded p-0.5 -m-0.5" : ""} ${
          helpMode && onHelpClick ? "cursor-help" : ""
        }`}
        onClick={onHelpClick}
      >
        {children}
      </div>
      {issue && (
        <p className={`text-[11px] mt-0.5 ${issue.severity === "error" ? "text-red-400" : issue.severity === "warning" ? "text-amber-400" : "text-tn-text-muted"}`}>
          {issue.message}
        </p>
      )}
      {extendedDesc && (
        <div className="mt-1.5 px-2.5 py-2 text-[11px] leading-relaxed rounded border bg-sky-500/10 border-sky-500/30 text-sky-200">
          {extendedDesc}
        </div>
      )}
    </div>
  );
}
