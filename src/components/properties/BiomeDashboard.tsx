import { useEditorStore } from "@/stores/editorStore";
import {
  getSectionSummary,
  getPropSummaries,
  type SectionSummary,
  type PropSummaryEntry,
} from "@/utils/biomeSectionUtils";

/* ── Inline SVG icons — abstract representations of section types ──── */

function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8c1.5-4 3-4 4.5 0S8 12 9.5 8s3-4 4.5 0" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10l6 3 6-3" />
      <path d="M2 7l6 3 6-3" />
      <path d="M2 4l6 3 6-3L8 1 2 4z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M8 1L2 4.5v7L8 15l6-3.5v-7L8 1z" />
      <path d="M8 8v7" />
      <path d="M8 8L2 4.5" />
      <path d="M8 8l6-3.5" />
    </svg>
  );
}

function SectionIcon({ sectionKey, className }: { sectionKey: string; className?: string }) {
  if (sectionKey === "Terrain") return <WaveformIcon className={className} />;
  if (sectionKey === "MaterialProvider") return <LayersIcon className={className} />;
  if (sectionKey.startsWith("Props[")) return <CubeIcon className={className} />;
  return null;
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

interface BiomeDashboardProps {
  onBiomeConfigChange: (field: string, value: unknown) => void;
  onBlur: () => void;
}

export function BiomeDashboard({
  onBiomeConfigChange,
  onBlur,
}: BiomeDashboardProps) {
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);

  if (!biomeConfig || !biomeSections) return null;

  const envType = (biomeConfig.EnvironmentProvider as Record<string, unknown>).Type as string ?? "";

  const sectionKeys = Object.keys(biomeSections);
  const summaries: SectionSummary[] = sectionKeys.map((key) =>
    getSectionSummary(key, biomeSections[key]),
  );
  const propSummaries: PropSummaryEntry[] = getPropSummaries(biomeConfig, biomeSections);

  return (
    <div className="flex flex-col p-3 gap-3">
      {/* Biome Name */}
      <input
        type="text"
        value={biomeConfig.Name}
        onChange={(e) => onBiomeConfigChange("Name", e.target.value)}
        onBlur={onBlur}
        className="text-lg font-bold bg-transparent border-b border-tn-border focus:border-tn-accent outline-none pb-1 text-tn-text transition-colors"
        aria-label="Biome name"
      />

      {/* Environment Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-tn-text-muted">Environment</span>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#7DB350]/15 text-[#7DB350] border border-[#7DB350]/30">
          {envType || "None"}
        </span>
      </div>

      {/* Section Summary Cards */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-tn-text-muted font-medium">Sections</span>
        <div className="grid grid-cols-1 gap-1.5">
          {summaries.map((s) => (
            <button
              key={s.key}
              onClick={() => switchBiomeSection(s.key)}
              className="flex items-center gap-2 p-2 rounded border border-tn-border text-left transition-all duration-150 hover:border-white/20"
              style={{ backgroundColor: `${s.color}10` }}
            >
              <SectionIcon sectionKey={s.key} className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-tn-text">{s.label}</div>
                {s.rootTypeChain && (
                  <div className="text-[10px] text-tn-text-muted truncate">
                    {s.rootTypeChain}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${s.color}30`, color: s.color }}
                >
                  {s.nodeCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Prop Summary Table */}
      {propSummaries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-tn-text-muted font-medium">Props Overview</span>
          <div className="border border-tn-border rounded overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-tn-bg text-tn-text-muted border-b border-tn-border">
                  <th className="text-left px-2 py-1 font-medium">#</th>
                  <th className="text-left px-2 py-1 font-medium">Positions</th>
                  <th className="text-left px-2 py-1 font-medium">Assignments</th>
                  <th className="text-center px-2 py-1 font-medium">Rt</th>
                  <th className="text-center px-2 py-1 font-medium">Skip</th>
                </tr>
              </thead>
              <tbody>
                {propSummaries.map((p) => (
                  <tr
                    key={p.index}
                    onClick={() => switchBiomeSection(`Props[${p.index}]`)}
                    className="border-b border-tn-border last:border-b-0 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <td className="px-2 py-1 text-tn-text-muted">{p.index}</td>
                    <td className="px-2 py-1 text-tn-text truncate max-w-[80px]">{p.positionsType}</td>
                    <td className="px-2 py-1 text-tn-text truncate max-w-[80px]">{p.assignmentsType}</td>
                    <td className="px-2 py-1 text-center text-tn-text">{p.runtime}</td>
                    <td className="px-2 py-1 text-center">
                      {p.skip ? (
                        <span className="text-amber-400">Yes</span>
                      ) : (
                        <span className="text-tn-text-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
