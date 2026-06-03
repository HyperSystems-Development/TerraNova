import { describe, expect, it } from "vitest";
import { internalToHytaleBiome } from "../internalToHytale";
import {
  extractPreservedNodeEditorMetadata,
  mergePreservedNodeEditorMetadata,
} from "../nodeEditorMetadata";

describe("nodeEditorMetadata preservation", () => {
  it("extracts workspace, links, and floating nodes", () => {
    const preserved = extractPreservedNodeEditorMetadata({
      $WorkspaceID: "ws-abc",
      $Links: [{ from: "a", to: "b" }],
      $FloatingNodes: ["node-1"],
      $Comments: [],
    });
    expect(preserved).toEqual({
      $WorkspaceID: "ws-abc",
      $Links: [{ from: "a", to: "b" }],
      $FloatingNodes: ["node-1"],
    });
  });

  it("merges preserved fields into generated metadata", () => {
    const merged = mergePreservedNodeEditorMetadata(
      { $Nodes: {}, $Comments: [], $Groups: [], $WorkspaceID: "", $Links: [], $FloatingNodes: [] },
      {
        $WorkspaceID: "ws-keep",
        $Links: [{ id: 1 }],
        $FloatingNodes: ["float-a"],
      },
    );
    expect(merged.$WorkspaceID).toBe("ws-keep");
    expect(merged.$Links).toEqual([{ id: 1 }]);
    expect(merged.$FloatingNodes).toEqual(["float-a"]);
  });

  it("round-trips preserved metadata through biome export", () => {
    const preserved = extractPreservedNodeEditorMetadata({
      $WorkspaceID: "workspace-123",
      $Links: [{ $from: "n1", $to: "n2" }],
      $FloatingNodes: [],
      $Nodes: {},
      $Comments: [],
      $Groups: [],
    });

    const biome = internalToHytaleBiome(
      {
        Name: "Test",
        Terrain: { Type: "DAOTerrain", Density: { Type: "Constant", Value: 0 } },
        MaterialProvider: { Type: "Constant", Material: "Rock_Stone" },
        Props: [],
        EnvironmentProvider: { Type: "Constant", Environment: "default" },
        TintProvider: { Type: "Constant", Color: "#fff" },
      },
      {
        Terrain: [
          {
            id: "n1",
            position: { x: 0, y: 0 },
            data: { type: "Constant", fields: { Value: 0 } },
          } as never,
        ],
      },
      preserved,
    );

    const meta = biome.$NodeEditorMetadata as Record<string, unknown>;
    expect(meta.$WorkspaceID).toBe("workspace-123");
    expect(meta.$Links).toEqual([{ $from: "n1", $to: "n2" }]);
  });
});
