import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from "@xyflow/react";
import type { ClipboardData } from "@/utils/clipboard";
import type { BiomeMaterialConfig } from "@/utils/materialResolver";
import type { AlignDirection } from "@/utils/alignDistribute";

// ---------------------------------------------------------------------------
// Shared data interfaces
// ---------------------------------------------------------------------------

export interface BiomeRangeEntry {
  Biome: string;
  Min: number;
  Max: number;
}

export interface NoiseRangeConfig {
  DefaultBiome: string;
  DefaultTransitionDistance: number;
  MaxBiomeEdgeDistance: number;
}

export interface BiomeConfig {
  Name: string;
  EnvironmentProvider: Record<string, unknown>;
  TintProvider: Record<string, unknown>;
  propMeta: Array<{ Runtime: number; Skip: boolean }>;
}

export interface SettingsConfig {
  CustomConcurrency: number;
  BufferCapacityFactor: number;
  TargetViewDistance: number;
  TargetPlayerCount: number;
  StatsCheckpoints: number[];
}

export interface InstanceConfig {
  comment: string;
  gameMode: string;
  gameplayConfig: string;
  worldStructure: string;
  spawnEnabled: boolean;
  spawnPoint: { X: number; Y: number; Z: number; Pitch: number; Yaw: number; Roll: number };
  toggles: Record<string, boolean>;
  availableWorldStructures: string[];
}

export interface SectionHistoryEntry {
  nodes: Node[];
  edges: Edge[];
  outputNodeId: string | null;
  label: string;
}

export interface BiomeSectionData {
  nodes: Node[];
  edges: Edge[];
  outputNodeId?: string | null;
  history: SectionHistoryEntry[];
  historyIndex: number;
}

export interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
  biomeRanges: BiomeRangeEntry[];
  noiseRangeConfig: NoiseRangeConfig | null;
  biomeConfig: BiomeConfig | null;
  settingsConfig: SettingsConfig | null;
  label: string;
}

export interface FileGraphCache {
  nodes: Node[];
  edges: Edge[];
  biomeRanges: BiomeRangeEntry[];
  noiseRangeConfig: NoiseRangeConfig | null;
  biomeConfig: BiomeConfig | null;
  settingsConfig: SettingsConfig | null;
  instanceConfig: InstanceConfig | null;
  materialConfig: BiomeMaterialConfig | null;
  biomeSections: Record<string, BiomeSectionData> | null;
  activeBiomeSection: string | null;
  editingContext: string | null;
  originalWrapper: Record<string, unknown> | null;
  rawJsonContent: Record<string, unknown> | null;
  outputNodeId: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
}

// ---------------------------------------------------------------------------
// Slice state interfaces
// ---------------------------------------------------------------------------

export interface GraphSliceState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  outputNodeId: string | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  removeNodes: (ids: string[]) => void;
  updateNodeField: (nodeId: string, fieldName: string, value: unknown) => void;
  splitEdge: (edgeId: string, newNodeId: string, inputHandle?: string, outputHandle?: string) => void;
  interjectOnEdge: (edgeId: string, newNodeId: string, inputHandle?: string, outputHandle?: string) => void;
  setOutputNode: (nodeId: string | null) => void;
  alignNodes: (direction: AlignDirection) => void;
  distributeNodes: (axis: "horizontal" | "vertical") => void;
  createGroup: (nodeIds: string[], name: string) => void;
  expandGroup: (groupId: string) => void;

  removeEdges: (ids: string[], label?: string) => void;

  // Material layer stack actions
  reorderMaterialLayers: (sadNodeId: string, fromIndex: number, toIndex: number) => void;
  addMaterialLayer: (sadNodeId: string, layerType: string) => void;
  removeMaterialLayer: (sadNodeId: string, layerIndex: number) => void;
  changeMaterialLayerType: (layerNodeId: string, newType: string, sadNodeId: string) => void;
}

export interface HistorySliceState {
  history: HistoryEntry[];
  historyIndex: number;
  _moveTimer: ReturnType<typeof setTimeout> | null;

  commitState: (label?: string) => void;
  undo: () => void;
  redo: () => void;
  jumpToHistory: (index: number) => void;
}

export interface BiomeSectionsSliceState {
  biomeSections: Record<string, BiomeSectionData> | null;
  activeBiomeSection: string | null;
  biomeConfig: BiomeConfig | null;

  setBiomeSections: (sections: Record<string, BiomeSectionData> | null) => void;
  setActiveBiomeSection: (section: string | null) => void;
  switchBiomeSection: (target: string) => void;
  setBiomeConfig: (config: BiomeConfig | null) => void;
  addPropSection: () => void;
  removePropSection: (key: string) => void;
}

export interface BiomeRangesSliceState {
  biomeRanges: BiomeRangeEntry[];
  noiseRangeConfig: NoiseRangeConfig | null;
  selectedBiomeIndex: number | null;

  setBiomeRanges: (ranges: BiomeRangeEntry[]) => void;
  setNoiseRangeConfig: (config: NoiseRangeConfig | null) => void;
  updateBiomeRange: (index: number, entry: Partial<BiomeRangeEntry>) => void;
  addBiomeRange: (entry: BiomeRangeEntry) => void;
  removeBiomeRange: (index: number) => void;
  setSelectedBiomeIndex: (index: number | null) => void;
  renameBiomeRange: (index: number, name: string) => void;
}

export interface FileCacheSliceState {
  fileCache: Map<string, FileGraphCache>;

  cacheCurrentFile: (filePath: string, isDirty: boolean) => void;
  restoreFromCache: (filePath: string) => FileGraphCache | false;
}

export interface ClipboardSliceState {
  _clipboardData: ClipboardData | null;

  copyNodes: () => void;
  pasteNodes: (offsetX?: number, offsetY?: number) => void;
  duplicateNodes: () => void;
  addSnippet: (newNodes: Node[], newEdges: Edge[]) => void;
}

export interface ConfigSliceState {
  settingsConfig: SettingsConfig | null;
  instanceConfig: InstanceConfig | null;
  contentFields: Record<string, number>;
  materialConfig: BiomeMaterialConfig | null;
  originalWrapper: Record<string, unknown> | null;
  editingContext: string | null;
  rawJsonContent: Record<string, unknown> | null;
  jsonViewDraft: string | null;

  setSettingsConfig: (config: SettingsConfig | null) => void;
  setInstanceConfig: (config: InstanceConfig | null) => void;
  setContentFields: (fields: Record<string, number>) => void;
  setMaterialConfig: (config: BiomeMaterialConfig | null) => void;
  setOriginalWrapper: (wrapper: Record<string, unknown> | null) => void;
  setEditingContext: (context: string | null) => void;
  setRawJsonContent: (content: Record<string, unknown> | null) => void;
  setJsonViewDraft: (draft: string | null) => void;
}

// ---------------------------------------------------------------------------
// Combined EditorState
// ---------------------------------------------------------------------------

export type EditorState = GraphSliceState &
  HistorySliceState &
  BiomeSectionsSliceState &
  BiomeRangesSliceState &
  FileCacheSliceState &
  ClipboardSliceState &
  ConfigSliceState & {
    reset: () => void;
  };

// Zustand slice creator signature (matches the 3-arg callback from create())
export type SliceCreator<T> = (
  set: (partial: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)) => void,
  get: () => EditorState,
  store: any,
) => T;
