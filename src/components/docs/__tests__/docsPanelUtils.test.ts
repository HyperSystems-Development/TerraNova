import { describe, expect, it } from "vitest";
import {
  buildDocNodeGraphMarkdownBlock,
  buildSnippetDocNodeGraph,
  buildSnippetGraphData,
  extractWalkthroughSteps,
  filterDocTree,
  findFirstFileSlug,
  getDefaultDocSlug,
  parseSnippetFence,
  stripDocComments,
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
      "reference/README",
      "reference/terrain-types",
    ];

    expect(getDefaultDocSlug("reference", slugs)).toBe("reference/README");
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

  it("builds a docs nodegraph preview from a Hytale terrain snippet", () => {
    const graph = buildSnippetDocNodeGraph(`{
  "Type": "Sum",
  "Inputs": [
    { "Type": "Constant", "Value": 80 },
    { "Type": "Inverter", "Inputs": [{ "Type": "YValue" }] }
  ]
}`);

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes.some((node) => node.label === "Sum")).toBe(true);
    expect(graph.height).toBeGreaterThanOrEqual(200);
    expect((graph as { clipboardData?: { version?: string } }).clipboardData?.version).toBe("1");
  });

  it("wraps docs nodegraphs in a paste-ready markdown fence", () => {
    const block = buildDocNodeGraphMarkdownBlock({
      height: 200,
      nodes: [{ id: "sum", label: "Sum", category: "math", x: 0, y: 0 }],
      edges: [],
    });

    expect(block.startsWith("```nodegraph")).toBe(true);
    expect(block).toContain(`"label": "Sum"`);
    expect(block.endsWith("```")).toBe(true);
  });

  it("preserves clipboard data when wrapping snippet nodegraphs", () => {
    const graph = buildSnippetDocNodeGraph(`{
  "Type": "Constant",
  "Value": 12
}`);
    const block = buildDocNodeGraphMarkdownBlock(graph);

    expect(block).toContain(`"clipboardData"`);
    expect(block).toContain(`"version": "1"`);
  });

  it("strips doc comments and extracts walkthrough steps", () => {
    const markdown = `# Intro
<!-- walkthrough -->
## Table of Contents
- [Step One](#step-one)
## Step One
First.
<!-- hidden -->
## Step Two
Second.
## Summary
Done.`;

    expect(stripDocComments(markdown)).not.toContain("hidden");
    expect(extractWalkthroughSteps(markdown)).toEqual([
      { title: "Step One", content: "First." },
      { title: "Step Two", content: "Second." },
    ]);
  });

  it("filters a doc tree and finds the first matching file slug", () => {
    const tree = [
      {
        type: "folder" as const,
        slug: "guides",
        children: [
          { type: "file" as const, slug: "guides/alpha" },
          {
            type: "folder" as const,
            slug: "guides/deep",
            children: [{ type: "file" as const, slug: "guides/deep/beta" }],
          },
        ],
      },
    ];

    const filtered = filterDocTree(tree, new Set(["guides/deep/beta"]));
    expect(filtered).toHaveLength(1);
    expect(findFirstFileSlug(filtered)).toBe("guides/deep/beta");
  });
});
