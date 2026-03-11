import { useCallback } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "@/stores/projectStore";
import { useEditorStore } from "@/stores/editorStore";
import {
  openAssetPack,
  saveAssetPack,
  readAssetFile,
  writeAssetFile,
  listDirectory,
  createFromTemplate,
  createBlankProject,
} from "@/utils/ipc";
import { jsonToGraph } from "@/utils/jsonToGraph";
import { graphToJson, graphToJsonMulti } from "@/utils/graphToJson";
import { autoLayout } from "@/utils/autoLayout";
import { isBiomeFile, isSettingsFile, normalizeImport, normalizeExport, internalToHytaleBiome } from "@/utils/fileTypeDetection";
import mapDirEntry from "@/utils/mapDirEntry";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";
import { loadPersistedHistory } from "@/stores/editorStore";
import type { BiomeConfig, BiomeSectionData, SectionHistoryEntry } from "@/stores/editorStore";
import { extractMaterialConfig } from "@/utils/materialResolver";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Conditionally run autoLayout based on the autoLayoutOnOpen setting.
 * Returns the original nodes if the setting is disabled or layout fails.
 */
async function maybeAutoLayout(
  nodes: import("@xyflow/react").Node[],
  edges: import("@xyflow/react").Edge[],
): Promise<import("@xyflow/react").Node[]> {
  if (!useSettingsStore.getState().autoLayoutOnOpen) return nodes;
  try {
    return await autoLayout(nodes, edges, useSettingsStore.getState().flowDirection);
  } catch {
    return nodes;
  }
}

/**
 * BFS upstream from a root node to collect all nodes feeding into it.
 * Root nodes are those with no outgoing edges (they are the "output" nodes).
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
    // Follow incoming edges (edges targeting this node)
    for (const edge of edges) {
      if (edge.target === current && !result.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }
  return result;
}

/**
 * Extract biome sections from a biome wrapper file.
 * Returns sections map and flat config.
 */
