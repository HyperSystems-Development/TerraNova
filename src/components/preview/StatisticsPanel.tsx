import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { computeStatistics, computeHistogram, type Statistics, type Histogram } from "@/utils/statistics";

export function StatisticsPanel() {
  const values = usePreviewStore((s) => s.values);
  const showStatistics = usePreviewStore((s) => s.showStatistics);
  const setShowStatistics = usePreviewStore((s) => s.setShowStatistics);
  const statisticsLogScale = usePreviewStore((s) => s.statisticsLogScale);
  const setStatisticsLogScale = usePreviewStore((s) => s.setStatisticsLogScale);

  const [stats, setStats] = useState<Statistics | null>(null);
  const [histogram, setHistogram] = useState<Histogram | null>(null);

  useEffect(() => {
    if (!values || values.length === 0) {
      setStats(null);
      setHistogram(null);
      return;
    }
    setStats(computeStatistics(values));
    setHistogram(computeHistogram(values, 32));
  }, [values]);

  const copyStats = useCallback(() => {
    if (!stats) return;
    navigator.clipboard.writeText(JSON.stringify(stats, null, 2));
  }, [stats]);

  if (!values) return null;

  return (
    <div className="border-t border-tn-border">
      {/* Header */}
      <button
        onClick={() => setShowStatistics(!showStatistics)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-tn-text-muted hover:text-tn-text transition-colors"
      >
        <span className="font-medium">Statistics</span>
        <span>{showStatistics ? "\u25B4" : "\u25BE"}</span>
      </button>

      {showStatistics && stats && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
            <StatRow label="Min" value={stats.min} />
            <StatRow label="Max" value={stats.max} />
            <StatRow label="Mean" value={stats.mean} />
            <StatRow label="Median" value={stats.median} />
            <StatRow label="Std Dev" value={stats.stdDev} />
            <StatRow label="P25" value={stats.p25} />
            <StatRow label="P75" value={stats.p75} />
          </div>

          {/* Histogram */}
          {histogram && (
            <HistogramChart histogram={histogram} logScale={statisticsLogScale} />
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-tn-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={statisticsLogScale}
                onChange={(e) => setStatisticsLogScale(e.target.checked)}
                className="accent-tn-accent w-3 h-3"
              />
              Log scale
            </label>
            <button
              onClick={copyStats}
              className="ml-auto px-1.5 py-0.5 text-[10px] rounded bg-tn-panel text-tn-text-muted hover:text-tn-text hover:bg-white/10 transition-colors border border-tn-border"
            >
              Copy Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span className="text-tn-text-muted">{label}</span>
      <span className="text-tn-text font-mono text-right">{(value ?? 0).toFixed(4)}</span>
    </>
  );
}

function HistogramChart({ histogram, logScale }: { histogram: Histogram; logScale: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverBin, setHoverBin] = useState<{ idx: number; x: number; y: number } | null>(null);

  const maxCount = useMemo(() => {
    if (histogram.bins.length === 0) return 1;
    return Math.max(1, ...histogram.bins);
  }, [histogram]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    const binCount = histogram.bins.length;
    if (binCount === 0) return;

    const barW = w / binCount;
    const logMax = logScale ? Math.log(maxCount + 1) : maxCount;

    ctx.fillStyle = "#22d3ee40";
    ctx.strokeStyle = "#22d3ee80";
    ctx.lineWidth = 1;

    for (let i = 0; i < binCount; i++) {
      const count = histogram.bins[i];
      const normalized = logScale
        ? (count > 0 ? Math.log(count + 1) / logMax : 0)
        : count / maxCount;
      const barH = normalized * (h - 2);
      const x = i * barW;
      const y = h - barH;
      ctx.fillRect(x, y, barW - 0.5, barH);
      ctx.strokeRect(x, y, barW - 0.5, barH);
    }
  }, [histogram, logScale, maxCount]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      // const y = e.clientY - rect.top;
      const idx = Math.floor((x / rect.width) * histogram.bins.length);
      if (idx >= 0 && idx < histogram.bins.length) {
        setHoverBin({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setHoverBin(null);
      }
    },
    [histogram],
  );

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={200}
        height={80}
        className="w-full h-20 cursor-crosshair"
        style={{ imageRendering: "auto" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverBin(null)}
      />
      {hoverBin && (
        <div
          className="absolute pointer-events-none px-1.5 py-0.5 bg-tn-panel/95 border border-tn-border rounded text-[9px] text-tn-text font-mono z-10"
          style={{ left: Math.min(hoverBin.x, 140), top: Math.max(0, hoverBin.y - 24) }}
        >
          [{histogram.binEdges[hoverBin.idx].toFixed(3)}, {histogram.binEdges[hoverBin.idx + 1].toFixed(3)})
          : {histogram.bins[hoverBin.idx]}
        </div>
      )}
    </div>
  );
}
