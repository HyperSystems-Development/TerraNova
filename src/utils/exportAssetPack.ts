import { save, open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "@/stores/projectStore";
import { useEditorStore } from "@/stores/editorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { graphToJson, graphToJsonMulti } from "@/utils/graphToJson";
import { normalizeExport, isBiomeFile, isSettingsFile, internalToHytaleBiome } from "@/utils/fileTypeDetection";
import { isHytaleNativeFormat } from "@/utils/hytaleToInternal";
import { exportAssetFile, copyFile, readAssetFile, listDirectory } from "@/utils/ipc";
import type { DirectoryEntryData } from "@/utils/ipc";

/**
 * BFS upstream from a root node to collect all nodes feeding into it.
 */
function getReachableNodeIds(
  rootId: string,
  _nodes: import("@xyflow/react").Node[],
  edges: import("@xyflow/react").Edge[],
): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const edge of edges) {
      if (edge.target === current && !result.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }
  return result;
}

/**
 * Serialize the currently open file to Hytale-compatible JSON.
 * Mirrors the logic from handleSaveFile in useTauriIO.ts but does NOT write to disk or modify state.
 */
export function serializeCurrentFile(): Record<string, unknown> | null {
  const currentFile = useProjectStore.getState().currentFile;
  if (!currentFile) return null;

  const { nodes, edges, originalWrapper, biomeRanges, noiseRangeConfig, editingContext, settingsConfig, biomeConfig, biomeSections, activeBiomeSection, outputNodeId } = useEditorStore.getState();

  // NoiseRange files
  if (originalWrapper?.Type === "NoiseRange") {
    const output = { ...originalWrapper } as Record<string, unknown>;
    if (output.Framework && !Array.isArray(output.Framework)) {
      output.Framework = [];
    }
    output.Biomes = biomeRanges.map((r) => ({ Biome: r.Biome, Min: r.Min, Max: r.Max }));
    if (noiseRangeConfig) {
      output.DefaultBiome = noiseRangeConfig.DefaultBiome;
      output.DefaultTransitionDistance = noiseRangeConfig.DefaultTransitionDistance;
      output.MaxBiomeEdgeDistance = noiseRangeConfig.MaxBiomeEdgeDistance;
    }
    const densityJson = graphToJson(nodes, edges);
    if (densityJson) output.Density = densityJson;
    const noiseRangeResult = normalizeExport(output, nodes) as Record<string, unknown>;
    // ContentFields → Framework conversion for Hytale compatibility
    if (Array.isArray(noiseRangeResult.ContentFields) && (!noiseRangeResult.Framework || (Array.isArray(noiseRangeResult.Framework) && noiseRangeResult.Framework.length === 0) || (typeof noiseRangeResult.Framework === "object" && Object.keys(noiseRangeResult.Framework as object).length === 0))) {
      const entries = (noiseRangeResult.ContentFields as Record<string, unknown>[]).map((cf) => ({
        Name: (cf.Name ?? cf.name) as string,
        Value: (cf.Y ?? cf.y ?? cf.Value ?? cf.value) as number,
      }));
      noiseRangeResult.Framework = [{ Type: "DecimalConstants", Entries: entries }];
      delete noiseRangeResult.ContentFields;
    }
    delete noiseRangeResult.Skip;
    return noiseRangeResult;
  }

  // Settings files
  if (editingContext === "Settings" && settingsConfig && originalWrapper) {
    const output: Record<string, unknown> = { ...originalWrapper };
    output.CustomConcurrency = settingsConfig.CustomConcurrency;
    output.BufferCapacityFactor = settingsConfig.BufferCapacityFactor;
    output.TargetViewDistance = settingsConfig.TargetViewDistance;
    output.TargetPlayerCount = settingsConfig.TargetPlayerCount;
    output.StatsCheckpoints = settingsConfig.StatsCheckpoints;
    return output;
  }

  // Biome files
  if (editingContext === "Biome" && originalWrapper && biomeConfig && biomeSections) {
    const updatedSections = { ...biomeSections };
    if (activeBiomeSection && updatedSections[activeBiomeSection]) {
      updatedSections[activeBiomeSection] = {
        ...updatedSections[activeBiomeSection],
        nodes: structuredClone(nodes),
        edges: structuredClone(edges),
        outputNodeId: outputNodeId ?? null,
      };
    }

    const output = { ...originalWrapper } as Record<string, unknown>;
    output.Name = biomeConfig.Name;

    if (updatedSections["Terrain"]) {
      const terrainJson = graphToJson(updatedSections["Terrain"].nodes, updatedSections["Terrain"].edges);
      const origTerrain = (originalWrapper.Terrain ?? {}) as Record<string, unknown>;
      output.Terrain = { ...origTerrain, Density: terrainJson };
    }

    if (updatedSections["MaterialProvider"]) {
      const matJson = graphToJson(updatedSections["MaterialProvider"].nodes, updatedSections["MaterialProvider"].edges);
      if (matJson) output.MaterialProvider = matJson;
    }

    const propKeys = Object.keys(updatedSections).filter((k) => k.startsWith("Props[")).sort();
    const props: Record<string, unknown>[] = [];
    for (let i = 0; i < propKeys.length; i++) {
      const section = updatedSections[propKeys[i]];
      const meta = biomeConfig.propMeta[i] ?? { Runtime: 0, Skip: false };
      const propEntry: Record<string, unknown> = { Runtime: meta.Runtime, Skip: meta.Skip };

      const sectionNodes = section.nodes;
      const sectionEdges = section.edges;

      const positionsRoot = sectionNodes.find((n) => (n.data as Record<string, unknown>)?._biomeField === "Positions");
      const assignmentsRoot = sectionNodes.find((n) => (n.data as Record<string, unknown>)?._biomeField === "Assignments");

      if (positionsRoot || assignmentsRoot) {
        if (positionsRoot) {
          const posNodeIds = getReachableNodeIds(positionsRoot.id, sectionNodes, sectionEdges);
          const posNodes = sectionNodes.filter((n) => posNodeIds.has(n.id));
          const posEdges = sectionEdges.filter((e) => posNodeIds.has(e.source) && posNodeIds.has(e.target));
          const posJson = graphToJson(posNodes, posEdges);
          if (posJson) propEntry.Positions = posJson;
        }
        if (assignmentsRoot) {
          const asgnNodeIds = getReachableNodeIds(assignmentsRoot.id, sectionNodes, sectionEdges);
          const asgnNodes = sectionNodes.filter((n) => asgnNodeIds.has(n.id));
          const asgnEdges = sectionEdges.filter((e) => asgnNodeIds.has(e.source) && asgnNodeIds.has(e.target));
          const asgnJson = graphToJson(asgnNodes, asgnEdges);
          if (asgnJson) propEntry.Assignments = asgnJson;
        }
      } else {
        const assets = graphToJsonMulti(sectionNodes, sectionEdges);
        if (assets[0]) propEntry.Positions = assets[0];
        if (assets[1]) propEntry.Assignments = assets[1];
      }

      props.push(propEntry);
    }
    output.Props = props;

    if (updatedSections["EnvironmentProvider"]) {
      const envJson = graphToJson(
        updatedSections["EnvironmentProvider"].nodes,
        updatedSections["EnvironmentProvider"].edges,
      );
      output.EnvironmentProvider = envJson ?? biomeConfig.EnvironmentProvider;
    } else {
      output.EnvironmentProvider = biomeConfig.EnvironmentProvider;
    }

    if (updatedSections["TintProvider"]) {
      const tintJson = graphToJson(
        updatedSections["TintProvider"].nodes,
        updatedSections["TintProvider"].edges,
      );
      output.TintProvider = tintJson ?? biomeConfig.TintProvider;
    } else {
      output.TintProvider = biomeConfig.TintProvider;
    }

    return internalToHytaleBiome(output) as Record<string, unknown>;
  }

  // Regular typed asset
  const json = graphToJson(nodes, edges);
  if (!json) return null;

  if (originalWrapper) {
    if ("Type" in originalWrapper) {
      return normalizeExport(json, nodes) as Record<string, unknown>;
    }
    // Non-typed wrapper
    const output = { ...originalWrapper };
    let replaced = false;
    for (const [key, val] of Object.entries(output)) {
      if (val && typeof val === "object" && "Type" in (val as Record<string, unknown>)) {
        output[key] = normalizeExport(json, nodes);
        replaced = true;
        break;
      }
    }
    return (replaced ? output : normalizeExport(json, nodes)) as Record<string, unknown>;
  }

  return normalizeExport(json, nodes) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Lightweight pre-export validation
// ---------------------------------------------------------------------------

/**
 * Validate exported JSON for common issues before writing.
 * Returns an array of warning strings (empty = valid).
 * Does NOT block export — just surfaces warnings.
 */
export function validateExport(json: Record<string, unknown>, filePath?: string): string[] {
  const warnings: string[] = [];

  // Recursive check for typed nodes missing Type field or having empty Type
  function checkNode(obj: Record<string, unknown>, path: string): void {
    if ("Type" in obj && (!obj.Type || typeof obj.Type !== "string")) {
      warnings.push(`${path}: Node has empty or invalid Type`);
    }

    // Check for null/undefined in value positions
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$")) continue;
      if (value === null || value === undefined) {
        warnings.push(`${path}.${key}: null or undefined value`);
      }

      // Check material strings are non-empty
      if (key === "Material" && typeof value === "object" && value !== null) {
        const mat = value as Record<string, unknown>;
        if ("Solid" in mat && (!mat.Solid || typeof mat.Solid !== "string")) {
          warnings.push(`${path}.Material.Solid: empty material string`);
        }
      }

      // Recurse into child objects/arrays
      if (value && typeof value === "object" && !Array.isArray(value) && "Type" in (value as Record<string, unknown>)) {
        checkNode(value as Record<string, unknown>, `${path}.${key}`);
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (value[i] && typeof value[i] === "object" && "Type" in (value[i] as Record<string, unknown>)) {
            checkNode(value[i] as Record<string, unknown>, `${path}.${key}[${i}]`);
          }
        }
      }
    }
  }

  // Top-level validation based on file type
  const pathLower = (filePath ?? "").toLowerCase();
  if (pathLower.includes("/biomes/") || ("Name" in json && "Terrain" in json)) {
    // Biome file validation
    if (!json.Name) warnings.push("Biome missing Name field");
    const terrain = json.Terrain as Record<string, unknown> | undefined;
    if (!terrain?.Density) warnings.push("Biome missing Terrain.Density");

    // Recurse into biome subtrees that don't have a top-level "Type"
    if (terrain?.Density && typeof terrain.Density === "object") {
      checkNode(terrain.Density as Record<string, unknown>, "Terrain.Density");
    }
    if (json.MaterialProvider && typeof json.MaterialProvider === "object") {
      checkNode(json.MaterialProvider as Record<string, unknown>, "MaterialProvider");
    }
    if (json.EnvironmentProvider && typeof json.EnvironmentProvider === "object") {
      checkNode(json.EnvironmentProvider as Record<string, unknown>, "EnvironmentProvider");
    }
    if (json.TintProvider && typeof json.TintProvider === "object") {
      checkNode(json.TintProvider as Record<string, unknown>, "TintProvider");
    }
    if (Array.isArray(json.Props)) {
      for (let i = 0; i < json.Props.length; i++) {
        const prop = json.Props[i] as Record<string, unknown> | undefined;
        if (prop?.Positions && typeof prop.Positions === "object") {
          checkNode(prop.Positions as Record<string, unknown>, `Props[${i}].Positions`);
        }
        if (prop?.Assignments && typeof prop.Assignments === "object") {
          checkNode(prop.Assignments as Record<string, unknown>, `Props[${i}].Assignments`);
        }
      }
    }
  } else if (json.Type === "NoiseRange") {
    // NoiseRange file validation
    if (!json.DefaultBiome) warnings.push("NoiseRange missing DefaultBiome");
    if (!json.Density) warnings.push("NoiseRange missing Density");
  }

  // Walk the tree for structural issues
  checkNode(json, "root");

  return warnings;
}

