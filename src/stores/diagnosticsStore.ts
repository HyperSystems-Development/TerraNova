import { create } from "zustand";
import type { GraphDiagnostic } from "@/utils/graphDiagnostics";
import type {
  AssetReferenceKind,
  AssetValidationBadge,
} from "@/utils/environmentAssetLookup";

interface DiagnosticsState {
  diagnostics: GraphDiagnostic[];
  byNodeId: Map<string, GraphDiagnostic[]>;
  assetValidationBadge: AssetValidationBadge;
  assetNamesByKind: Partial<Record<AssetReferenceKind, string[]>>;
  assetPathIndexByKind: Partial<Record<AssetReferenceKind, Record<string, string[]>>>;
  setDiagnostics: (diags: GraphDiagnostic[]) => void;
  setAssetValidationBadge: (badge: AssetValidationBadge) => void;
  setAssetNamesByKind: (names: Partial<Record<AssetReferenceKind, string[]>>) => void;
  setAssetPathIndexByKind: (index: Partial<Record<AssetReferenceKind, Record<string, string[]>>>) => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  diagnostics: [],
  byNodeId: new Map(),
  assetValidationBadge: {
    mode: "built-in-only",
    label: "Built-in validation only",
    detail: "Project asset lookup unavailable",
  },
  assetNamesByKind: {},
  assetPathIndexByKind: {},
  setDiagnostics: (diags) => {
    const grouped = new Map<string, GraphDiagnostic[]>();
    for (const d of diags) {
      if (d.nodeId) {
        const list = grouped.get(d.nodeId);
        if (list) {
          list.push(d);
        } else {
          grouped.set(d.nodeId, [d]);
        }
      }
    }
    set({ diagnostics: diags, byNodeId: grouped });
  },
  setAssetValidationBadge: (badge) => set({ assetValidationBadge: badge }),
  setAssetNamesByKind: (names) => set({ assetNamesByKind: names }),
  setAssetPathIndexByKind: (index) => set({ assetPathIndexByKind: index }),
}));
