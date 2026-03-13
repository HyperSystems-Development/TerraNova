import { useEditorStore } from "@/stores/editorStore";

export function SettingsEditorView() {
  const settingsConfig = useEditorStore((s) => s.settingsConfig);

  if (!settingsConfig) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-tn-text-muted">No settings loaded.</p>
      </div>
    );
  }

  const concurrencyLabel =
    settingsConfig.CustomConcurrency === -1
      ? "Auto"
      : `${settingsConfig.CustomConcurrency} threads`;

  const bufferPct = Math.round(settingsConfig.BufferCapacityFactor * 100);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-tn-text">Worldgen Settings</h2>
          <p className="text-xs text-tn-text-muted mt-1">
            Server configuration for chunk generation and memory allocation
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Concurrency */}
          <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
              Concurrency
            </span>
            <span className="text-xl font-bold text-tn-text">{concurrencyLabel}</span>
            <span className="text-[10px] text-tn-text-muted">
              {settingsConfig.CustomConcurrency === -1
                ? "Using all available CPU cores"
                : `Fixed at ${settingsConfig.CustomConcurrency} thread${settingsConfig.CustomConcurrency !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* View Distance */}
          <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
              View Distance
            </span>
            <span className="text-xl font-bold text-tn-text">
              {settingsConfig.TargetViewDistance}
              <span className="text-xs font-normal text-tn-text-muted ml-1">blocks</span>
            </span>
            <span className="text-[10px] text-tn-text-muted">
              Max render distance for terrain
            </span>
          </div>

          {/* Player Count */}
          <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
              Player Count
            </span>
            <span className="text-xl font-bold text-tn-text">
              {settingsConfig.TargetPlayerCount}
              <span className="text-xs font-normal text-tn-text-muted ml-1">players</span>
            </span>
            <span className="text-[10px] text-tn-text-muted">
              Expected simultaneous players
            </span>
          </div>

          {/* Buffer Factor */}
          <div className="flex flex-col gap-1 p-3 rounded-lg border border-tn-border bg-white/[0.02]">
            <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
              Buffer Capacity
            </span>
            <span className="text-xl font-bold text-tn-text">{bufferPct}%</span>
            <div className="w-full h-1.5 bg-tn-border rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-tn-accent rounded-full transition-all"
                style={{ width: `${Math.min(100, (settingsConfig.BufferCapacityFactor / 2.0) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-tn-text-muted">
              Memory multiplier for chunk buffers
            </span>
          </div>
        </div>

        {/* Stats Checkpoints */}
        <div className="p-3 rounded-lg border border-tn-border bg-white/[0.02]">
          <span className="text-[10px] uppercase tracking-wider text-tn-text-muted font-medium">
            Stats Checkpoints
          </span>
          {settingsConfig.StatsCheckpoints.length === 0 ? (
            <p className="text-xs text-tn-text-muted mt-1">
              No Y-level checkpoints configured
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {settingsConfig.StatsCheckpoints.map((val, i) => (
                <span
                  key={i}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-tn-accent/10 text-tn-accent border border-tn-accent/20"
                >
                  Y={val}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info text */}
        <p className="text-[10px] text-tn-text-muted text-center leading-relaxed">
          Edit values in the right panel (toggle with Ctrl+]). Changes are saved to Settings.json on Ctrl+S.
        </p>
      </div>
    </div>
  );
}
