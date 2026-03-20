import { describe, expect, it } from "vitest";
import {
  buildSnippetGraphData,
  getDefaultDocSlug,
  parseSnippetFence,
} from "../docsPanelUtils";

describe("docsPanelUtils", () => {
  it("parses snippet headers into label and difficulty", () => {
    const parsed = parseSnippetFence(`Rolling Hills [Beginner]
{
  "Type": "Constant",
  "Value": 1
}`);

    expect(parsed.label).toBe("Rolling Hills");
    expect(parsed.difficulty).toBe("Beginner");
    expect(parsed.snippetJson).toContain(`"Type": "Constant"`);
  });

  it("resolves folder defaults via README, index, then first child", () => {
    const slugs = [
      "guides/terrain/terrain-types",
      "reference/index",
      "reference/terrain-types",
    ];

    expect(getDefaultDocSlug("reference", slugs)).toBe("reference/index");
    expect(getDefaultDocSlug("guides", slugs)).toBe("guides/terrain/terrain-types");
    expect(getDefaultDocSlug("missing", slugs)).toBeNull();
  });

  it("builds paste-ready clipboard data from a Hytale terrain snippet", () => {
    const { clipboardData, outputNodeId } = buildSnippetGraphData(`{
  "Type": "Sum",
  "Inputs": [
    { "Type": "Constant", "Value": 80 },
    { "Type": "Inverter", "Inputs": [{ "Type": "YValue" }] }
  ]
}`);

    expect(outputNodeId).toBeTruthy();
    expect(clipboardData.version).toBe("1");
    expect(clipboardData.nodes.length).toBeGreaterThan(0);
    expect(clipboardData.edges.length).toBeGreaterThan(0);
    expect(clipboardData.nodes.every((node) => node.selected)).toBe(true);
    expect(
      clipboardData.nodes.some((node) => (node.data as Record<string, unknown>)._outputNode === true),
    ).toBe(true);
  });
});
