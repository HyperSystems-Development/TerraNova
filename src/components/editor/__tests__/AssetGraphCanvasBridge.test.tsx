import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { AssetGraphCanvasBridge } from "../AssetGraphCanvasBridge";

vi.mock("../EditorCanvas", () => ({
  EditorCanvas: () => <div data-testid="editor-canvas" />,
}));

describe("AssetGraphCanvasBridge", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("maps asset graph nodes into the editor store and seeds selection", () => {
    render(
      <AssetGraphCanvasBridge
        nodes={[
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: {
              label: "Weather File",
              subtitle: "Zone1_Sunny.json",
              accent: "#44aaee",
              stats: ["12 tracks"],
              badges: ["Weather"],
            },
          },
        ]}
        edges={[]}
        defaultSelectionId="root"
      />,
    );

    const state = useEditorStore.getState();
    expect(screen.getByTestId("editor-canvas")).toBeTruthy();
    expect(state.selectedNodeId).toBe("root");
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].type).toBe("structuredAssetCard");
    expect((state.nodes[0].data as Record<string, unknown>).type).toBe("Weather File");
  });

  it("does not re-apply identical graph content on rerender", () => {
    const setNodesSpy = vi.spyOn(useEditorStore.getState(), "setNodes");
    const setEdgesSpy = vi.spyOn(useEditorStore.getState(), "setEdges");

    const { rerender } = render(
      <AssetGraphCanvasBridge
        nodes={[
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: { label: "Environment File", subtitle: "Env_Zone1.json" },
          },
        ]}
        edges={[]}
        defaultSelectionId="root"
      />,
    );

    expect(setNodesSpy).toHaveBeenCalledTimes(1);
    expect(setEdgesSpy).toHaveBeenCalledTimes(1);

    rerender(
      <AssetGraphCanvasBridge
        nodes={[
          {
            id: "root",
            position: { x: 0, y: 0 },
            data: { label: "Environment File", subtitle: "Env_Zone1.json" },
          },
        ]}
        edges={[]}
        defaultSelectionId="root"
      />,
    );

    expect(setNodesSpy).toHaveBeenCalledTimes(1);
    expect(setEdgesSpy).toHaveBeenCalledTimes(1);
  });
});
