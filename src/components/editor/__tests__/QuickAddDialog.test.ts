import { describe, expect, it } from "vitest";
import type { CategoryDefaultsEntry } from "@/schema/defaults";
import type { SnippetDefinition } from "@/schema/snippets";
import { AssetCategory } from "@/schema/types";
import {
  buildQuickAddDisplaySections,
  canConnectHandleCategories,
  clampQuickAddPosition,
  findCompatibleHandleForPendingConnection,
  type PendingConnection,
} from "../QuickAddDialog";
import { resolveNodeTypeKey } from "@/utils/nodeTypeKeys";
import { entryMatchesSearch } from "@/utils/nodeTypeSearch";
import { getLanguageHelpers } from "@/languages/useLanguage";

const densityEntry: CategoryDefaultsEntry = {
  type: "SimplexNoise2D",
  category: AssetCategory.Density,
  defaults: {},
};

const materialEntry: CategoryDefaultsEntry = {
  type: "Block",
  category: AssetCategory.MaterialProvider,
  defaults: {},
};

const propDistributionEntry: CategoryDefaultsEntry = {
  type: "PropDistribution:Assigned",
  category: AssetCategory.PropDistribution,
  defaults: {},
};

const conditionEntry: CategoryDefaultsEntry = {
  type: "AlwaysTrueCondition",
  category: AssetCategory.Condition,
  defaults: {},
};

const snippet: SnippetDefinition = {
  id: "starter",
  name: "Starter",
  description: "A starter graph",
  category: "Density",
  nodes: [],
  edges: [],
};

const pendingConnection: PendingConnection = {
  nodeId: "node-1",
  handleId: "output",
  handleType: "source",
  nodeType: "SimplexNoise2D",
};

describe("QuickAddDialog helpers", () => {
  it("matches palette entries by prefixed type keys", () => {
    const { matchesSearch } = getLanguageHelpers();
    expect(entryMatchesSearch(conditionEntry, "Condition:AlwaysTrueCondition", matchesSearch)).toBe(true);
    expect(entryMatchesSearch(conditionEntry, "AlwaysTrue", matchesSearch)).toBe(true);
  });

  it("resolves prefixed and bare node type keys", () => {
    expect(resolveNodeTypeKey(densityEntry)).toBe("SimplexNoise2D");
    expect(resolveNodeTypeKey(materialEntry)).toBe("Material:Block");
    expect(resolveNodeTypeKey(propDistributionEntry)).toBe("PropDistribution:Assigned");
  });

  it("uses the connection matrix for Quick Add compatibility", () => {
    expect(canConnectHandleCategories(AssetCategory.MaterialProvider, AssetCategory.MaterialProvider)).toBe(true);
    expect(canConnectHandleCategories(AssetCategory.MaterialProvider, AssetCategory.Density)).toBe(false);
    expect(canConnectHandleCategories(AssetCategory.Density, AssetCategory.Curve)).toBe(true);
  });

  it("finds only valid auto-connect handles for pending wires", () => {
    const materialSource: PendingConnection = {
      nodeId: "material-1",
      handleId: "output",
      handleType: "source",
      nodeType: "Material:Constant",
    };

    expect(findCompatibleHandleForPendingConnection("Clamp", materialSource)).toBeNull();
    expect(findCompatibleHandleForPendingConnection("Material:WeightedRandom", materialSource)?.id).toBe("Entries[0]");
  });

  it("resolves dynamic array handles while filtering wire-drop Quick Add", () => {
    const dynamicCurveTarget: PendingConnection = {
      nodeId: "curve-sum",
      handleId: "Inputs[2]",
      handleType: "target",
      nodeType: "Curve:Sum",
    };

    expect(findCompatibleHandleForPendingConnection("Curve:Constant", dynamicCurveTarget)?.id).toBe("output");
  });

  it("dedupes recent entries from the all-nodes section", () => {
    const result = buildQuickAddDisplaySections(
      [densityEntry],
      [snippet],
      [densityEntry, materialEntry],
      null,
    );

    expect(result.recentCount).toBe(1);
    expect(result.snippetCount).toBe(1);
    expect(result.nodeCount).toBe(1);
    expect(result.entries.map((entry) => entry.kind)).toEqual(["node", "snippet", "node"]);
    expect(result.entries[result.entries.length - 1]).toMatchObject({ kind: "node", entry: materialEntry });
  });

  it("hides recents and snippets while connection-filtered quick add is active", () => {
    const result = buildQuickAddDisplaySections(
      [densityEntry],
      [snippet],
      [materialEntry],
      pendingConnection,
    );

    expect(result.recentCount).toBe(0);
    expect(result.snippetCount).toBe(0);
    expect(result.nodeCount).toBe(1);
    expect(result.entries).toEqual([{ kind: "node", entry: materialEntry }]);
  });

  it("keeps the palette inside the viewport with a margin", () => {
    expect(clampQuickAddPosition({ x: -40, y: -20 }, { width: 500, height: 500 })).toEqual({
      x: 12,
      y: 12,
    });
    expect(clampQuickAddPosition({ x: 900, y: 900 }, { width: 500, height: 500 })).toEqual({
      x: 128,
      y: 58,
    });
  });
});
