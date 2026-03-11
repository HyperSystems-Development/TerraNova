import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import type { InstanceConfig } from "@/stores/slices/types";

const GAME_MODES = ["Creative", "Adventure"];

const TOGGLE_LABELS: Record<string, string> = {
  IsPvpEnabled: "PvP Enabled",
  IsSpawningNPC: "NPC Spawning",
  IsCompassUpdating: "Compass Updating",
  IsTicking: "World Ticking",
  IsGameTimePaused: "Game Time Paused",
  IsObjectiveMarkersEnabled: "Objective Markers",
  IsAllNPCFrozen: "All NPC Frozen",
  IsSavingPlayers: "Save Players",
  IsSpawnMarkersEnabled: "Spawn Markers",
  DeleteOnRemove: "Delete On Remove",
};

function useInstanceField<K extends keyof InstanceConfig>(field: K) {
  const value = useEditorStore((s) => s.instanceConfig?.[field]);
  const setInstanceConfig = useEditorStore((s) => s.setInstanceConfig);
  const setDirty = useProjectStore((s) => s.setDirty);

  const update = (newValue: InstanceConfig[K]) => {
    const current = useEditorStore.getState().instanceConfig;
    if (!current) return;
    setInstanceConfig({ ...current, [field]: newValue });
    setDirty(true);
  };

  return [value, update] as const;
}

export function InstanceEditorView() {
  const instanceConfig = useEditorStore((s) => s.instanceConfig);

  if (!instanceConfig) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-tn-text-muted">No instance loaded.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-lg flex flex-col gap-5">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-tn-text">Instance Editor</h2>
          <p className="text-xs text-tn-text-muted mt-1">
            Configure the world instance entry point
          </p>
        </div>

        <WorldGenSection />
        <GameSettingsSection />
        <SpawnPointSection />
        <TogglesSection />

        <p className="text-[10px] text-tn-text-muted text-center leading-relaxed">
          Changes are saved to instance.bson on Ctrl+S.
        </p>
      </div>
    </div>
  );
}

function WorldGenSection() {
  const [worldStructure, setWorldStructure] = useInstanceField("worldStructure");
  const available = useEditorStore((s) => s.instanceConfig?.availableWorldStructures ?? []);

  return (
    <div className="p-4 rounded-lg border border-tn-accent/30 bg-tn-accent/5">
      <span className="text-[10px] uppercase tracking-wider text-tn-accent font-medium">
        World Generation
      </span>
      <div className="mt-2 flex flex-col gap-2">
        <label className="text-xs text-tn-text-muted">WorldStructure</label>
        <div className="flex gap-2">
          <input
            list="ws-options"
            value={worldStructure ?? ""}
            onChange={(e) => setWorldStructure(e.target.value)}
            className="flex-1 px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded text-tn-text focus:border-tn-accent outline-none"
            placeholder="e.g. MyWorldStructure"
          />
          <datalist id="ws-options">
            {available.map((ws) => (
              <option key={ws} value={ws} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-tn-text-muted">Type:</span>
          <span className="text-xs font-mono text-tn-text">HytaleGenerator</span>
        </div>
      </div>
    </div>
  );
}

function GameSettingsSection() {
  const [gameMode, setGameMode] = useInstanceField("gameMode");
  const [gameplayConfig, setGameplayConfig] = useInstanceField("gameplayConfig");
  const [comment, setComment] = useInstanceField("comment");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
        <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
          Game Mode
        </span>
        <select
          value={gameMode ?? "Creative"}
          onChange={(e) => setGameMode(e.target.value)}
          className="px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded text-tn-text focus:border-tn-accent outline-none"
        >
          {GAME_MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
        <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
          Gameplay Config
        </span>
        <input
          value={gameplayConfig ?? "Default"}
          onChange={(e) => setGameplayConfig(e.target.value)}
          className="px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded text-tn-text focus:border-tn-accent outline-none"
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
        <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
          Comment
        </span>
        <input
          value={comment ?? ""}
          onChange={(e) => setComment(e.target.value)}
          className="px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded text-tn-text focus:border-tn-accent outline-none"
          placeholder="Description of this instance"
        />
      </div>
    </div>
  );
}

function SpawnPointSection() {
  const [spawnEnabled, setSpawnEnabled] = useInstanceField("spawnEnabled");
  const spawnPoint = useEditorStore((s) => s.instanceConfig?.spawnPoint);
  const setInstanceConfig = useEditorStore((s) => s.setInstanceConfig);
  const setDirty = useProjectStore((s) => s.setDirty);

  const updateSpawnField = (field: string, value: number) => {
    const current = useEditorStore.getState().instanceConfig;
    if (!current) return;
    setInstanceConfig({
      ...current,
      spawnPoint: { ...current.spawnPoint, [field]: value },
    });
    setDirty(true);
  };

  return (
    <div className="p-3 rounded-lg border border-tn-border bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
          Spawn Point
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-[10px] text-tn-text-muted">
            {spawnEnabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={() => setSpawnEnabled(!spawnEnabled)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              spawnEnabled ? "bg-tn-accent" : "bg-tn-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                spawnEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {spawnEnabled && spawnPoint && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {(["X", "Y", "Z", "Pitch", "Yaw", "Roll"] as const).map((field) => (
            <div key={field} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-tn-text-muted">{field}</span>
              <input
                type="number"
                step={field === "Y" ? 1 : 0.1}
                value={spawnPoint[field]}
                onChange={(e) => updateSpawnField(field, parseFloat(e.target.value) || 0)}
                className="px-2 py-1 text-xs bg-tn-bg border border-tn-border rounded text-tn-text focus:border-tn-accent outline-none font-mono"
              />
            </div>
          ))}
        </div>
      )}

      {!spawnEnabled && (
        <p className="text-[10px] text-tn-text-muted mt-2">
          SpawnProvider will be omitted from the output file.
        </p>
      )}
    </div>
  );
}

function TogglesSection() {
  const toggles = useEditorStore((s) => s.instanceConfig?.toggles);
  const setInstanceConfig = useEditorStore((s) => s.setInstanceConfig);
  const setDirty = useProjectStore((s) => s.setDirty);

  if (!toggles) return null;

  const updateToggle = (key: string, value: boolean) => {
    const current = useEditorStore.getState().instanceConfig;
    if (!current) return;
    setInstanceConfig({
      ...current,
      toggles: { ...current.toggles, [key]: value },
    });
    setDirty(true);
  };

  return (
    <div className="p-3 rounded-lg border border-tn-border bg-white/[0.02]">
      <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
        Toggles
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
        {Object.entries(TOGGLE_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => updateToggle(key, !toggles[key])}
              className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${
                toggles[key] ? "bg-tn-accent" : "bg-tn-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  toggles[key] ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-xs text-tn-text">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
