import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import {
  copyNodesToClipboard,
  pasteNodesFromClipboard,
  readClipboardData,
  type ClipboardData,
} from "../clipboard";

/* ── Helpers ───────────────────────────────────────────────────────── */

function makeNode(id: string, selected = false, x = 0, y = 0): Node {
  return {
    id,
    position: { x, y },
    data: { type: "SimplexNoise2D", fields: { Freq: 1 } },
    selected,
  };
}

function makeEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: "output",
    targetHandle: "input",
  };
}

beforeEach(() => {
  // Mock navigator.clipboard
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
  });
});

/* ── copyNodesToClipboard ──────────────────────────────────────────── */

describe("copyNodesToClipboard", () => {
  it("copies only selected nodes", () => {
    const nodes = [
      makeNode("a", true),
      makeNode("b", false),
      makeNode("c", true),
    ];
    const result = copyNodesToClipboard(nodes, []);
    expect(result).not.toBeNull();
    expect(result!.nodes.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("only copies edges where both endpoints are selected", () => {
    const nodes = [
      makeNode("a", true),
      makeNode("b", true),
      makeNode("c", false),
    ];
    const edges = [
      makeEdge("a", "b"), // both selected — keep
      makeEdge("a", "c"), // c not selected — drop
      makeEdge("c", "b"), // c not selected — drop
    ];
    const result = copyNodesToClipboard(nodes, edges);
    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0].source).toBe("a");
    expect(result!.edges[0].target).toBe("b");
  });

  it("returns null when no nodes are selected", () => {
    const nodes = [makeNode("a", false), makeNode("b", false)];
    expect(copyNodesToClipboard(nodes, [])).toBeNull();
  });

  it("handles empty edges gracefully", () => {
    const nodes = [makeNode("a", true)];
    const result = copyNodesToClipboard(nodes, []);
    expect(result).not.toBeNull();
    expect(result!.edges).toEqual([]);
    expect(result!.nodes).toHaveLength(1);
  });
});

/* ── pasteNodesFromClipboard ───────────────────────────────────────── */

describe("pasteNodesFromClipboard", () => {
  const clipData: ClipboardData = {
    version: "1",
    nodes: [makeNode("orig-a", false, 100, 200), makeNode("orig-b", false, 300, 400)],
    edges: [makeEdge("orig-a", "orig-b")],
  };

  it("remaps IDs on paste (new UUIDs, not equal to originals)", () => {
    const { nodes } = pasteNodesFromClipboard(clipData);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).not.toBe("orig-a");
    expect(nodes[1].id).not.toBe("orig-b");
    // UUIDs should be valid
    for (const n of nodes) {
      expect(n.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });

  it("offsets positions on paste", () => {
    const { nodes } = pasteNodesFromClipboard(clipData, 50, 50);
    expect(nodes[0].position).toEqual({ x: 150, y: 250 });
    expect(nodes[1].position).toEqual({ x: 350, y: 450 });
  });

  it("rewires edge source/target to new node IDs", () => {
    const { nodes, edges } = pasteNodesFromClipboard(clipData);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(nodes[0].id);
    expect(edges[0].target).toBe(nodes[1].id);
    // Edge IDs should also be new
    expect(edges[0].id).not.toBe("orig-a-orig-b");
  });

  it("pasted nodes are selected", () => {
    const { nodes } = pasteNodesFromClipboard(clipData);
    for (const n of nodes) {
      expect(n.selected).toBe(true);
    }
  });
});

/* ── readClipboardData ─────────────────────────────────────────────── */

describe("readClipboardData", () => {
  it("parses valid clipboard JSON", async () => {
    const data: ClipboardData = {
      version: "1",
      nodes: [makeNode("x")],
      edges: [],
    };
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue(
      JSON.stringify(data),
    );
    const result = await readClipboardData();
    expect(result).not.toBeNull();
    expect(result!.version).toBe("1");
    expect(result!.nodes).toHaveLength(1);
  });

  it("parses a nodegraph fence when it embeds clipboard data", async () => {
    const data: ClipboardData = {
      version: "1",
      nodes: [makeNode("doc-x")],
      edges: [],
    };
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue(`\`\`\`nodegraph
{
  "height": 220,
  "nodes": [{ "id": "preview-x", "label": "Constant", "x": 0, "y": 0 }],
  "edges": [],
  "clipboardData": ${JSON.stringify(data)}
}
\`\`\``);

    const result = await readClipboardData();

    expect(result).toEqual(data);
  });

  it("parses raw nodegraph JSON when it embeds clipboard data", async () => {
    const data: ClipboardData = {
      version: "1",
      nodes: [makeNode("doc-y")],
      edges: [makeEdge("doc-y", "doc-y")],
    };
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue(JSON.stringify({
      height: 220,
      nodes: [{ id: "preview-y", label: "Sum", x: 0, y: 0 }],
      edges: [],
      clipboardData: data,
    }));

    const result = await readClipboardData();

    expect(result).toEqual(data);
  });

  it("returns null for invalid JSON", async () => {
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue("not json");
    expect(await readClipboardData()).toBeNull();
  });

  it("returns null for wrong version", async () => {
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue(
      JSON.stringify({ version: "2", nodes: [], edges: [] }),
    );
    expect(await readClipboardData()).toBeNull();
  });

  it("returns null for missing arrays", async () => {
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue(
      JSON.stringify({ version: "1" }),
    );
    expect(await readClipboardData()).toBeNull();
  });
});