async function extractBiomeSections(
  wrapper: Record<string, unknown>,
): Promise<{ sections: Record<string, BiomeSectionData>; config: BiomeConfig; sectionKeys: string[] }> {
  const sections: Record<string, BiomeSectionData> = {};
  const sectionKeys: string[] = [];

  // Terrain → graph the Density subtree
  const terrain = wrapper.Terrain as Record<string, unknown> | undefined;
  if (terrain && typeof terrain === "object") {
    const density = terrain.Density;
    if (density && typeof density === "object" && "Type" in (density as Record<string, unknown>)) {
      const { nodes, edges } = jsonToGraph(density as Record<string, unknown>, 0, 0, "terrain");
      // Tag the last node (root) with _outputNode and _biomeField
      let terrainOutputId: string | null = null;
      if (nodes.length > 0) {
        const rootNode = nodes[nodes.length - 1];
        rootNode.data = { ...(rootNode.data as Record<string, unknown>), _outputNode: true, _biomeField: "Terrain" };
        terrainOutputId = rootNode.id;
      }
      const layoutedNodes = await maybeAutoLayout(nodes, edges);
      // layoutedNodes and edges are freshly created — no clone needed
      const terrainInitial: SectionHistoryEntry = { nodes: layoutedNodes, edges, outputNodeId: terrainOutputId, label: "Initial" };
      sections["Terrain"] = { nodes: layoutedNodes, edges, outputNodeId: terrainOutputId, history: [terrainInitial], historyIndex: 0 };
      sectionKeys.push("Terrain");
    }
  }

  // MaterialProvider → graph entire subtree
  const matProvider = wrapper.MaterialProvider;
  if (matProvider && typeof matProvider === "object" && "Type" in (matProvider as Record<string, unknown>)) {
    const { nodes, edges } = jsonToGraph(matProvider as Record<string, unknown>, 0, 0, "mat", "MaterialProvider");
    let matOutputId: string | null = null;
    if (nodes.length > 0) {
      const rootNode = nodes[nodes.length - 1];
      rootNode.data = { ...(rootNode.data as Record<string, unknown>), _outputNode: true };
      matOutputId = rootNode.id;
    }
    const layoutedNodes = await maybeAutoLayout(nodes, edges);
    // layoutedNodes and edges are freshly created — no clone needed
    const matInitial: SectionHistoryEntry = { nodes: layoutedNodes, edges, outputNodeId: matOutputId, label: "Initial" };
    sections["MaterialProvider"] = { nodes: layoutedNodes, edges, outputNodeId: matOutputId, history: [matInitial], historyIndex: 0 };
    sectionKeys.push("MaterialProvider");
  }

  // Props[] → for each prop, graph Positions + Assignments into one canvas
  const props = wrapper.Props;
  if (Array.isArray(props)) {
    for (let i = 0; i < props.length; i++) {
      const prop = props[i] as Record<string, unknown>;
      const allNodes: import("@xyflow/react").Node[] = [];
      const allEdges: import("@xyflow/react").Edge[] = [];

      const positions = prop.Positions;
      if (positions && typeof positions === "object" && "Type" in (positions as Record<string, unknown>)) {
        const { nodes, edges } = jsonToGraph(positions as Record<string, unknown>, 0, 0, `pos_${i}`);
        // Tag root node for reassembly
        if (nodes.length > 0) {
          // const root = nodes.find((n) => !edges.some((e) => e.target !== n.id || edges.some((e2) => e2.source === n.id && !edges.some((e3) => e3.target === n.id))));
          const rootNode = nodes[nodes.length - 1]; // last added is the root
          if (rootNode) {
            rootNode.data = { ...(rootNode.data as Record<string, unknown>), _biomeField: "Positions" };
          }
        }
        allNodes.push(...nodes);
        allEdges.push(...edges);
      }

      const assignments = prop.Assignments;
      if (assignments && typeof assignments === "object" && "Type" in (assignments as Record<string, unknown>)) {
        const { nodes, edges } = jsonToGraph(assignments as Record<string, unknown>, 0, 400, `asgn_${i}`);
        // Tag root node for reassembly
        if (nodes.length > 0) {
          const rootNode = nodes[nodes.length - 1];
          if (rootNode) {
            rootNode.data = { ...(rootNode.data as Record<string, unknown>), _biomeField: "Assignments" };
          }
        }
        allNodes.push(...nodes);
        allEdges.push(...edges);
      }

      const layoutedNodes = await maybeAutoLayout(allNodes, allEdges);
      const key = `Props[${i}]`;
      // layoutedNodes and allEdges are freshly created — no clone needed
      const propInitial: SectionHistoryEntry = { nodes: layoutedNodes, edges: allEdges, outputNodeId: null, label: "Initial" };
      sections[key] = { nodes: layoutedNodes, edges: allEdges, history: [propInitial], historyIndex: 0 };
      sectionKeys.push(key);
    }
  }

  // Extract flat config
  const config: BiomeConfig = {
    Name: (wrapper.Name as string) ?? "",
    EnvironmentProvider: (wrapper.EnvironmentProvider as Record<string, unknown>) ?? {},
    TintProvider: (wrapper.TintProvider as Record<string, unknown>) ?? {},
    propMeta: Array.isArray(props)
      ? (props as Record<string, unknown>[]).map((p) => ({
          Runtime: (p.Runtime as number) ?? 0,
          Skip: (p.Skip as boolean) ?? false,
        }))
      : [],
  };

  return { sections, config, sectionKeys };
}

/**
 * Wrappers around Tauri IPC commands for file I/O operations.
 */
