import { describe, expect, it } from "vitest";
import type { CategoryDefaultsEntry } from "@/schema/defaults";
import { AssetCategory } from "@/schema/types";
import type { Node } from "@xyflow/react";
import { entryMatchesSearch, graphNodeMatchesSearch } from "../nodeTypeSearch";
import { getLanguageHelpers } from "@/languages/useLanguage";

const conditionEntry: CategoryDefaultsEntry = {
  type: "AlwaysTrueCondition",
  category: AssetCategory.Condition,
  defaults: {},
};

function makeGraphNode(id: string, dataType: string, rfType?: string): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    type: rfType,
    data: { type: dataType, fields: {} },
  };
}

describe("nodeTypeSearch", () => {
  const { matchesSearch } = getLanguageHelpers();

  it("matches quick-add entries by prefixed type key", () => {
    expect(entryMatchesSearch(conditionEntry, "Condition:AlwaysTrueCondition", matchesSearch)).toBe(true);
    expect(entryMatchesSearch(conditionEntry, "AlwaysTrue", matchesSearch)).toBe(true);
    expect(entryMatchesSearch(conditionEntry, "Multiplier", matchesSearch)).toBe(false);
  });

  it("matches graph nodes by React Flow type key", () => {
    const node = makeGraphNode("n1", "AlwaysTrueCondition", "Condition:AlwaysTrueCondition");
    expect(graphNodeMatchesSearch(node, "Condition:AlwaysTrueCondition", matchesSearch)).toBe(true);
    expect(graphNodeMatchesSearch(node, "AlwaysTrue", matchesSearch)).toBe(true);
  });
});
