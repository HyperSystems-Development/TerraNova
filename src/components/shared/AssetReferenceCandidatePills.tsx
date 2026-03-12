import type { AssetReferenceCandidate } from "@/utils/environmentAssetLookup";

interface AssetReferenceCandidatePillsProps {
  candidates: AssetReferenceCandidate[];
  prefixLabel?: string;
  onReplace?: (candidate: AssetReferenceCandidate) => void;
  onOpen?: (candidate: AssetReferenceCandidate) => void;
}

export function AssetReferenceCandidatePills({
  candidates,
  prefixLabel,
  onReplace,
  onOpen,
}: AssetReferenceCandidatePillsProps) {
  if (candidates.length === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {prefixLabel && (
        <span className="text-[10px] uppercase tracking-wide text-tn-text-muted/70">
          {prefixLabel}
        </span>
      )}
      {candidates.map((candidate) => (
        <span
          key={`${candidate.name}:${candidate.path}`}
          className="inline-flex items-center overflow-hidden rounded border border-tn-border bg-white/5"
        >
          <button
            type="button"
            onClick={() => onReplace?.(candidate)}
            className="px-2 py-0.5 text-[10px] text-tn-text-muted hover:bg-white/10"
            title={`Replace with ${candidate.name}`}
          >
            {candidate.name}
          </button>
          {onOpen && (
            <button
              type="button"
              onClick={() => onOpen(candidate)}
              className="border-l border-tn-border px-1.5 py-0.5 text-[10px] text-tn-text-muted hover:bg-white/10"
              title={candidate.path}
            >
              Open
            </button>
          )}
        </span>
      ))}
    </span>
  );
}