export function useTauriIO() {
  const setProjectPath = useProjectStore((s) => s.setProjectPath);
  const setDirectoryTree = useProjectStore((s) => s.setDirectoryTree);
  const setCurrentFile = useProjectStore((s) => s.setCurrentFile);
  const setDirty = useProjectStore((s) => s.setDirty);
  const setLastError = useProjectStore((s) => s.setLastError);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const commitState = useEditorStore((s) => s.commitState);
  const cacheCurrentFile = useEditorStore((s) => s.cacheCurrentFile);
  const restoreFromCache = useEditorStore((s) => s.restoreFromCache);

  const handleOpenAssetPack = useCallback(async () => {
    setLastError(null);
    try {
      const selected = await open({ directory: true });
      if (!selected) return;

      const path = typeof selected === "string" ? selected : selected;
      await openAssetPack(path);
      setProjectPath(path);

      const entries = await listDirectory(path);
      setDirectoryTree(entries.map(mapDirEntry));
      useRecentProjectsStore.getState().addProject(path);
    } catch (err) {
      setLastError(`Failed to open asset pack: ${err}`);
    }
  }, [setProjectPath, setDirectoryTree, setLastError]);

  const handleSaveAssetPack = useCallback(async () => {
    setLastError(null);
    try {
      const projectPath = useProjectStore.getState().projectPath;
      if (!projectPath) return;

      const pack = { path: projectPath, assets: {} };
      await saveAssetPack(pack);
      setDirty(false);
    } catch (err) {
      setLastError(`Failed to save asset pack: ${err}`);
    }
  }, [setDirty, setLastError]);

  const handleOpenFile = useCallback(
    async (filePath: string) => {
      setLastError(null);
      try {
        // Cache the current file's graph before switching
        const previousFile = useProjectStore.getState().currentFile;
        const wasDirty = useProjectStore.getState().isDirty;
        if (previousFile) {
          cacheCurrentFile(previousFile, wasDirty);
        }

        setCurrentFile(filePath);

        // Load per-file bookmarks (scoped to current project); biome section
        // will be overridden later for biome files once the first section is known.
        const projectPath = useProjectStore.getState().projectPath ?? "";
        useUIStore.getState().reloadBookmarks(filePath, projectPath, "");

        // Try restoring from cache first (cache includes editingContext + originalWrapper)
        const cached = restoreFromCache(filePath);
        if (cached) {
          // Override bookmarks with cached biome section (if any)
          useUIStore.getState().reloadBookmarks(filePath, projectPath, cached.activeBiomeSection ?? "");
          setDirty(cached.isDirty);
          return;
        }

        // No cache — infer editing context from file path for fresh loads
        const pathLower = filePath.toLowerCase();
        if (pathLower.includes("/density/") || pathLower.includes("\\density\\")) {
          useEditorStore.getState().setEditingContext("Density");
        } else if (pathLower.includes("/curves/") || pathLower.includes("\\curves\\")) {
          useEditorStore.getState().setEditingContext("Curve");
        } else if (pathLower.includes("/materials/") || pathLower.includes("\\materials\\")) {
          useEditorStore.getState().setEditingContext("MaterialProvider");
        } else if (pathLower.includes("/patterns/") || pathLower.includes("\\patterns\\")) {
          useEditorStore.getState().setEditingContext("Pattern");
        } else if (pathLower.includes("/positions/") || pathLower.includes("\\positions\\")) {
          useEditorStore.getState().setEditingContext("PositionProvider");
        } else if (pathLower.includes("/props/") || pathLower.includes("\\props\\")) {
          useEditorStore.getState().setEditingContext("Prop");
        } else if (pathLower.includes("/scanners/") || pathLower.includes("\\scanners\\")) {
          useEditorStore.getState().setEditingContext("Scanner");
        } else if (pathLower.includes("/settings/") || pathLower.includes("\\settings\\")) {
          useEditorStore.getState().setEditingContext("Settings");
        } else {
          useEditorStore.getState().setEditingContext(null);
        }

        // Read from disk (fresh file is not dirty)
        setDirty(false);
        const rawContent = await readAssetFile(filePath);

        // Auto-detect Hytale native format and normalize to internal
        const content = (rawContent && typeof rawContent === "object")
          ? normalizeImport(rawContent as Record<string, unknown>)
          : rawContent;

        // Convert JSON to graph nodes
        if (content && typeof content === "object" && "Type" in (content as Record<string, unknown>)) {
          const typed = content as Record<string, unknown>;

          // NoiseRange files get special handling: extract Biomes + config, graph the Density subtree
          if (typed.Type === "NoiseRange") {
            const store = useEditorStore.getState();

            // Extract biome ranges
            const biomes = Array.isArray(typed.Biomes) ? typed.Biomes as { Biome: string; Min: number; Max: number }[] : [];
            store.setBiomeRanges(biomes.map((b) => ({ Biome: b.Biome, Min: b.Min, Max: b.Max })));

            // Extract config
            store.setNoiseRangeConfig({
              DefaultBiome: (typed.DefaultBiome as string) ?? "",
              DefaultTransitionDistance: (typed.DefaultTransitionDistance as number) ?? 16,
              MaxBiomeEdgeDistance: (typed.MaxBiomeEdgeDistance as number) ?? 32,
            });

            // Graph the Density subtree (if present and typed)
            const density = typed.Density;
            if (density && typeof density === "object" && "Type" in (density as Record<string, unknown>)) {
              const { nodes: newNodes, edges: newEdges } = jsonToGraph(density as Record<string, unknown>);
              const layoutedNodes = await maybeAutoLayout(newNodes, newEdges);
              setNodes(layoutedNodes);
              setEdges(newEdges);
            } else {
              setNodes([]);
              setEdges([]);
            }

            store.setEditingContext("NoiseRange");
            store.setOriginalWrapper(typed);
            commitState("Initial");
            // Restore persisted history if available
            const persisted = loadPersistedHistory(projectPath, filePath);
            if (persisted?.g) {
              useEditorStore.setState({ history: persisted.g.h, historyIndex: persisted.g.i });
            }
          } else {
            const { nodes: newNodes, edges: newEdges } = jsonToGraph(typed);

            // Auto-layout for clean positioning instead of naive x-300 offsets
            const layoutedNodes = await maybeAutoLayout(newNodes, newEdges);
            setNodes(layoutedNodes);
            setEdges(newEdges);
            commitState("Initial");

            // Store original wrapper for round-trip preservation
            useEditorStore.getState().setOriginalWrapper(typed);

            // Restore persisted history if available
            const persistedStandalone = loadPersistedHistory(projectPath, filePath);
            if (persistedStandalone?.g) {
              useEditorStore.setState({ history: persistedStandalone.g.h, historyIndex: persistedStandalone.g.i });
            }
          }
        } else if (content && typeof content === "object" && isSettingsFile(content as Record<string, unknown>, filePath)) {
          // Settings file — flat config with no graph
          const raw = content as Record<string, unknown>;
          const store = useEditorStore.getState();
          store.setSettingsConfig({
            CustomConcurrency: (raw.CustomConcurrency as number) ?? -1,
            BufferCapacityFactor: (raw.BufferCapacityFactor as number) ?? 0.4,
            TargetViewDistance: (raw.TargetViewDistance as number) ?? 1024,
            TargetPlayerCount: (raw.TargetPlayerCount as number) ?? 8,
            StatsCheckpoints: Array.isArray(raw.StatsCheckpoints) ? raw.StatsCheckpoints as number[] : [],
          });
          store.setEditingContext("Settings");
          store.setOriginalWrapper(raw);
          setNodes([]);
          setEdges([]);
          commitState("Initial");
          // Restore persisted history if available
          const persistedSettings = loadPersistedHistory(projectPath, filePath);
          if (persistedSettings?.g) {
            useEditorStore.setState({ history: persistedSettings.g.h, historyIndex: persistedSettings.g.i });
          }
        } else if (content && typeof content === "object" && isBiomeFile(content as Record<string, unknown>, filePath)) {
          // Biome wrapper file — extract all sections
          const wrapper = content as Record<string, unknown>;
          const { sections, config, sectionKeys } = await extractBiomeSections(wrapper);

          // Try to load ContentFields from sibling WorldStructures/MainWorld.json
          let contentFields: Record<string, number> | undefined;
          try {
            const normalized = filePath.replace(/\\/g, "/");
            const biomeDir = normalized.replace(/\/[^/]+$/, "");
            const parentDir = biomeDir.replace(/\/[^/]+$/, "");
            const worldStructurePath = `${parentDir}/WorldStructures/MainWorld.json`;
            const wsContent = await readAssetFile(worldStructurePath);
            if (wsContent && typeof wsContent === "object") {
              const ws = wsContent as Record<string, unknown>;
              const cfArray = ws.ContentFields as Array<{ Name: string; Value: number }> | undefined;
              if (Array.isArray(cfArray)) {
                const fields: Record<string, number> = {};
                for (const cf of cfArray) {
                  if (cf.Name && typeof cf.Value === "number") {
                    fields[cf.Name] = cf.Value;
                  }
                }
                if (Object.keys(fields).length > 0) {
                  contentFields = fields;
                }
              }
            }
          } catch {
            // WorldStructure not found — keep defaults
          }

          // Extract material config from MaterialProvider for voxel preview
          const matConfig = extractMaterialConfig(wrapper);

          // Load first section into canvas
          const firstKey = sectionKeys[0] ?? null;
          const firstSection = firstKey ? sections[firstKey] : null;

          // Atomic state update — sets ALL biome state at once to avoid race conditions.
          // Sections already have their initial history entry from extractBiomeSections(),
          // so no additional commitState() call is needed.
          useEditorStore.setState({
            biomeConfig: config,
            biomeSections: sections,
            activeBiomeSection: firstKey,
            nodes: firstSection ? firstSection.nodes : [],
            edges: firstSection ? firstSection.edges : [],
            outputNodeId: firstSection?.outputNodeId ?? null,
            editingContext: "Biome",
            originalWrapper: wrapper,
            materialConfig: matConfig,
            ...(contentFields ? { contentFields } : {}),
          });
          // Reload bookmarks scoped to the initial biome section
          useUIStore.getState().reloadBookmarks(filePath, projectPath, firstKey ?? "");

          // Restore persisted section histories if available
          const persistedBiome = loadPersistedHistory(projectPath, filePath);
          if (persistedBiome?.s) {
            const updatedSections = { ...sections };
            for (const [key, data] of Object.entries(persistedBiome.s)) {
              if (updatedSections[key]) {
                updatedSections[key] = { ...updatedSections[key], history: data.h, historyIndex: data.i };
              }
            }
            useEditorStore.setState({ biomeSections: updatedSections });
          }
        } else if (content && typeof content === "object") {
          // Non-typed wrapper file (e.g., Biome with nested typed assets)
          // Try to find a typed subtree to edit
          const wrapper = content as Record<string, unknown>;
          let foundTypedAsset = false;

          for (const [, val] of Object.entries(wrapper)) {
            if (val && typeof val === "object" && "Type" in (val as Record<string, unknown>)) {
              const { nodes: newNodes, edges: newEdges } = jsonToGraph(val as Record<string, unknown>);
              const layoutedNodes = await maybeAutoLayout(newNodes, newEdges);
              setNodes(layoutedNodes);
              setEdges(newEdges);
              commitState("Initial");
              useEditorStore.getState().setOriginalWrapper(wrapper);
              // Restore persisted history if available
              const persistedWrapper = loadPersistedHistory(projectPath, filePath);
              if (persistedWrapper?.g) {
                useEditorStore.setState({ history: persistedWrapper.g.h, historyIndex: persistedWrapper.g.i });
              }
              foundTypedAsset = true;
              break;
            }
          }

          if (!foundTypedAsset) {
            const store = useEditorStore.getState();
            // Safety net: if path detection already flagged Settings, load as settings with defaults
            if (store.editingContext === "Settings") {
              const raw = wrapper;
              store.setSettingsConfig({
                CustomConcurrency: (raw.CustomConcurrency as number) ?? -1,
                BufferCapacityFactor: (raw.BufferCapacityFactor as number) ?? 0.4,
                TargetViewDistance: (raw.TargetViewDistance as number) ?? 1024,
                TargetPlayerCount: (raw.TargetPlayerCount as number) ?? 8,
                StatsCheckpoints: Array.isArray(raw.StatsCheckpoints) ? raw.StatsCheckpoints as number[] : [],
              });
              store.setOriginalWrapper(raw);
              setNodes([]);
              setEdges([]);
              commitState("Initial");
            } else {
              // RawJson fallback — show the file as read-only JSON
              store.setEditingContext("RawJson");
              store.setRawJsonContent(wrapper);
              store.setOriginalWrapper(null);
              setNodes([]);
              setEdges([]);
            }
          }
        } else {
          setNodes([]);
          setEdges([]);
          useEditorStore.getState().setOriginalWrapper(null);
        }
      } catch (err) {
        setLastError(`Failed to open file: ${err}`);
      }
    },
    [setCurrentFile, setNodes, setEdges, commitState, setLastError, setDirty, cacheCurrentFile, restoreFromCache],
  );

  const handleSaveFile = useCallback(async () => {
    setLastError(null);
    try {
      const currentFile = useProjectStore.getState().currentFile;
      if (!currentFile) return;

      const { nodes, edges, originalWrapper, biomeRanges, noiseRangeConfig } = useEditorStore.getState();

      // NoiseRange files: reassemble the full structure
      if (originalWrapper?.Type === "NoiseRange") {
        const output = { ...originalWrapper } as Record<string, unknown>;
        output.Biomes = biomeRanges.map((r) => ({ Biome: r.Biome, Min: r.Min, Max: r.Max }));
        if (noiseRangeConfig) {
          output.DefaultBiome = noiseRangeConfig.DefaultBiome;
          output.DefaultTransitionDistance = noiseRangeConfig.DefaultTransitionDistance;
          output.MaxBiomeEdgeDistance = noiseRangeConfig.MaxBiomeEdgeDistance;
        }
        const densityJson = graphToJson(nodes, edges);
        if (densityJson) output.Density = densityJson;
        const hytaleOutput = normalizeExport(output, nodes);
        await writeAssetFile(currentFile, hytaleOutput);
        setDirty(false);
        return;
      }

      // Settings files: flat JSON output (no graph, no Hytale translation)
      const { settingsConfig, editingContext } = useEditorStore.getState();
      if (editingContext === "Settings" && settingsConfig && originalWrapper) {
        const output: Record<string, unknown> = { ...originalWrapper };
        output.CustomConcurrency = settingsConfig.CustomConcurrency;
        output.BufferCapacityFactor = settingsConfig.BufferCapacityFactor;
        output.TargetViewDistance = settingsConfig.TargetViewDistance;
        output.TargetPlayerCount = settingsConfig.TargetPlayerCount;
        output.StatsCheckpoints = settingsConfig.StatsCheckpoints;
        await writeAssetFile(currentFile, output);
        setDirty(false);
        return;
      }

      // RawJson files — save rawJsonContent directly to disk
      if (editingContext === "RawJson") {
        const rawContent = useEditorStore.getState().rawJsonContent;
        if (rawContent && currentFile) {
          await writeAssetFile(currentFile, rawContent);
          setDirty(false);
        }
        return;
      }

      // Biome files: reassemble the full structure from sections
      const { biomeConfig, biomeSections, activeBiomeSection } = useEditorStore.getState();
      if (editingContext === "Biome" && originalWrapper && biomeConfig && biomeSections) {
        // Save current section's graph state first (preserve history)
        const updatedSections = { ...biomeSections };
        if (activeBiomeSection && updatedSections[activeBiomeSection]) {
          updatedSections[activeBiomeSection] = {
            ...updatedSections[activeBiomeSection],
            nodes: structuredClone(nodes),
            edges: structuredClone(edges),
            outputNodeId: useEditorStore.getState().outputNodeId ?? null,
          };
        }

        const output = { ...originalWrapper } as Record<string, unknown>;
        output.Name = biomeConfig.Name;

        // Rebuild Terrain.Density from Terrain section
        if (updatedSections["Terrain"]) {
          const terrainJson = graphToJson(updatedSections["Terrain"].nodes, updatedSections["Terrain"].edges);
          const origTerrain = (originalWrapper.Terrain ?? {}) as Record<string, unknown>;
          output.Terrain = { ...origTerrain, Density: terrainJson };
        }

        // Rebuild MaterialProvider from MaterialProvider section
        if (updatedSections["MaterialProvider"]) {
          const matJson = graphToJson(updatedSections["MaterialProvider"].nodes, updatedSections["MaterialProvider"].edges);
          if (matJson) output.MaterialProvider = matJson;
        }

        // Rebuild Props from Props[i] sections
        const propKeys = Object.keys(updatedSections).filter((k) => k.startsWith("Props[")).sort();
        const props: Record<string, unknown>[] = [];
        for (let i = 0; i < propKeys.length; i++) {
          const section = updatedSections[propKeys[i]];
          const meta = biomeConfig.propMeta[i] ?? { Runtime: 0, Skip: false };
          const propEntry: Record<string, unknown> = {
            Runtime: meta.Runtime,
            Skip: meta.Skip,
          };

          const sectionNodes = section.nodes;
          const sectionEdges = section.edges;

          // Find roots tagged with _biomeField
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
            // No tagged roots — use graphToJsonMulti and assign by order
            const assets = graphToJsonMulti(sectionNodes, sectionEdges);
            if (assets[0]) propEntry.Positions = assets[0];
            if (assets[1]) propEntry.Assignments = assets[1];
          }

          props.push(propEntry);
        }
        output.Props = props;

        // Write flat fields
        output.EnvironmentProvider = biomeConfig.EnvironmentProvider;
        output.TintProvider = biomeConfig.TintProvider;

        const hytaleOutput = internalToHytaleBiome(output);
        await writeAssetFile(currentFile, hytaleOutput);
        setDirty(false);
        return;
      }

      const json = graphToJson(nodes, edges);
      if (json) {
        if (originalWrapper) {
          if ("Type" in originalWrapper) {
            // Direct typed asset — convert to Hytale native format
            const hytaleJson = normalizeExport(json, nodes);
            await writeAssetFile(currentFile, hytaleJson);
          } else {
            // Non-typed wrapper (e.g. Biome) — inject rebuilt asset into the correct sub-property
            const output = { ...originalWrapper };
            let replaced = false;
            for (const [key, val] of Object.entries(output)) {
              if (val && typeof val === "object" && "Type" in (val as Record<string, unknown>)) {
                output[key] = normalizeExport(json, nodes);
                replaced = true;
                break;
              }
            }
            const finalOutput = replaced ? output : normalizeExport(json, nodes);
            await writeAssetFile(currentFile, finalOutput);
          }
        } else {
          const hytaleJson = normalizeExport(json, nodes);
          await writeAssetFile(currentFile, hytaleJson);
        }
        setDirty(false);
      }
    } catch (err) {
      setLastError(`Failed to save file: ${err}`);
    }
  }, [setDirty, setLastError]);

  const handleSaveFileAs = useCallback(async () => {
    setLastError(null);
    try {
      const filePath = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!filePath) return;

      // Use serializeCurrentFile() which handles all file types correctly
      // (biome sections, NoiseRange config, settings, etc.)
      const { serializeCurrentFile } = await import("@/utils/exportAssetPack");
      const json = serializeCurrentFile();
      if (json) {
        await writeAssetFile(filePath, json);
        setCurrentFile(filePath);
        setDirty(false);
      }
    } catch (err) {
      setLastError(`Failed to save file: ${err}`);
    }
  }, [setCurrentFile, setDirty, setLastError]);

  const handleCreateFromTemplate = useCallback(
    async (templateName: string, targetPath?: string) => {
      setLastError(null);
      try {
        let path = targetPath;
        if (!path) {
          const selected = await open({ directory: true });
          if (!selected) return;
          path = typeof selected === "string" ? selected : selected;
        }

        if (templateName) {
          await createFromTemplate(templateName, path);
        } else {
          await createBlankProject(path);
        }
        setProjectPath(path);

        const entries = await listDirectory(path);
        setDirectoryTree(entries.map(mapDirEntry));
        useRecentProjectsStore.getState().addProject(path, templateName);
      } catch (err) {
        setLastError(`Failed to create project: ${err}`);
        throw err;
      }
    },
    [setProjectPath, setDirectoryTree, setLastError],
  );

  return {
    openAssetPack: handleOpenAssetPack,
    saveAssetPack: handleSaveAssetPack,
    openFile: handleOpenFile,
    saveFile: handleSaveFile,
    saveFileAs: handleSaveFileAs,
    createFromTemplate: handleCreateFromTemplate,
  };
}
