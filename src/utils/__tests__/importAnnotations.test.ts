import { describe, it, expect } from "vitest";
import { parseNodeEditorMetadata } from "../hytaleToInternal";
import {
  buildAnnotationNodesFromImportMetadata,
  hasImportAnnotations,
  mergeImportGraph,
} from "../importAnnotations";
import type { ImportMetadata } from "../hytaleToInternal";

describe("parseNodeEditorMetadata", () => {
  it("reads $Text and $Width from Hytale comment metadata", () => {
    const parsed = parseNodeEditorMetadata({
      $Comments: [
        {
          $Text: "Shape the ridge here",
          $Position: { $x: 56, $y: 78 },
          $Width: 240,
          $Height: 96,
        },
      ],
      $Groups: [
        {
          $name: "Terrain Notes",
          $Position: { $x: 90, $y: 120 },
          $width: 420,
          $height: 260,
        },
      ],
    });

    expect(parsed.hytaleComments).toHaveLength(1);
    expect(parsed.hytaleComments[0].text).toBe("Shape the ridge here");
    expect(parsed.hytaleComments[0].width).toBe(240);
    expect(parsed.hytaleComments[0].height).toBe(96);
    expect(parsed.hytaleGroups[0].name).toBe("Terrain Notes");
  });

  it("falls back to lowercase $text for legacy files", () => {
    const parsed = parseNodeEditorMetadata({
      $Comments: [{ $text: "legacy note", $Position: { $x: 1, $y: 2 } }],
    });
    expect(parsed.hytaleComments[0].text).toBe("legacy note");
  });
});

describe("buildAnnotationNodesFromImportMetadata", () => {
  const metadata: ImportMetadata = {
    comments: {},
    nodeIds: {},
    nodePositions: {},
    hytaleComments: [
      { text: "Note", x: 10, y: 20, width: 200, height: 80 },
    ],
    hytaleGroups: [
      { name: "Group A", x: 30, y: 40, width: 400, height: 300 },
    ],
  };

  it("creates comment and frame nodes with expected shapes", () => {
    const nodes = buildAnnotationNodesFromImportMetadata(metadata);
    expect(nodes).toHaveLength(2);

    const comment = nodes.find((n) => n.type === "comment");
    const frame = nodes.find((n) => n.type === "frame");

    expect(comment?.position).toEqual({ x: 10, y: 20 });
    expect(comment?.data).toMatchObject({
      type: "comment",
      text: "Note",
      width: 200,
      height: 80,
    });

    expect(frame?.position).toEqual({ x: 30, y: 40 });
    expect(frame?.data).toMatchObject({
      type: "frame",
      name: "Group A",
      width: 400,
      height: 300,
    });
    expect(frame?.zIndex).toBe(-1);
  });

  it("returns empty array when metadata is null", () => {
    expect(buildAnnotationNodesFromImportMetadata(null)).toEqual([]);
  });
});

describe("hasImportAnnotations", () => {
  it("detects comments or groups", () => {
    expect(hasImportAnnotations({
      comments: {},
      nodeIds: {},
      nodePositions: {},
      hytaleComments: [{ text: "x", x: 0, y: 0, width: 1, height: 1 }],
      hytaleGroups: [],
    })).toBe(true);
    expect(hasImportAnnotations(null)).toBe(false);
  });
});

describe("mergeImportGraph", () => {
  it("appends annotations after layout without passing them to layout", async () => {
    const graphNode = {
      id: "n1",
      type: "Constant",
      position: { x: 0, y: 0 },
      data: { type: "Constant", fields: {} },
    };
    const metadata: ImportMetadata = {
      comments: {},
      nodeIds: {},
      nodePositions: {},
      hytaleComments: [{ text: "Hi", x: 5, y: 6, width: 100, height: 50 }],
      hytaleGroups: [],
    };

    const layoutFn = async (nodes: typeof graphNode[]) => {
      expect(nodes).toHaveLength(1);
      return [{ ...nodes[0], position: { x: 99, y: 99 } }];
    };

    const merged = await mergeImportGraph([graphNode], [], metadata, layoutFn);
    expect(merged).toHaveLength(2);
    expect(merged[0].position).toEqual({ x: 99, y: 99 });
    expect(merged[1].type).toBe("comment");
    expect(merged[1].position).toEqual({ x: 5, y: 6 });
  });
});