/**
 * Export the currently open file as a standalone JSON to a user-chosen location.
 * Does NOT modify editor state (dirty flag, currentFile, etc.).
 */
export async function exportCurrentJson(): Promise<void> {
  const addToast = useToastStore.getState().addToast;

  try {
    const json = serializeCurrentFile();
    if (!json) {
      addToast("No file open to export", "error");
      return;
    }

    // Run lightweight pre-export validation (warn but don't block)
    const currentFile = useProjectStore.getState().currentFile ?? "";
    const validationWarnings = validateExport(json, currentFile);
    if (validationWarnings.length > 0) {
      addToast(`Export warnings: ${validationWarnings.join("; ")}`, "warning");
    }

    const exportPath = useSettingsStore.getState().exportPath;
    const filePath = await save({
      defaultPath: exportPath ?? undefined,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath) return;

    await exportAssetFile(filePath, json);

    // Remember the directory portion for next time
    const dirPortion = filePath.replace(/[/\\][^/\\]+$/, "");
    useSettingsStore.getState().setExportPath(dirPortion);

    addToast(`Exported to ${filePath}`, "success");
  } catch (err) {
    addToast(`Export failed: ${err}`, "error");
  }
}

/**
 * Flatten a directory tree into a list of file entries.
 */
function flattenEntries(entries: DirectoryEntryData[], basePath: string): { path: string; isDir: boolean }[] {
  const result: { path: string; isDir: boolean }[] = [];
  for (const entry of entries) {
    const fullPath = `${basePath}/${entry.name}`;
    result.push({ path: fullPath, isDir: entry.is_dir });
    if (entry.children) {
      result.push(...flattenEntries(entry.children, fullPath));
    }
  }
  return result;
}

/** TerraNova-internal field names that Hytale doesn't recognize. */
const INTERNAL_ONLY_FIELDS = new Set(["BoxBlockType"]);

/**
 * Recursively strip TerraNova-internal fields from a JSON tree.
 * Used for files already in Hytale format that may contain leftover internal fields.
 */
function stripInternalFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (INTERNAL_ONLY_FIELDS.has(key)) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? stripInternalFields(item as Record<string, unknown>)
          : item,
      );
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = stripInternalFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Convert a single JSON asset file from disk to Hytale-native format.
 * Reads from disk, detects type, applies conversion, and returns the output JSON.
 */
