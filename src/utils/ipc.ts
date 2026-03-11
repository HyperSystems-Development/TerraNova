import { invoke } from "@tauri-apps/api/core";

export interface AssetPackData {
  path: string;
  assets: Record<string, unknown>;
}

export interface DirectoryEntryData {
  name: string;
  path: string;
  is_dir: boolean;
  children?: DirectoryEntryData[];
}

export interface EvaluateRequest {
  graph: unknown;
  resolution: number;
  range_min: number;
  range_max: number;
  y_level: number;
}

export interface EvaluateResponse {
  values: number[];
  resolution: number;
  min_value: number;
  max_value: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  files_checked: number;
}

export interface ValidationError {
  file: string;
  field: string;
  message: string;
  severity: "Error" | "Warning" | "Info";
}

export async function openAssetPack(path: string): Promise<AssetPackData> {
  return invoke<AssetPackData>("open_asset_pack", { path });
}

export async function saveAssetPack(pack: AssetPackData): Promise<void> {
  return invoke("save_asset_pack", { pack });
}

export async function readAssetFile(path: string): Promise<unknown> {
  return invoke("read_asset_file", { path });
}

export async function writeAssetFile(path: string, content: unknown): Promise<void> {
  return invoke("write_asset_file", { path, content });
}

export async function exportAssetFile(path: string, content: unknown): Promise<void> {
  return invoke("export_asset_file", { path, content });
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  return invoke("write_text_file", { path, content });
}

export async function copyFile(source: string, destination: string): Promise<void> {
  return invoke("copy_file", { source, destination });
}

export async function listDirectory(path: string): Promise<DirectoryEntryData[]> {
  return invoke<DirectoryEntryData[]>("list_directory", { path });
}

export async function createFromTemplate(
  templateName: string,
  targetPath: string,
): Promise<void> {
  return invoke("create_from_template", {
    templateName,
    targetPath,
  });
}

export interface TemplateBiomeEntry {
  templateName: string;
  displayName: string;
  biomeName: string;
  path: string;
}

export async function listTemplateBiomes(): Promise<TemplateBiomeEntry[]> {
  return invoke<TemplateBiomeEntry[]>("list_template_biomes");
}

export async function createBlankProject(targetPath: string): Promise<void> {
  return invoke("create_blank_project", { targetPath });
}

export async function showInFolder(path: string): Promise<void> {
  return invoke("show_in_folder", { path });
}

export async function evaluateDensity(request: EvaluateRequest): Promise<EvaluateResponse> {
  return invoke<EvaluateResponse>("evaluate_density", { request });
}

export async function validateAssetPack(path: string): Promise<ValidationResult> {
  return invoke<ValidationResult>("validate_asset_pack", { path });
}

// ── Bridge types ──

export interface ServerStatus {
  status: string;
  bridge_version: string;
  player_count: number;
  port: number;
  singleplayer?: boolean;
}

export interface BridgeResponse {
  success: boolean;
  message: string;
}

export interface PlayerInfo {
  name: string;
  uuid: string;
  x?: number;
  y?: number;
  z?: number;
  world?: string;
}

// ── Bridge IPC wrappers ──

export async function bridgeConnect(host: string, port: number, authToken: string): Promise<ServerStatus> {
  return invoke<ServerStatus>("bridge_connect", { host, port, authToken });
}

export async function bridgeDisconnect(): Promise<void> {
  return invoke("bridge_disconnect");
}

export async function bridgeStatus(): Promise<ServerStatus> {
  return invoke<ServerStatus>("bridge_status");
}

export async function bridgeReloadWorldgen(): Promise<BridgeResponse> {
  return invoke<BridgeResponse>("bridge_reload_worldgen");
}

export async function bridgeRegenerateChunks(x: number, z: number, radius: number): Promise<BridgeResponse> {
  return invoke<BridgeResponse>("bridge_regenerate_chunks", { x, z, radius });
}

export async function bridgeTeleport(playerName: string, x: number, y: number, z: number): Promise<BridgeResponse> {
  return invoke<BridgeResponse>("bridge_teleport", { playerName, x, y, z });
}

export async function bridgePlayerInfo(): Promise<PlayerInfo> {
  return invoke<PlayerInfo>("bridge_player_info");
}

export async function bridgeSyncFile(sourcePath: string, serverModPath: string, relativePath: string): Promise<BridgeResponse> {
  return invoke<BridgeResponse>("bridge_sync_file", { sourcePath, serverModPath, relativePath });
}

// ── World preview types ──

export interface ChunkDataResponse {
  chunkX: number;
  chunkZ: number;
  yMin: number;
  yMax: number;
  sizeX: number;
  sizeZ: number;
  blocks: number[];
  heightmap: number[];
}

export interface BlockPaletteResponse {
  palette: Record<string, string>;
}

// ── World preview IPC wrappers ──

export async function bridgeFetchPalette(): Promise<BlockPaletteResponse> {
  return invoke<BlockPaletteResponse>("bridge_fetch_palette");
}

export async function bridgeFetchChunk(chunkX: number, chunkZ: number, yMin: number, yMax: number, forceLoad: boolean = false): Promise<ChunkDataResponse> {
  return invoke<ChunkDataResponse>("bridge_fetch_chunk", { chunkX, chunkZ, yMin, yMax, forceLoad });
}
