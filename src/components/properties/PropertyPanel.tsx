import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore, type DirectoryEntry } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useFieldChange } from "@/hooks/useFieldChange";
import { SliderField } from "./SliderField";
import { VectorField } from "./VectorField";
import { RangeField } from "./RangeField";
import { ToggleField } from "./ToggleField";
import { TextField } from "./TextField";
import { MaterialField } from "./MaterialField";
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
import { CollapsibleEditorSection } from "@/components/editor/CollapsibleEditorSection";
import { POSITION_TYPE_NAMES } from "@/utils/positionEvaluator";
import { getCurveEvaluator } from "@/utils/curveEvaluators";
import { validateField, type ValidationIssue } from "@/schema/validation";
import { FIELD_CONSTRAINTS } from "@/schema/constraints";
import { NODE_TIPS } from "@/schema/nodeTips";
import { FIELD_DESCRIPTIONS, getShortDescription, getExtendedDescription } from "@/schema/fieldDescriptions";
import { useLanguage } from "@/languages/useLanguage";
import { useToastStore } from "@/stores/toastStore";
import { copyFile, createDirectory, exportAssetFile, listDirectory, resolveBundledHytaleAssetPath, showInFolder } from "@/utils/ipc";
import mapDirEntry from "@/utils/mapDirEntry";
import {
  type DelimiterValidationIssue,
  readDelimiterRangeMin,
  readDelimiterRangeMax,
  readDelimiterEnvironmentReference,
  writeDelimiterEnvironmentType,
  writeDelimiterRangeValue,
  writeDelimiterEnvironmentName,
  validateEnvironmentDelimiters,
} from "@/utils/environmentDelimiters";
import {
  resolveEnvironmentLookup,
} from "@/utils/environmentAssetLookup";

export { validateEnvironmentDelimiters } from "@/utils/environmentDelimiters";
export {
  deriveServerRootFromWorkspacePath,
  extractWorkspaceEnvironmentTypeHints,
} from "@/utils/environmentAssetLookup";
export {
  applyBiomeTintBand,
  buildDelimiterTypeOptions,
  getAdvancedDelimiterTypeDetails,
} from "./biomeTintUtils";
import {
  applyBiomeTintBand,
  buildDelimiterTypeOptions,
  getAdvancedDelimiterTypeDetails,
  isDelimiterEnvironmentProviderType,
  type AdvancedDelimiterTypeDetails,
} from "./biomeTintUtils";

/** Field keys whose string value is a Hytale block/material identifier. */
const MATERIAL_FIELD_KEYS = new Set(["Material", "Solid", "Fluid", "BlockType", "BlockTypes"]);

/**
 * Static autocomplete suggestions for non-material string fields.
 * Values sourced from actual HytaleGenerator biome/assignment JSON files.
 */
const FIELD_SUGGESTIONS: Record<string, readonly string[]> = {
  // Height layer names referenced by ColumnRandom / ColumnLinear nodes
  BaseHeightName: ["Base", "Bedrock", "Water"],
  TopBaseHeight:  ["Base", "Bedrock", "Water"],
  BottomBaseHeight: ["Base", "Bedrock", "Water"],

  // Biome identifiers used in NoiseRange / WorldStructure nodes
  Biome: [
    "Basic", "Default_Flat", "Default_Void", "Oceans", "Void", "Void_Buffer", "Void_Buffer_Oasis",
    "Boreal1_Hedera", "Boreal1_Henges",
    "Desert1_Oasis", "Desert1_River", "Desert1_Rocky", "Desert1_Shore", "Desert1_Stacks",
    "Interpolation_A", "Interpolation_B",
    "Plains1_Deeproot", "Plains1_Gorges", "Plains1_Oak", "Plains1_River", "Plains1_Shore",
    "Taiga1_Mountains", "Taiga1_Redwood", "Taiga1_River", "Taiga1_Shore",
    "Volcanic1_Caldera", "Volcanic1_Jungle", "Volcanic1_River", "Volcanic1_Shore",
  ],
  DefaultBiome: [
    "Basic", "Default_Flat", "Default_Void", "Oceans", "Void", "Void_Buffer", "Void_Buffer_Oasis",
    "Boreal1_Hedera", "Boreal1_Henges",
    "Desert1_Oasis", "Desert1_River", "Desert1_Rocky", "Desert1_Shore", "Desert1_Stacks",
    "Plains1_Deeproot", "Plains1_Gorges", "Plains1_Oak", "Plains1_River", "Plains1_Shore",
    "Taiga1_Mountains", "Taiga1_Redwood", "Taiga1_River", "Taiga1_Shore",
    "Volcanic1_Caldera", "Volcanic1_Jungle", "Volcanic1_River", "Volcanic1_Shore",
  ],

  // Environment names used in EnvironmentConstant / delimiter nodes
  Environment: [
    "Env_Default_Flat", "Env_Default_Void", "Env_Void", "Env_Zone0",
    "Env_Zone1_Caves_Forests", "Env_Zone1_Caves_Plains", "Env_Zone1_Forests", "Env_Zone1_Plains", "Env_Zone1_Shores",
    "Env_Zone2_Caves_Deserts", "Env_Zone2_Deserts", "Env_Zone2_Shores",
    "Env_Zone3_Caves_Forests", "Env_Zone3_Forests", "Env_Zone3_Glacial_Henges", "Env_Zone3_Shores",
    "Env_Zone4_Jungles", "Env_Zone4_Shores", "Env_Zone4_Wastes",
    "Env_Portals_Hedera", "Env_Portals_Oasis",
    "Zone1_Overground", "Zone1_Plains", "Zone1_Underground", "Zone3_Overground",
  ],

  // Enum-style fields with a fixed set of values
  LayerContext:     ["DEPTH_INTO_FLOOR", "DEPTH_INTO_CEILING"],
  MoldingDirection: ["DOWN", "NONE"],
  CellType:         ["Distance", "Distance2Div"],
  Strategy:         ["DART_THROW"],
  Id:               ["A", "B", "AB"],
};

interface EnvironmentNameLookup {
  status: "idle" | "loading" | "ready" | "error";
  names: string[];
  source: "project-server" | "workspace-schema" | null;
  typeHints: string[];
  workspacePath: string | null;
  error: string | null;
}

const WEATHER_SUMMARY_COLOR_KEYS = [
  "SkyTopColors",
  "SkyBottomColors",
  "SkySunsetColors",
  "FogColors",
  "SunColors",
  "SunGlowColors",
  "MoonColors",
  "MoonGlowColors",
  "SunlightColors",
  "ScreenEffectColors",
  "WaterTints",
];

const WEATHER_SUMMARY_VALUE_KEYS = [
  "SunScales",
  "MoonScales",
  "FogDensities",
  "FogHeightFalloffs",
  "SunlightDampingMultipliers",
];

