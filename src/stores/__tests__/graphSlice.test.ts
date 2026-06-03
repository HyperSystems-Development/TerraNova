import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/stores/editorStore";

describe("graph slice selection", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("keeps selectedNodeId and node.selected flags in sync", () => {
    useEditorStore.setState({
      nodes: [
        { id: "a", type: "Constant", position: { x: 0, y: 0 }, data: { type: "Constant", fields: {} } },
        { id: "b", type: "Constant", position: { x: 100, y: 0 }, data: { type: "Constant", fields: {} } },
      ],
      selectedNodeId: null,
    });

    useEditorStore.getState().setSelectedNodeId("b");

    const state = useEditorStore.getState();
    expect(state.selectedNodeId).toBe("b");
    expect(state.nodes.find((node) => node.id === "a")?.selected).toBe(false);
    expect(state.nodes.find((node) => node.id === "b")?.selected).toBe(true);

    useEditorStore.getState().setSelectedNodeId(null);

    expect(useEditorStore.getState().selectedNodeId).toBeNull();
    expect(useEditorStore.getState().nodes.every((node) => !node.selected)).toBe(true);
  });

  it("derives selectedNodeId from React Flow selection changes", () => {
    useEditorStore.setState({
      nodes: [
        { id: "a", type: "Constant", position: { x: 0, y: 0 }, data: { type: "Constant", fields: {} } },
        { id: "b", type: "Constant", position: { x: 100, y: 0 }, data: { type: "Constant", fields: {} } },
      ],
      selectedNodeId: null,
    });

    useEditorStore.getState().onNodesChange([{ id: "a", type: "select", selected: true }]);
    expect(useEditorStore.getState().selectedNodeId).toBe("a");

    useEditorStore.getState().onNodesChange([{ id: "b", type: "select", selected: true }]);
    expect(useEditorStore.getState().selectedNodeId).toBeNull();
  });

  it("clears stale selectedNodeId for bulk setNodes multi-select state", () => {
    useEditorStore.setState({
      nodes: [
        { id: "a", type: "Constant", position: { x: 0, y: 0 }, data: { type: "Constant", fields: {} }, selected: true },
        { id: "b", type: "Constant", position: { x: 100, y: 0 }, data: { type: "Constant", fields: {} } },
      ],
      selectedNodeId: "a",
    });

    useEditorStore.getState().setNodes([
      { id: "a", type: "Constant", position: { x: 0, y: 0 }, data: { type: "Constant", fields: {} }, selected: true },
      { id: "b", type: "Constant", position: { x: 100, y: 0 }, data: { type: "Constant", fields: {} }, selected: true },
    ]);

    expect(useEditorStore.getState().selectedNodeId).toBeNull();
  });
});