async function convertFileForExport(sourcePath: string): Promise<Record<string, unknown> | null> {
  const rawContent = await readAssetFile(sourcePath);
  if (!rawContent || typeof rawContent !== "object") return rawContent as Record<string, unknown> | null;

  const content = rawContent as Record<string, unknown>;

  // Already in Hytale native format (e.g. template biome files with $NodeId) — strip internal fields and pass through
  if (isHytaleNativeFormat(content)) {
    return stripInternalFields(content);
  }

  // Settings files pass through unchanged
  if (isSettingsFile(content, sourcePath)) {
    return content;
  }

  // Biome wrapper files
  if (isBiomeFile(content, sourcePath)) {
    return internalToHytaleBiome(content) as Record<string, unknown>;
  }

  // Typed assets
  if ("Type" in content) {
    let result = normalizeExport(content) as Record<string, unknown>;

    // NoiseRange post-processing: ContentFields → Framework, strip root Skip
    if (result.Type === "NoiseRange") {
      result = { ...result };
      if (Array.isArray(result.ContentFields) && (!result.Framework || (Array.isArray(result.Framework) && result.Framework.length === 0) || (typeof result.Framework === "object" && Object.keys(result.Framework as object).length === 0))) {
        const entries = (result.ContentFields as Record<string, unknown>[]).map((cf) => ({
          Name: (cf.Name ?? cf.name) as string,
          Value: (cf.Y ?? cf.y ?? cf.Value ?? cf.value) as number,
        }));
        result.Framework = [{ Type: "DecimalConstants", Entries: entries }];
        delete result.ContentFields;
      }
      delete result.Skip;
    }

    return result;
  }

  // Non-typed wrapper with typed children
  const output = { ...content };
  for (const [key, val] of Object.entries(output)) {
    if (val && typeof val === "object" && "Type" in (val as Record<string, unknown>)) {
      output[key] = normalizeExport(val as Record<string, unknown>);
    }
  }
  return output;
}