function isAssetFileInFolder(path: string | null, folderName: string): boolean {
  if (!path) return false;
  return path.replace(/\\/g, "/").toLowerCase().includes(`/${folderName.toLowerCase()}/`);
}

interface AssetInspectorEntry {
  key: string;
  label: string;
  detail: string;
  status: "in-pack" | "built-in" | "missing";
  projectPath: string | null;
  bundledPath: string | null;
  kind: "weather-texture" | "environment-weather";
}

function normalizeWindowsPath(path: string): string {
  return path.replace(/\//g, "\\").replace(/\\+$/, "");
}

function joinWindowsPath(base: string, child: string): string {
  return `${base.replace(/[\\/]+$/, "")}\\${child.replace(/^[\\/]+/, "").replace(/\//g, "\\")}`;
}

function getWindowsDirname(path: string): string {
  const normalized = normalizeWindowsPath(path);
  const lastSeparator = normalized.lastIndexOf("\\");
  return lastSeparator >= 0 ? normalized.slice(0, lastSeparator) : normalized;
}

function toRelativeDisplayPath(root: string | null, path: string): string {
  const normalizedPath = normalizeWindowsPath(path);
  if (!root) return normalizedPath;
  const normalizedRoot = normalizeWindowsPath(root);
  const prefix = `${normalizedRoot}\\`.toLowerCase();
  return normalizedPath.toLowerCase().startsWith(prefix)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : normalizedPath;
}

function collectDirectoryFilePaths(entries: DirectoryEntry[]): string[] {
  const files: string[] = [];
  const visit = (items: DirectoryEntry[]) => {
    for (const entry of items) {
      if (entry.isDir && Array.isArray(entry.children)) {
        visit(entry.children);
        continue;
      }
      if (!entry.isDir) {
        files.push(entry.path);
      }
    }
  };
  visit(entries);
  return files;
}

function getFileStem(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const fileName = normalized.slice(normalized.lastIndexOf("/") + 1);
  return fileName.replace(/\.[^.]+$/i, "");
}

function referenceToBundledCommonPath(referencePath: string): string {
  const normalized = referencePath.replace(/\//g, "\\").replace(/^\\+/, "");
  return normalized.toLowerCase().startsWith("common\\") ? normalized : `Common\\${normalized}`;
}

function referenceToProjectCommonPath(projectRoot: string, referencePath: string): string {
  const normalized = referencePath.replace(/\//g, "\\").replace(/^\\+/, "");
  const relativePath = normalized.toLowerCase().startsWith("common\\") ? normalized : `Common\\${normalized}`;
  return joinWindowsPath(projectRoot, relativePath);
}

function collectWeatherTextureReferences(doc: Record<string, unknown>): Array<{ label: string; referencePath: string }> {
  const references: Array<{ label: string; referencePath: string }> = [];
  const seen = new Set<string>();
  const pushReference = (label: string, referencePath: unknown) => {
    if (typeof referencePath !== "string" || !referencePath.trim()) return;
    const normalized = referencePath.trim();
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    references.push({ label, referencePath: normalized });
  };

  pushReference("Stars", doc.Stars);

  if (Array.isArray(doc.Moons)) {
    for (const [index, moon] of doc.Moons.entries()) {
      if (moon && typeof moon === "object") {
        pushReference(`Moon ${index + 1}`, (moon as { Texture?: unknown }).Texture);
      }
    }
  }

  if (Array.isArray(doc.Clouds)) {
    for (const [index, cloud] of doc.Clouds.entries()) {
      if (cloud && typeof cloud === "object") {
        pushReference(`Cloud ${index + 1}`, (cloud as { Texture?: unknown }).Texture);
      }
    }
  }

  return references;
}

function collectEnvironmentWeatherIds(doc: Record<string, unknown>): string[] {
  const forecasts = doc.WeatherForecasts && typeof doc.WeatherForecasts === "object"
    ? doc.WeatherForecasts as Record<string, unknown>
    : {};
  const ids = new Set<string>();
  for (const entries of Object.values(forecasts)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry && typeof entry === "object" && typeof (entry as { WeatherId?: unknown }).WeatherId === "string") {
        ids.add((entry as { WeatherId: string }).WeatherId);
      }
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function buildDefaultWeatherDoc(weatherId: string) {
  return {
    $Comment: `Placeholder weather created by TerraNova for ${weatherId}`,
    SkyTopColors: [{ Hour: 12, Color: "rgba(#5ba3e8, 1.0)" }],
    SkyBottomColors: [{ Hour: 12, Color: "rgba(#3a7fc1, 1.0)" }],
    FogColors: [{ Hour: 12, Color: "rgba(#a8cce0, 0.4)" }],
    SunColors: [{ Hour: 12, Color: "rgba(#ffffff, 1.0)" }],
    MoonColors: [{ Hour: 0, Color: "rgba(#cbd5f5, 1.0)" }],
    SunlightColors: [{ Hour: 12, Color: "rgba(#ffffff, 1.0)" }],
    SunScales: [{ Hour: 12, Value: 1.0 }],
    MoonScales: [{ Hour: 0, Value: 1.0 }],
    FogDensities: [{ Hour: 12, Value: 0.01 }],
    FogDistance: [64, 512],
  };
}

function inferSuggestedEnvironmentParent(
  currentFile: string | null,
  knownEnvironmentNames: string[],
): string {
  const envNames = knownEnvironmentNames.filter((name) => /^Env_/i.test(name));
  const normalizedPath = (currentFile ?? "").replace(/\\/g, "/").toLowerCase();
  const findExact = (candidate: string) => envNames.find((name) => name.toLowerCase() === candidate.toLowerCase()) ?? null;
  const findPrefix = (candidatePrefix: string) => envNames.find((name) => name.toLowerCase().startsWith(candidatePrefix.toLowerCase())) ?? null;
  const findContains = (fragment: string) => envNames.find((name) => name.toLowerCase().includes(fragment.toLowerCase())) ?? null;

  if (normalizedPath.includes("void")) {
    return findExact("Env_Default_Void")
      ?? findContains("void")
      ?? "Env_Default_Void";
  }

  const zoneMatch = /zone[_ -]?(\d+)/i.exec(normalizedPath);
  if (zoneMatch) {
    const zonePrefix = `Env_Zone${zoneMatch[1]}`;
    return findExact(zonePrefix)
      ?? findPrefix(zonePrefix)
      ?? findContains(`zone${zoneMatch[1]}`)
      ?? findExact("Env_Zone1")
      ?? findPrefix("Env_Zone1")
      ?? findExact("Env_Default_Flat")
      ?? "Env_Default_Flat";
  }

  return findExact("Env_Zone1")
    ?? findPrefix("Env_Zone1")
    ?? findExact("Env_Default_Flat")
    ?? findPrefix("Env_Default")
    ?? envNames[0]
    ?? "Env_Zone1";
}

function statusClass(status: AssetInspectorEntry["status"]): string {
  switch (status) {
    case "in-pack":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "built-in":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

export function PropertyPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const commitState = useEditorStore((s) => s.commitState);
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);
  const setEditingContext = useEditorStore((s) => s.setEditingContext);
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const directoryTree = useProjectStore((s) => s.directoryTree);
  const setDirty = useProjectStore((s) => s.setDirty);
  const setDirectoryTree = useProjectStore((s) => s.setDirectoryTree);
  const currentFile = useProjectStore((s) => s.currentFile);
  const projectPath = useProjectStore((s) => s.projectPath);
  const rawJsonContent = useEditorStore((s) => s.rawJsonContent);
  const setRawJsonContent = useEditorStore((s) => s.setRawJsonContent);
  const editingContext = useEditorStore((s) => s.editingContext);
  const { openFile } = useTauriIO();
  const addToast = useToastStore((s) => s.addToast);
  const { getTypeDisplayName, getFieldDisplayName, getFieldTransform } = useLanguage();
  const helpMode = useUIStore((s) => s.helpMode);
  const toggleHelpMode = useUIStore((s) => s.toggleHelpMode);
  const compactAssetInspector = useUIStore((s) => s.compactAssetInspector);
  const toggleAssetInspectorCompact = useUIStore((s) => s.toggleAssetInspectorCompact);
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
  const [assetInspectorEntries, setAssetInspectorEntries] = useState<AssetInspectorEntry[]>([]);
  const [assetInspectorLoading, setAssetInspectorLoading] = useState(false);
  const [assetInspectorActionKey, setAssetInspectorActionKey] = useState<string | null>(null);
  const [assetInspectorRevision, setAssetInspectorRevision] = useState(0);
  const [assetInspectorCategory, setAssetInspectorCategory] = useState("all");
  const [assetInspectorOverviewOpen, setAssetInspectorOverviewOpen] = useState(true);
  const [assetInspectorToolsOpen, setAssetInspectorToolsOpen] = useState(true);
  const [assetInspectorReferencesOpen, setAssetInspectorReferencesOpen] = useState(true);
  const [assetInspectorGuidanceOpen, setAssetInspectorGuidanceOpen] = useState(false);
  const assetInspectorContainerRef = useRef<HTMLDivElement | null>(null);

  const hasPendingSnapshotRef = useRef(false);
  const lastChangedFieldRef = useRef<{ field: string; nodeType: string }>({ field: "", nodeType: "" });

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const selectedNodeData = selectedNode?.data as Record<string, unknown> | undefined;
  const selectedNodeType = typeof selectedNodeData?.type === "string" ? selectedNodeData.type : "";
  const selectedNodeBiomeField = typeof selectedNodeData?._biomeField === "string"
    ? selectedNodeData._biomeField
    : "";
  const assetInspectorMode =
    !selectedNode && rawJsonContent
      ? isAssetFileInFolder(currentFile, "Server/Weathers")
        ? "weather"
        : isAssetFileInFolder(currentFile, "Server/Environments")
          ? "environment"
          : null
      : null;
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

  const refreshAssetInspectorTree = useCallback(async () => {
    if (projectPath) {
      try {
        const entries = await listDirectory(projectPath);
        setDirectoryTree(entries.map(mapDirEntry));
      } catch {
        // Tree refresh failure is non-fatal for the inspector.
      }
    }
    setAssetInspectorRevision((value) => value + 1);
  }, [projectPath, setDirectoryTree]);

  const importAssetInspectorEntries = useCallback(async (entries: AssetInspectorEntry[]) => {
    const importableEntries = entries.filter((entry): entry is AssetInspectorEntry & { bundledPath: string; projectPath: string } => (
      Boolean(entry.bundledPath && entry.projectPath)
    ));
    if (importableEntries.length === 0) return;

    let imported = 0;
    let failed = 0;

    for (const entry of importableEntries) {
      try {
        await createDirectory(getWindowsDirname(entry.projectPath)).catch(() => {});
        await copyFile(entry.bundledPath, entry.projectPath);
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    await refreshAssetInspectorTree();

    const noun = importableEntries[0]?.kind === "weather-texture"
      ? "referenced sky asset"
      : "referenced weather file";

    if (imported > 0) {
      addToast(`Added ${imported} ${noun}${imported === 1 ? "" : "s"} to this pack.`, "success");
    }
    if (failed > 0) {
      addToast(`Failed to add ${failed} ${noun}${failed === 1 ? "" : "s"}.`, imported > 0 ? "warning" : "error");
    }
  }, [addToast, refreshAssetInspectorTree]);

  const createAssetInspectorWeatherFiles = useCallback(async (entries: AssetInspectorEntry[]) => {
    const creatableEntries = entries.filter((entry): entry is AssetInspectorEntry & { projectPath: string } => (
      entry.kind === "environment-weather" && Boolean(entry.projectPath)
    ));
    if (creatableEntries.length === 0) return;

    let created = 0;
    let failed = 0;

    for (const entry of creatableEntries) {
      try {
        await createDirectory(getWindowsDirname(entry.projectPath)).catch(() => {});
        await exportAssetFile(entry.projectPath, buildDefaultWeatherDoc(entry.label));
        created += 1;
      } catch {
        failed += 1;
      }
    }

    await refreshAssetInspectorTree();

    if (created > 0) {
      addToast(`Created ${created} placeholder weather file${created === 1 ? "" : "s"} in Server\\Weathers.`, "success");
    }
    if (failed > 0) {
      addToast(`Failed to create ${failed} placeholder weather file${failed === 1 ? "" : "s"}.`, created > 0 ? "warning" : "error");
    }
  }, [addToast, refreshAssetInspectorTree]);

  const runAssetInspectorAction = useCallback(async (actionKey: string, action: () => Promise<void>) => {
    if (assetInspectorActionKey) return;
    setAssetInspectorActionKey(actionKey);
    try {
      await action();
    } catch (error) {
      addToast(String(error), "error");
    } finally {
      setAssetInspectorActionKey(null);
    }
  }, [assetInspectorActionKey, addToast]);

  useEffect(() => {
    if (!assetInspectorMode || !rawJsonContent || !projectPath) {
      setAssetInspectorEntries([]);
      setAssetInspectorLoading(false);
      return;
    }

    let cancelled = false;

    const loadEntries = async () => {
      setAssetInspectorLoading(true);

      try {
        const doc = rawJsonContent as Record<string, unknown>;
        const projectFiles = collectDirectoryFilePaths(Array.isArray(directoryTree) ? directoryTree : []);
        const projectFileIndex = new Set(projectFiles.map((path) => normalizeWindowsPath(path).toLowerCase()));

        if (assetInspectorMode === "weather") {
          const textureEntries = await Promise.all(
            collectWeatherTextureReferences(doc).map(async ({ label, referencePath }) => {
              const targetPath = referenceToProjectCommonPath(projectPath, referencePath);
              const inPack = projectFileIndex.has(normalizeWindowsPath(targetPath).toLowerCase());
              let bundledPath: string | null = null;

              if (!inPack) {
                try {
                  bundledPath = await resolveBundledHytaleAssetPath(referenceToBundledCommonPath(referencePath));
                } catch {
                  bundledPath = null;
                }
              }

              return {
                key: `weather-texture:${referencePath}`.toLowerCase(),
                label,
                detail: referencePath.replace(/\//g, "\\"),
                status: inPack ? "in-pack" : bundledPath ? "built-in" : "missing",
                projectPath: targetPath,
                bundledPath,
                kind: "weather-texture",
              } satisfies AssetInspectorEntry;
            }),
          );

          if (!cancelled) {
            setAssetInspectorEntries(textureEntries);
          }
          return;
        }

        const projectWeatherIndex = new Map<string, string>();
        for (const filePath of projectFiles) {
          const normalizedFilePath = normalizeWindowsPath(filePath);
          if (!normalizedFilePath.toLowerCase().endsWith(".json")) continue;
          if (!isAssetFileInFolder(normalizedFilePath, "Server/Weathers")) continue;
          projectWeatherIndex.set(getFileStem(normalizedFilePath).toLowerCase(), normalizedFilePath);
        }

        const bundledWeatherIndex = new Map<string, string>();
        try {
          const bundledWeathersPath = await resolveBundledHytaleAssetPath("Server\\Weathers");
          const bundledEntries = await listDirectory(bundledWeathersPath);
          const bundledFiles = collectDirectoryFilePaths(bundledEntries.map(mapDirEntry));
          for (const filePath of bundledFiles) {
            const normalizedFilePath = normalizeWindowsPath(filePath);
            if (!normalizedFilePath.toLowerCase().endsWith(".json")) continue;
            bundledWeatherIndex.set(getFileStem(normalizedFilePath).toLowerCase(), normalizedFilePath);
          }
        } catch {
          // Built-in weather lookup is optional.
        }

        const weatherEntries = collectEnvironmentWeatherIds(doc).map((weatherId) => {
          const weatherKey = weatherId.toLowerCase();
          const existingProjectPath = projectWeatherIndex.get(weatherKey) ?? null;
          const bundledPath = existingProjectPath ? null : bundledWeatherIndex.get(weatherKey) ?? null;
          const targetFileName = bundledPath
            ? (normalizeWindowsPath(bundledPath).split("\\").pop() ?? `${weatherId}.json`)
            : `${weatherId}.json`;
          const targetPath = existingProjectPath ?? joinWindowsPath(projectPath, `Server\\Weathers\\${targetFileName}`);

          return {
            key: `environment-weather:${weatherKey}`,
            label: weatherId,
            detail: existingProjectPath
              ? toRelativeDisplayPath(projectPath, existingProjectPath)
              : `Server\\Weathers\\${targetFileName}`,
            status: existingProjectPath ? "in-pack" : bundledPath ? "built-in" : "missing",
            projectPath: targetPath,
            bundledPath,
            kind: "environment-weather",
          } satisfies AssetInspectorEntry;
        });

        if (!cancelled) {
          setAssetInspectorEntries(weatherEntries);
        }
      } catch {
        if (!cancelled) {
          setAssetInspectorEntries([]);
        }
      } finally {
        if (!cancelled) {
          setAssetInspectorLoading(false);
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [assetInspectorMode, rawJsonContent, projectPath, directoryTree, assetInspectorRevision]);

  useEffect(() => {
    setAssetInspectorCategory("all");
    setAssetInspectorOverviewOpen(true);
    setAssetInspectorToolsOpen(true);
    setAssetInspectorReferencesOpen(true);
    setAssetInspectorGuidanceOpen(false);
    assetInspectorContainerRef.current?.scrollTo({ top: 0 });
  }, [assetInspectorMode, currentFile]);

  const canOpenEnvironmentGraph = Boolean(
    biomeSections?.EnvironmentProvider,
  );

  const handleOpenEnvironmentGraph = useCallback(() => {
    if (!canOpenEnvironmentGraph) return;

    if (editingContext !== "Biome") {
      setEditingContext("Biome");
    }
    switchBiomeSection("EnvironmentProvider");

    const outputNodeId = useEditorStore.getState().biomeSections?.EnvironmentProvider?.outputNodeId ?? null;
    if (outputNodeId) {
      setSelectedNodeId(outputNodeId);
    }
  }, [
    canOpenEnvironmentGraph,
    editingContext,
    setEditingContext,
    switchBiomeSection,
    setSelectedNodeId,
  ]);

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
        const currentTintProvider = (biomeConfig.TintProvider as Record<string, unknown> | undefined) ?? {};

        if (field === "Color") {
          const nextTintProvider: Record<string, unknown> = {
            ...currentTintProvider,
            Type: "Constant",
            Color: value,
          };
          delete nextTintProvider.Delimiters;
          delete nextTintProvider.Density;
          setBiomeConfig({ ...biomeConfig, TintProvider: nextTintProvider });
          return;
        }

        // Handle Delimiters[n].Tint.Color path written by AtmosphereTab
        const delimPattern = /^Delimiters\[(\d+)\]\.Tint\.Color$/;
        const delimMatch = delimPattern.exec(field);
        if (delimMatch) {
          const idx = parseInt(delimMatch[1], 10);
          const updatedTint = applyBiomeTintBand(
            currentTintProvider,
            idx,
            value,
          );
          setBiomeConfig({ ...biomeConfig, TintProvider: updatedTint });
        } else {
          // Legacy flat field path
          const tint = { ...currentTintProvider, [field]: value };
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

    if (assetInspectorMode && rawJsonContent) {
      const isWeatherAsset = assetInspectorMode === "weather";
      const assetLabel = isWeatherAsset ? "Weather Asset Inspector" : "Environment Asset Inspector";
      const doc = rawJsonContent as Record<string, unknown>;
      const inPackEntries = assetInspectorEntries.filter((entry) => entry.status === "in-pack");
      const builtInEntries = assetInspectorEntries.filter((entry) => entry.status === "built-in");
      const missingEntries = assetInspectorEntries.filter((entry) => entry.status === "missing");
      const prioritizedAssetInspectorEntries = [...assetInspectorEntries].sort((left, right) => {
        const rank = (status: AssetInspectorEntry["status"]) => (
          status === "missing" ? 0 : status === "built-in" ? 1 : 2
        );
        return rank(left.status) - rank(right.status) || left.label.localeCompare(right.label);
      });
      const assetInspectorCategoryOptions = isWeatherAsset
        ? [
            { value: "all", label: "All assets" },
            { value: "celestial", label: "Celestial" },
            { value: "clouds", label: "Clouds" },
            { value: "needs-attention", label: "Needs attention" },
            { value: "built-in", label: "Built-in" },
            { value: "missing", label: "Missing" },
            { value: "in-pack", label: "In pack" },
          ]
        : [
            { value: "all", label: "All weather refs" },
            { value: "needs-attention", label: "Needs attention" },
            { value: "built-in", label: "Built-in" },
            { value: "missing", label: "Missing" },
            { value: "in-pack", label: "In pack" },
          ];
      const filteredAssetInspectorEntries = prioritizedAssetInspectorEntries.filter((entry) => {
        switch (assetInspectorCategory) {
          case "needs-attention":
            return entry.status !== "in-pack";
          case "built-in":
          case "missing":
          case "in-pack":
            return entry.status === assetInspectorCategory;
          case "celestial":
            return isWeatherAsset && (entry.label === "Stars" || entry.label.startsWith("Moon "));
          case "clouds":
            return isWeatherAsset && entry.label.startsWith("Cloud ");
          default:
            return true;
        }
      });
      const suggestedParentEnvironment = !isWeatherAsset && !(typeof doc.Parent === "string" && doc.Parent.trim())
        ? inferSuggestedEnvironmentParent(currentFile, [...FIELD_SUGGESTIONS.Environment])
        : null;
      const projectAssetFolder = projectPath
        ? joinWindowsPath(projectPath, isWeatherAsset ? "Common\\Sky" : "Server\\Weathers")
        : null;
      const summaryRows = isWeatherAsset
        ? [
            {
              label: "Color tracks",
              value: String(WEATHER_SUMMARY_COLOR_KEYS.filter((key) => Array.isArray(doc[key])).length),
            },
            {
              label: "Value tracks",
              value: String(WEATHER_SUMMARY_VALUE_KEYS.filter((key) => Array.isArray(doc[key])).length),
            },
            {
              label: "Cloud layers",
              value: String(Array.isArray(doc.Clouds) ? doc.Clouds.length : 0),
            },
            {
              label: "Moons",
              value: String(Array.isArray(doc.Moons) ? doc.Moons.length : 0),
            },
            {
              label: "Stars",
              value: typeof doc.Stars === "string" && doc.Stars.trim() ? "Configured" : "Missing",
            },
          ]
        : (() => {
            const forecasts = (doc.WeatherForecasts && typeof doc.WeatherForecasts === "object"
              ? doc.WeatherForecasts
              : {}) as Record<string, unknown>;
            const forecastEntries = Object.values(forecasts)
              .filter((value) => Array.isArray(value))
              .map((value) => value as unknown[]);
            const totalEntries = forecastEntries.reduce((sum, entries) => sum + entries.length, 0);
            const uniqueWeatherIds = new Set<string>();
            for (const entries of forecastEntries) {
              for (const entry of entries) {
                if (entry && typeof entry === "object" && typeof (entry as { WeatherId?: unknown }).WeatherId === "string") {
                  uniqueWeatherIds.add((entry as { WeatherId: string }).WeatherId);
                }
              }
            }
            return [
              {
                label: "Forecast hours",
                value: String(forecastEntries.filter((entries) => entries.length > 0).length),
              },
              {
                label: "Forecast entries",
                value: String(totalEntries),
              },
              {
                label: "Weather refs",
                value: String(uniqueWeatherIds.size),
              },
              {
                label: "Tags",
                value: String(doc.Tags && typeof doc.Tags === "object" ? Object.keys(doc.Tags as Record<string, unknown>).length : 0),
              },
              {
                label: "Parent",
                value: typeof doc.Parent === "string" && doc.Parent.trim() ? doc.Parent : "None",
              },
            ];
          })();

      return (
        <div
          ref={assetInspectorContainerRef}
          className={`flex h-full flex-col overflow-y-auto ${compactAssetInspector ? "gap-2 p-2" : "gap-3 p-3"}`}
        >
          <div className="border-b border-tn-border pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{assetLabel}</h3>
                <p className="mt-1 text-xs text-tn-text-muted">
                  {compactAssetInspector
                    ? "Compact asset tools for the file open in the center editor."
                    : "Context summary and file actions for the asset open in the center editor."}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAssetInspectorCompact}
                className="shrink-0 rounded border border-tn-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-tn-text-muted transition-colors hover:bg-tn-surface hover:text-tn-text"
              >
                {compactAssetInspector ? "Expand" : "Compact"}
              </button>
            </div>
          </div>

          <CollapsibleEditorSection
            title="Guidance"
            description="Authoring notes for pack folder structure and how to build from Hytale-style assets."
            badge={isWeatherAsset ? "Common + Weathers" : "Environments"}
            open={assetInspectorGuidanceOpen}
            onToggle={() => setAssetInspectorGuidanceOpen((value) => !value)}
          >
            <div className="flex flex-col gap-3">
              <div className="rounded border border-tn-border/50 bg-tn-bg/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Folder Notes</p>
                <p className="mt-1 text-[11px] text-tn-text-muted">
                  {isWeatherAsset
                    ? "Store weather JSON in Server\\Weathers. Import a built-in Hytale weather to start fast, then keep referenced sky textures under Common\\Sky."
                    : "Store environment JSON in Server\\Environments. Start from a Hytale asset or create your own, then point Parent at a shared base such as Env_Zone1, Env_Zone1_Caves, or another family root."}
                </p>
              </div>
              {!isWeatherAsset && (
                <div className="rounded border border-tn-border/50 bg-tn-bg/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Zone Folder Pattern</p>
                  <p className="mt-1 text-[11px] text-tn-text-muted">
                    Mirror Hytale by grouping environments into folders like Server\\Environments\\Zone1, Zone2, Zone3, Zone4, Zone0, and Unique. Keep a shared base such as Env_Zone1 or Env_Zone1_Caves alongside the child variants in that family.
                  </p>
                </div>
              )}
            </div>
          </CollapsibleEditorSection>

          <CollapsibleEditorSection
            title="Overview"
            description="Current file and high-level summary for the asset open in the center editor."
            badge={currentFile?.split(/[/\\]/).pop() ?? "Untitled"}
            open={assetInspectorOverviewOpen}
            onToggle={() => setAssetInspectorOverviewOpen((value) => !value)}
          >
            <div className="flex flex-col gap-3">
              <div className="rounded border border-tn-border/60 bg-tn-bg/70 p-3">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Current File</p>
                <p className="mt-1 truncate text-sm font-medium text-tn-text">
                  {currentFile?.split(/[/\\]/).pop() ?? "Untitled"}
                </p>
                <p className="mt-1 break-all text-[11px] text-tn-text-muted">{currentFile ?? "No file open"}</p>
              </div>

              <div className={`grid gap-2 ${compactAssetInspector ? "grid-cols-1" : "grid-cols-2"}`}>
                {summaryRows.map((item) => (
                  <div key={item.label} className="rounded border border-tn-border/50 bg-tn-bg/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-tn-text">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleEditorSection>

          <CollapsibleEditorSection
            title="Asset Tools"
            description={isWeatherAsset
              ? "Track missing sky textures and pull bundled Hytale assets into the pack's Common folder."
              : "Resolve referenced weather IDs without leaving the editor by opening, importing, or creating files."}
            badge={`${filteredAssetInspectorEntries.length}/${assetInspectorEntries.length}`}
            open={assetInspectorToolsOpen}
            onToggle={() => setAssetInspectorToolsOpen((value) => !value)}
          >
            <div className="flex flex-col gap-3 rounded border border-tn-border/50 bg-tn-bg/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className={`rounded border px-2 py-1 ${statusClass("in-pack")}`}>{inPackEntries.length} in pack</span>
                  <span className={`rounded border px-2 py-1 ${statusClass("built-in")}`}>{builtInEntries.length} built-in</span>
                  <span className={`rounded border px-2 py-1 ${statusClass("missing")}`}>{missingEntries.length} missing</span>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[180px] flex-col gap-1 text-[10px] uppercase tracking-wider text-tn-text-muted">
                  Category
                  <select
                    value={assetInspectorCategory}
                    onChange={(event) => setAssetInspectorCategory(event.target.value)}
                    className="rounded border border-tn-border bg-tn-bg px-2 py-1.5 text-[11px] normal-case tracking-normal text-tn-text"
                  >
                    {assetInspectorCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="pb-1 text-[11px] text-tn-text-muted">
                  Showing {filteredAssetInspectorEntries.length} of {assetInspectorEntries.length} referenced {isWeatherAsset ? "assets" : "weather files"}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {builtInEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void runAssetInspectorAction(
                        isWeatherAsset ? "batch-add-built-in-textures" : "batch-import-built-in-weathers",
                        async () => {
                          await importAssetInspectorEntries(builtInEntries);
                        },
                      );
                    }}
                    disabled={assetInspectorActionKey !== null}
                    className="rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWeatherAsset ? "Add Built-ins" : "Import Built-ins"}
                  </button>
                )}
                {!isWeatherAsset && suggestedParentEnvironment && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawJsonContent({
                        ...(doc as Record<string, unknown>),
                        Parent: suggestedParentEnvironment,
                      });
                      setDirty(true);
                    }}
                    disabled={assetInspectorActionKey !== null}
                    className="rounded border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use {suggestedParentEnvironment}
                  </button>
                )}
                {!isWeatherAsset && missingEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void runAssetInspectorAction("batch-create-missing-weathers", async () => {
                        await createAssetInspectorWeatherFiles(missingEntries);
                      });
                    }}
                    disabled={assetInspectorActionKey !== null}
                    className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create Missing Files
                  </button>
                )}
                {projectAssetFolder && (
                  <button
                    type="button"
                    onClick={() => {
                      void showInFolder(projectAssetFolder);
                    }}
                    disabled={assetInspectorActionKey !== null}
                    className="rounded border border-tn-border px-3 py-1.5 text-xs text-tn-text transition-colors hover:bg-tn-surface disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isWeatherAsset ? "Reveal Sky Folder" : "Reveal Weathers Folder"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void runAssetInspectorAction("refresh-asset-inspector", refreshAssetInspectorTree);
                  }}
                  disabled={assetInspectorActionKey !== null}
                  className="rounded border border-tn-border px-3 py-1.5 text-xs text-tn-text transition-colors hover:bg-tn-surface disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              {!projectPath && (
                <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Open the file from a pack root to enable import and create actions.
                </div>
              )}

              {!isWeatherAsset && (
                <div className={`grid gap-2 ${compactAssetInspector ? "grid-cols-1" : "md:grid-cols-2"}`}>
                  <div className="rounded border border-tn-border/50 bg-tn-bg/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Parent Chain</p>
                    <p className="mt-1 text-sm font-semibold text-tn-text">
                      {typeof doc.Parent === "string" && doc.Parent.trim() ? doc.Parent : "No parent set"}
                    </p>
                    <p className="mt-1 text-[11px] text-tn-text-muted">
                      {typeof doc.Parent === "string" && doc.Parent.trim()
                        ? "Inherited environment settings will flow from this parent."
                        : `Suggested parent: ${suggestedParentEnvironment ?? "Env_Zone1"}`}
                    </p>
                  </div>
                  <div className="rounded border border-tn-border/50 bg-tn-bg/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Resolution Focus</p>
                    <p className="mt-1 text-sm font-semibold text-tn-text">
                      {builtInEntries.length + missingEntries.length} referenced weather file(s) still need attention
                    </p>
                    <p className="mt-1 text-[11px] text-tn-text-muted">
                      Import built-ins first, then create placeholders only for custom weather IDs that do not exist anywhere.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleEditorSection>

          <CollapsibleEditorSection
            title="Referenced Assets"
            description={isWeatherAsset
              ? "Sky textures referenced by this weather asset."
              : "Weather files referenced by this environment asset."}
            badge={`${filteredAssetInspectorEntries.length}`}
            open={assetInspectorReferencesOpen}
            onToggle={() => setAssetInspectorReferencesOpen((value) => !value)}
          >
            <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
              {assetInspectorLoading ? (
                <div className="rounded border border-dashed border-tn-border/60 px-3 py-4 text-xs text-tn-text-muted">
                  Scanning referenced assets...
                </div>
              ) : assetInspectorEntries.length === 0 ? (
                <div className="rounded border border-dashed border-tn-border/60 px-3 py-4 text-xs text-tn-text-muted">
                  {isWeatherAsset
                    ? "No referenced sky textures were found on this weather file yet."
                    : "No referenced weather IDs were found on this environment file yet."}
                </div>
              ) : filteredAssetInspectorEntries.length === 0 ? (
                <div className="rounded border border-dashed border-tn-border/60 px-3 py-4 text-xs text-tn-text-muted">
                  No referenced {isWeatherAsset ? "assets" : "weather files"} match the current category.
                </div>
              ) : (
                filteredAssetInspectorEntries.map((entry) => {
                  const isRunning = assetInspectorActionKey === `entry:${entry.key}`;
                  const projectRelativePath = entry.projectPath ? toRelativeDisplayPath(projectPath, entry.projectPath) : null;
                  const hasEntryAction = Boolean(
                    (entry.kind === "weather-texture" && entry.status === "in-pack" && entry.projectPath)
                    || (entry.kind === "weather-texture" && entry.status === "built-in")
                    || (entry.kind === "environment-weather" && entry.status === "in-pack" && entry.projectPath)
                    || (entry.kind === "environment-weather" && entry.status === "built-in")
                    || (entry.kind === "environment-weather" && entry.status === "missing"),
                  );

                  return (
                    <div key={entry.key} className="rounded border border-tn-border/60 bg-tn-bg/60 p-3">
                      <div className={compactAssetInspector ? "flex flex-col gap-2" : "flex items-start gap-3"}>
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            entry.status === "in-pack"
                              ? "bg-emerald-400"
                              : entry.status === "built-in"
                                ? "bg-sky-400"
                                : "bg-amber-400"
                          }`} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-tn-text">{entry.label}</p>
                              <span className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusClass(entry.status)}`}>
                                {entry.status === "in-pack" ? "In Pack" : entry.status === "built-in" ? "Built-In" : "Missing"}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-[11px] text-tn-text-muted">{entry.detail}</p>
                            {isWeatherAsset && projectRelativePath && (
                              <p className="mt-1 text-[11px] text-tn-text-muted/80">Pack path: {projectRelativePath}</p>
                            )}
                          </div>
                        </div>

                        {hasEntryAction && (
                          <div className={compactAssetInspector ? "ml-[1.375rem] flex flex-wrap gap-2" : "shrink-0"}>
                            {entry.kind === "weather-texture" && entry.status === "in-pack" && entry.projectPath && (
                              <button
                                type="button"
                                onClick={() => {
                                  void showInFolder(entry.projectPath!);
                                }}
                                disabled={assetInspectorActionKey !== null}
                                className="rounded border border-tn-border px-2.5 py-1.5 text-xs text-tn-text transition-colors hover:bg-tn-surface disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reveal
                              </button>
                            )}

                            {entry.kind === "weather-texture" && entry.status === "built-in" && (
                              <button
                                type="button"
                                onClick={() => {
                                  void runAssetInspectorAction(`entry:${entry.key}`, async () => {
                                    await importAssetInspectorEntries([entry]);
                                  });
                                }}
                                disabled={assetInspectorActionKey !== null}
                                className="rounded border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isRunning ? "Adding..." : "Add"}
                              </button>
                            )}

                            {entry.kind === "environment-weather" && entry.status === "in-pack" && entry.projectPath && (
                              <button
                                type="button"
                                onClick={() => {
                                  void openFile(entry.projectPath!);
                                }}
                                disabled={assetInspectorActionKey !== null}
                                className="rounded border border-tn-border px-2.5 py-1.5 text-xs text-tn-text transition-colors hover:bg-tn-surface disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Open
                              </button>
                            )}

                            {entry.kind === "environment-weather" && entry.status === "built-in" && (
                              <button
                                type="button"
                                onClick={() => {
                                  void runAssetInspectorAction(`entry:${entry.key}`, async () => {
                                    await importAssetInspectorEntries([entry]);
                                  });
                                }}
                                disabled={assetInspectorActionKey !== null}
                                className="rounded border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isRunning ? "Importing..." : "Import"}
                              </button>
                            )}

                            {entry.kind === "environment-weather" && entry.status === "missing" && (
                              <button
                                type="button"
                                onClick={() => {
                                  void runAssetInspectorAction(`entry:${entry.key}`, async () => {
                                    await createAssetInspectorWeatherFiles([entry]);
                                  });
                                }}
                                disabled={assetInspectorActionKey !== null}
                                className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isRunning ? "Creating..." : "Create"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CollapsibleEditorSection>

          <div className="rounded border border-tn-border/50 bg-tn-bg/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Quick Actions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (currentFile) void showInFolder(currentFile);
                }}
                className="rounded border border-tn-border px-3 py-1.5 text-xs text-tn-text hover:bg-tn-surface"
              >
                Reveal File
              </button>
              <button
                type="button"
                onClick={() => {
                  if (projectPath) void showInFolder(projectPath);
                }}
                className="rounded border border-tn-border px-3 py-1.5 text-xs text-tn-text hover:bg-tn-surface"
              >
                Reveal Pack Root
              </button>
            </div>
          </div>
        </div>
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
  const isTintDensityDelimitedNode =
    typeName === "DensityDelimited" && (data._biomeField as string | undefined) === "TintProvider";

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
          const isMaterialField = MATERIAL_FIELD_KEYS.has(key);
          if (isMaterialField) {
            return (
              <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
                <MaterialField
                  label={fieldLabel}
                  value={value}
                  description={description}
                  onChange={(v) => handleContinuousChange(key, v)}
                  onBlur={handleBlur}
                />
              </FieldWrapper>
            );
          }
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <TextField
                label={fieldLabel}
                value={value}
                description={description}
                suggestions={FIELD_SUGGESTIONS[key]}
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
                canOpenEnvironmentGraph={canOpenEnvironmentGraph}
                onOpenEnvironmentGraph={handleOpenEnvironmentGraph}
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
        if (Array.isArray(value) && key === "Delimiters" && isTintDensityDelimitedNode) {
          const delimiters = value as Array<Record<string, unknown>>;
          const bandColors = delimiters.map((d) => {
            const t = (d.Tint as Record<string, unknown>) ?? {};
            return typeof t.Color === "string" ? t.Color : "#5b9e28";
          });
          // Build gradient stops — one stop per band color
          const gradientStops = bandColors.length === 0
            ? "transparent"
            : bandColors.length === 1
              ? bandColors[0]
              : bandColors.map((c, i) => `${c} ${Math.round((i / (bandColors.length - 1)) * 100)}%`).join(", ");

          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-tn-text-muted uppercase tracking-wider font-semibold">Tint Bands</span>
                  <span className="text-[10px] text-tn-text-muted/50">{delimiters.length} band{delimiters.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Gradient preview bar */}
                <div className="relative h-6 w-full rounded overflow-hidden border border-tn-border/60">
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(to right, ${gradientStops})` }}
                  />
                  {/* Band boundary markers */}
                  {bandColors.length > 1 && bandColors.slice(0, -1).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-black/30"
                      style={{ left: `${((i + 1) / bandColors.length) * 100}%` }}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  {delimiters.map((delimiter, idx) => {
                    const tint = (delimiter.Tint as Record<string, unknown>) ?? {};
                    const range = (delimiter.Range as Record<string, unknown>) ?? {};
                    const color = typeof tint.Color === "string" ? tint.Color : "#5b9e28";
                    const minVal = typeof range.MinInclusive === "number" ? range.MinInclusive : -1;
                    const maxVal = typeof range.MaxExclusive === "number" ? range.MaxExclusive : 1;
                    // Normalize to 6-digit hex for the color input (strip alpha if present)
                    const hexForPicker = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#5b9e28";
                    return (
                      <div key={idx} className="rounded border border-tn-border bg-tn-bg/40 overflow-hidden">
                        {/* Band color header strip */}
                        <div
                          className="h-1.5 w-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="px-2 py-1.5 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-tn-text-muted font-semibold">Band {idx + 1}</span>
                            <button
                              onClick={() => handleDiscreteChange("Delimiters", delimiters.filter((_, i) => i !== idx))}
                              className="text-[10px] text-tn-text-muted hover:text-red-400 transition-colors leading-none px-1"
                              title="Remove band"
                            >x</button>
                          </div>

                          {/* Color row: large swatch + picker trigger + hex input */}
                          <div className="flex items-center gap-1.5">
                            <label className="relative cursor-pointer shrink-0" title="Pick color">
                              <div
                                className="w-7 h-7 rounded border border-tn-border/80 shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                              <input
                                type="color"
                                value={hexForPicker}
                                onChange={(e) => {
                                  const next = delimiters.map((d, i) => i === idx ? {
                                    ...d,
                                    Tint: { Type: "Constant", ...(d.Tint as Record<string, unknown>), Color: e.target.value },
                                  } : d);
                                  handleContinuousChange("Delimiters", next);
                                }}
                                onBlur={handleBlur}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                            </label>
                            <input
                              type="text"
                              value={color}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = delimiters.map((d, i) => i === idx ? {
                                  ...d,
                                  Tint: { Type: "Constant", ...(d.Tint as Record<string, unknown>), Color: v },
                                } : d);
                                handleContinuousChange("Delimiters", next);
                              }}
                              onBlur={handleBlur}
                              placeholder="#rrggbb"
                              className="flex-1 text-[10px] bg-tn-bg border border-tn-border rounded px-1.5 py-1 text-tn-text font-mono"
                            />
                          </div>

                          {/* Range row */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-tn-text-muted w-5 shrink-0">Min</span>
                            <input
                              type="number"
                              step="0.01"
                              value={minVal}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isNaN(v)) return;
                                const next = delimiters.map((d, i) => i === idx ? {
                                  ...d,
                                  Range: { ...(d.Range as Record<string, unknown>), MinInclusive: v },
                                } : d);
                                handleContinuousChange("Delimiters", next);
                              }}
                              onBlur={handleBlur}
                              className="flex-1 text-[10px] bg-tn-bg border border-tn-border rounded px-1.5 py-0.5 text-tn-text text-right font-mono"
                            />
                            <span className="text-[10px] text-tn-text-muted w-6 shrink-0 text-center">Max</span>
                            <input
                              type="number"
                              step="0.01"
                              value={maxVal}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (Number.isNaN(v)) return;
                                const next = delimiters.map((d, i) => i === idx ? {
                                  ...d,
                                  Range: { ...(d.Range as Record<string, unknown>), MaxExclusive: v },
                                } : d);
                                handleContinuousChange("Delimiters", next);
                              }}
                              onBlur={handleBlur}
                              className="flex-1 text-[10px] bg-tn-bg border border-tn-border rounded px-1.5 py-0.5 text-tn-text text-right font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    const last = delimiters[delimiters.length - 1];
                    const lastMax = typeof (last?.Range as Record<string, unknown>)?.MaxExclusive === "number"
                      ? Math.min((last.Range as Record<string, unknown>).MaxExclusive as number, 1)
                      : 1;
                    handleDiscreteChange("Delimiters", [
                      ...delimiters,
                      {
                        Range: { MinInclusive: lastMax, MaxExclusive: Math.min(lastMax + 0.33, 1) },
                        Tint: { Type: "Constant", Color: "#7ea629" },
                      },
                    ]);
                  }}
                  className="text-[10px] text-tn-accent border border-tn-accent/50 rounded px-2 py-1 hover:bg-tn-accent/10 transition-colors w-full"
                >
                  + Add band
                </button>

                <p className="text-[9px] text-tn-text-muted/50 leading-tight">
                  Gradient interpolation between bands is a planned feature.
                </p>
              </div>
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
  canOpenEnvironmentGraph,
  onOpenEnvironmentGraph,
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
  canOpenEnvironmentGraph: boolean;
  onOpenEnvironmentGraph: () => void;
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
  const advancedSelections = delimiters
    .map((delimiter, index) => {
      const reference = readDelimiterEnvironmentReference(delimiter);
      const rawType = reference.rawType;
      if (!rawType || isDelimiterEnvironmentProviderType(rawType)) return null;
      return {
        index,
        type: rawType,
        details: getAdvancedDelimiterTypeDetails(rawType),
      };
    })
    .filter((item): item is { index: number; type: string; details: AdvancedDelimiterTypeDetails } => item !== null);

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
            const rawType = environmentReference.rawType;
            const hasAdvancedRawType = !!(rawType && !isDelimiterEnvironmentProviderType(rawType));
            const selectedTypeValue = hasAdvancedRawType ? rawType! : environmentType;
            const typeOptions = buildDelimiterTypeOptions(
              hasAdvancedRawType && rawType
                ? [...typeHints, rawType]
                : typeHints,
            );
            const rowIssues = rowIssueMap.get(index) ?? [];
            const hasRowError = rowIssues.some((issue) => issue.severity === "error");
            const hasRowWarning = rowIssues.some((issue) => issue.severity === "warning");
            const hasUnknownEnvironment = rowIssues.some((issue) => issue.kind === "unknown-environment");
            const hasMissingEnvironment = rowIssues.some((issue) => issue.kind === "missing-environment");
            const hasUnsupportedType = rowIssues.some((issue) => issue.kind === "unsupported-environment-type");
            const showEnvironmentNameInput = !hasAdvancedRawType && environmentType !== "Default";
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
                  value={selectedTypeValue}
                  onChange={(event) => {
                    if (!isDelimiterEnvironmentProviderType(event.target.value)) return;
                    const nextDelimiter = writeDelimiterEnvironmentType(delimiter, event.target.value);
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
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={!option.supported}>
                      {option.label}
                    </option>
                  ))}
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
                  hasAdvancedRawType ? (
                    <span className="px-1.5 py-1 text-[10px] text-amber-300 border border-amber-400/50 rounded bg-amber-500/10">
                      Advanced provider type is read-only.
                    </span>
                  ) : (
                    <span className="px-1.5 py-1 text-[10px] text-tn-text-muted border border-tn-border/60 rounded bg-tn-panel/30">
                      Uses biome default
                    </span>
                  )
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

      {advancedSelections.length > 0 && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-amber-200 font-semibold">
              Advanced Type Details
            </span>
            <button
              type="button"
              onClick={onOpenEnvironmentGraph}
              disabled={!canOpenEnvironmentGraph}
              className="px-1.5 py-0.5 text-[10px] rounded border border-amber-300/60 text-amber-100 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Open EnvironmentProvider graph section"
            >
              Open in Graph
            </button>
          </div>
          {!canOpenEnvironmentGraph && (
            <p className="text-[10px] text-amber-200/80">
              EnvironmentProvider graph section is unavailable in the current context.
            </p>
          )}
          {advancedSelections.map((selection) => (
            <div key={`${selection.index}-${selection.type}`} className="text-[10px] leading-snug">
              <span className="text-amber-100 font-medium">
                Delimiter [{selection.index}] - {selection.details.label}
              </span>
              <p className="text-amber-200/90">{selection.details.description}</p>
              <p className="text-amber-200/80">{selection.details.guidance}</p>
            </div>
          ))}
        </div>
      )}

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