/**
 * Export the entire asset pack to a user-chosen directory.
 * Copies all files, converting JSON assets to Hytale-native format.
 */
export async function exportAssetPack(): Promise<void> {
  const addToast = useToastStore.getState().addToast;

  try {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) {
      addToast("No project open to export", "error");
      return;
    }

    const exportPath = useSettingsStore.getState().exportPath;
    const targetDir = await open({
      directory: true,
      defaultPath: exportPath ?? undefined,
    });
    if (!targetDir) return;

    // Remember the chosen path
    useSettingsStore.getState().setExportPath(targetDir);

    // Get all files recursively
    const entries = await listDirectory(projectPath);
    const allFiles = flattenEntries(entries, projectPath).filter((f) => !f.isDir);

    // Try to read TerraNova's internal manifest for project metadata.
    // Walk up from projectPath (which may be a subdirectory like Server/HytaleGenerator).
    let terraNovaManifest: Record<string, unknown> | null = null;
    {
      let searchDir = projectPath;
      for (let i = 0; i < 4; i++) {
        try {
          const raw = await readAssetFile(`${searchDir}/manifest.json`);
          if (raw && typeof raw === "object") {
            terraNovaManifest = raw as Record<string, unknown>;
            break;
          }
        } catch {
          // try parent directory
        }
        const parent = searchDir.replace(/[/\\][^/\\]+$/, "");
        if (parent === searchDir) break;
        searchDir = parent;
      }
    }

    // Derive mod identifiers and build the named mod folder inside the target directory.
    // Hytale manifest uses: Group (short org id), Name (hyphenated id), folder = Group.Name
    const manifestName = terraNovaManifest?.name as string | undefined;
    const projectName = manifestName || projectPath.split(/[/\\]/).pop() || "TerraNovaPack";
    const projectVersion = (terraNovaManifest?.version as string) || "1.0.0";
    const projectDescription = (terraNovaManifest?.description as string) || "";
    const modGroup = "TerraNova";
    let modName = projectName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    // When falling back to folder name, strip modGroup prefix to avoid "TerraNova.TerraNova-..."
    if (!manifestName && modName.toLowerCase().startsWith(`${modGroup.toLowerCase()}-`)) {
      modName = modName.slice(modGroup.length + 1);
    }
    const modFolderName = `${modGroup}.${modName}`;
    const modRoot = `${targetDir}/${modFolderName}`;

    let exportedCount = 0;
    const failedFiles: string[] = [];

    // Track biome Names and WorldStructure biome references for cross-validation
    const biomeNameCorrections: string[] = [];
    const exportedBiomeNames = new Set<string>();
    const worldStructureBiomeRefs: { wsFile: string; refs: string[] }[] = [];

    for (const file of allFiles) {
      // Compute relative path from project root
      const relativePath = file.path.slice(projectPath.length);

      // Skip TerraNova's internal manifest — we generate a Hytale-format one
      if (relativePath === "/manifest.json") continue;

      // Route files to the correct level in the Hytale mod structure:
      //   Server/HytaleGenerator/... → modRoot/Server/HytaleGenerator/...
      //   Server/...               → modRoot/Server/...  (Environments, Prefabs, etc.)
      //   HytaleGenerator/...      → modRoot/Server/HytaleGenerator/...  (template shorthand)
      //   other files              → modRoot/Server/HytaleGenerator/...  (if projectPath IS HytaleGenerator)
      let destPath: string;
      if (relativePath.match(/^\/Server\/HytaleGenerator(\/|$)/)) {
        // File is under Server/HytaleGenerator — preserve full path
        destPath = `${modRoot}${relativePath}`;
      } else if (relativePath.match(/^\/Server(\/|$)/)) {
        // File is under Server/ but outside HytaleGenerator (Environments, Prefabs, etc.)
        destPath = `${modRoot}${relativePath}`;
      } else if (relativePath.match(/^\/HytaleGenerator(\/|$)/)) {
        // Template shorthand: HytaleGenerator/ without Server/ wrapper
        destPath = `${modRoot}/Server${relativePath}`;
      } else {
        // projectPath is HytaleGenerator itself — files are Biomes/, WorldStructures/, etc.
        destPath = `${modRoot}/Server/HytaleGenerator${relativePath}`;
      }

      if (file.path.toLowerCase().endsWith(".json")) {
        // Convert JSON files through the export pipeline
        try {
          const converted = await convertFileForExport(file.path);
          if (converted) {
            const filenameStem = destPath.split("/").pop()?.replace(/\.json$/i, "") ?? "";

            // Auto-sync biome Name to match filename (Hytale resolves biomes by filename)
            if (isBiomeFile(converted, destPath)) {
              const currentName = converted.Name as string | undefined;
              if (currentName && currentName !== filenameStem) {
                biomeNameCorrections.push(`${filenameStem}: "${currentName}" \u2192 "${filenameStem}"`);
                converted.Name = filenameStem;
              } else if (!currentName) {
                converted.Name = filenameStem;
              }
              exportedBiomeNames.add(filenameStem);
            }

            // Collect WorldStructure biome references for cross-validation
            if (converted.Type === "NoiseRange") {
              const refs: string[] = [];
              if (typeof converted.DefaultBiome === "string") refs.push(converted.DefaultBiome);
              if (Array.isArray(converted.Biomes)) {
                for (const b of converted.Biomes as Record<string, unknown>[]) {
                  if (typeof b.Biome === "string") refs.push(b.Biome);
                }
              }
              if (refs.length > 0) {
                worldStructureBiomeRefs.push({ wsFile: filenameStem, refs });
              }
            }

            await exportAssetFile(destPath, converted);
          } else {
            // Conversion returned null — copy as-is so the file isn't lost
            failedFiles.push(relativePath);
            await copyFile(file.path, destPath);
          }
        } catch {
          // If conversion fails, copy as-is and track the failure
          failedFiles.push(relativePath);
          await copyFile(file.path, destPath);
        }
      } else {
        // Non-JSON files: copy directly
        await copyFile(file.path, destPath);
      }
      exportedCount++;
    }

    // Cross-validate: every WorldStructure biome reference should have a matching biome file
    const missingBiomeRefs: string[] = [];
    for (const { wsFile, refs } of worldStructureBiomeRefs) {
      for (const ref of refs) {
        if (!exportedBiomeNames.has(ref)) {
          missingBiomeRefs.push(`"${ref}" (in ${wsFile})`);
        }
      }
    }

    // Generate Hytale-format manifest.json at the mod root (sibling to Server/)
    const hytaleManifest: Record<string, unknown> = {
      Group: modGroup,
      Name: modName,
      Version: projectVersion,
      Description: projectDescription,
      Authors: [],
      Website: "",
      ServerVersion: "",
      Dependencies: {},
      OptionalDependencies: {},
      LoadBefore: {},
      DisabledByDefault: false,
      IncludesAssetPack: false,
      SubPlugins: [],
    };
    await exportAssetFile(`${modRoot}/manifest.json`, hytaleManifest);
    exportedCount++;

    if (failedFiles.length > 0) {
      addToast(`Exported ${exportedCount} files (${failedFiles.length} copied without conversion: ${failedFiles.join(", ")})`, "warning");
    } else {
      addToast(`Exported ${exportedCount} files to ${modRoot}`, "success");
    }
    if (biomeNameCorrections.length > 0) {
      addToast(`Auto-corrected biome Name fields: ${biomeNameCorrections.join(", ")}`, "info");
    }
    if (missingBiomeRefs.length > 0) {
      addToast(`WorldStructure references biomes with no matching file: ${missingBiomeRefs.join(", ")}`, "error");
    }
    addToast(`Remember to enable the mod in your server/world config.json`, "info");
  } catch (err) {
    addToast(`Export failed: ${err}`, "error");
  }
}
