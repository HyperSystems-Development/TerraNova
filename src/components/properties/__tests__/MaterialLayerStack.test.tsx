import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { MaterialLayerStack } from "../MaterialLayerStack";

beforeEach(() => {
  useEditorStore.getState().reset();
});

/* ── V1 test helpers ───────────────────────────────────────────────── */

function setupMaterialProviderV1() {
  useEditorStore.setState({
    biomeSections: {
      MaterialProvider: {
        nodes: [
          { id: "cond", position: { x: 200, y: 0 }, data: { type: "Conditional", fields: { Threshold: 0.6 } } },
          { id: "noise", position: { x: 0, y: 0 }, data: { type: "SimplexNoise2D", fields: {} } },
          { id: "gravel", position: { x: 0, y: 100 }, data: { type: "Constant", fields: { Material: "gravel" } } },
          { id: "sad", position: { x: 0, y: 200 }, data: { type: "SpaceAndDepth", fields: { DepthThreshold: 3 } } },
          { id: "hg", position: { x: -100, y: 200 }, data: { type: "HeightGradient", fields: {} } },
          { id: "stone", position: { x: -200, y: 200 }, data: { type: "Constant", fields: { Material: "stone" } } },
          { id: "dirt", position: { x: -200, y: 300 }, data: { type: "Constant", fields: { Material: "dirt" } } },
          { id: "grass", position: { x: -100, y: 300 }, data: { type: "Constant", fields: { Material: "grass" } } },
        ],
        edges: [
          { id: "e1", source: "noise", target: "cond", targetHandle: "Condition" },
          { id: "e2", source: "gravel", target: "cond", targetHandle: "TrueInput" },
          { id: "e3", source: "sad", target: "cond", targetHandle: "FalseInput" },
          { id: "e4", source: "hg", target: "sad", targetHandle: "Solid" },
          { id: "e5", source: "grass", target: "sad", targetHandle: "Empty" },
          { id: "e6", source: "stone", target: "hg", targetHandle: "Low" },
          { id: "e7", source: "dirt", target: "hg", targetHandle: "High" },
        ],
        history: [], historyIndex: -1,
      },
    },
  });
}

/* ── V2 test helpers ───────────────────────────────────────────────── */

function setupMaterialProviderV2() {
  useEditorStore.setState({
    biomeSections: {
      MaterialProvider: {
        nodes: [
          {
            id: "sad",
            position: { x: 200, y: 0 },
            data: {
              type: "SpaceAndDepth",
              fields: {
                LayerContext: "DEPTH_INTO_FLOOR",
                MaxExpectedDepth: 16,
                Condition: { Type: "AlwaysTrueCondition" },
              },
            },
          },
          { id: "layer0", position: { x: 0, y: 0 }, data: { type: "ConstantThickness", fields: { Thickness: 3 } } },
          { id: "layer1", position: { x: 0, y: 150 }, data: { type: "RangeThickness", fields: { RangeMin: 1, RangeMax: 5, Seed: "" } } },
          { id: "mat0", position: { x: -200, y: 0 }, data: { type: "Constant", fields: { Material: "stone" } } },
          { id: "mat1", position: { x: -200, y: 150 }, data: { type: "Constant", fields: { Material: "dirt" } } },
        ],
        edges: [
          { id: "e1", source: "layer0", sourceHandle: "output", target: "sad", targetHandle: "Layers[0]" },
          { id: "e2", source: "layer1", sourceHandle: "output", target: "sad", targetHandle: "Layers[1]" },
          { id: "e3", source: "mat0", sourceHandle: "output", target: "layer0", targetHandle: "Material" },
          { id: "e4", source: "mat1", sourceHandle: "output", target: "layer1", targetHandle: "Material" },
        ],
        history: [], historyIndex: -1,
      },
    },
  });
}

/* ── V1 Tests ──────────────────────────────────────────────────────── */

describe("MaterialLayerStack — V1 (read-only)", () => {
  it("renders null when no MaterialProvider section", () => {
    const { container } = render(<MaterialLayerStack />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correct number of material layers", () => {
    setupMaterialProviderV1();
    render(<MaterialLayerStack />);

    expect(screen.getByText("Material Layers")).toBeTruthy();
    // Should find gravel, stone, dirt, grass
    expect(screen.getByText("gravel")).toBeTruthy();
    expect(screen.getByText("stone")).toBeTruthy();
    expect(screen.getByText("dirt")).toBeTruthy();
    expect(screen.getByText("grass")).toBeTruthy();
  });

  it("shows role badges", () => {
    setupMaterialProviderV1();
    render(<MaterialLayerStack />);

    expect(screen.getByText("True")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.getByText("Empty")).toBeTruthy();
  });

  it("clicking a layer sets selectedNodeId", () => {
    setupMaterialProviderV1();
    render(<MaterialLayerStack />);

    fireEvent.click(screen.getByText("stone").closest("button")!);
    expect(useEditorStore.getState().selectedNodeId).toBe("stone");
  });

  it("shows depth indicator for SpaceAndDepth layers", () => {
    setupMaterialProviderV1();
    render(<MaterialLayerStack />);

    expect(screen.getAllByText(/depth: 3/).length).toBeGreaterThan(0);
  });

  it("shows read-only indicator for V1 graphs", () => {
    setupMaterialProviderV1();
    render(<MaterialLayerStack />);

    expect(screen.getByText(/read-only/)).toBeTruthy();
  });
});

/* ── V2 Tests ──────────────────────────────────────────────────────── */

describe("MaterialLayerStack — V2 (interactive)", () => {
  it("renders V2 layer editor with correct layer count", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("Material Layers")).toBeTruthy();
    expect(screen.getByText("2 layers")).toBeTruthy();
  });

  it("renders material names for V2 layers", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("stone")).toBeTruthy();
    expect(screen.getByText("dirt")).toBeTruthy();
  });

  it("shows layer type badges", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("Constant")).toBeTruthy();
    expect(screen.getByText("Range")).toBeTruthy();
  });

  it("shows thickness info", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("t: 3")).toBeTruthy();
    expect(screen.getByText("t: 1-5")).toBeTruthy();
  });

  it("click-to-select works for V2 layers", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    fireEvent.click(screen.getByText("stone"));
    expect(useEditorStore.getState().selectedNodeId).toBe("mat0");
  });

  it("shows SpaceAndDepth settings", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    // Context dropdown
    const contextSelect = screen.getByDisplayValue("DEPTH INTO FLOOR");
    expect(contextSelect).toBeTruthy();

    // Max depth input
    const maxDepthInput = screen.getByDisplayValue("16");
    expect(maxDepthInput).toBeTruthy();
  });

  it("shows condition badge", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("Always True")).toBeTruthy();
  });

  it("shows Add button", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    expect(screen.getByText("Add")).toBeTruthy();
  });

  it("add layer creates new nodes and edges", () => {
    setupMaterialProviderV2();
    render(<MaterialLayerStack />);

    // Get initial state
    const initialSection = useEditorStore.getState().biomeSections?.MaterialProvider;
    const initialNodeCount = initialSection?.nodes.length ?? 0;

    // We can't easily test the full store mutation through the component
    // since addMaterialLayer modifies the main graph nodes/edges, not biomeSections.
    // Instead, test the store action directly:
    const store = useEditorStore.getState();
    // Set up the main graph with the SAD node
    useEditorStore.setState({
      nodes: initialSection?.nodes ?? [],
      edges: initialSection?.edges ?? [],
    });

    store.addMaterialLayer("sad", "ConstantThickness");

    const state = useEditorStore.getState();
    // Should add 2 nodes (layer + material)
    expect(state.nodes.length).toBe(initialNodeCount + 2);
    // Should add 2 edges (layer→SAD, material→layer)
    const initialEdgeCount = initialSection?.edges.length ?? 0;
    expect(state.edges.length).toBe(initialEdgeCount + 2);
  });

  it("remove layer removes nodes and re-indexes edges", () => {
    setupMaterialProviderV2();
    const initialSection = useEditorStore.getState().biomeSections?.MaterialProvider;

    useEditorStore.setState({
      nodes: initialSection?.nodes ?? [],
      edges: initialSection?.edges ?? [],
    });

    const store = useEditorStore.getState();
    store.removeMaterialLayer("sad", 0);

    const state = useEditorStore.getState();
    // Should have removed layer0 and mat0 (2 nodes)
    expect(state.nodes.find((n) => n.id === "layer0")).toBeUndefined();
    expect(state.nodes.find((n) => n.id === "mat0")).toBeUndefined();

    // Remaining layer edge should be re-indexed to Layers[0]
    const layerEdge = state.edges.find(
      (e) => e.target === "sad" && /^Layers\[\d+\]$/.test(e.targetHandle ?? ""),
    );
    expect(layerEdge?.targetHandle).toBe("Layers[0]");
    expect(layerEdge?.source).toBe("layer1");
  });

  it("reorder layers updates edge indices", () => {
    setupMaterialProviderV2();
    const initialSection = useEditorStore.getState().biomeSections?.MaterialProvider;

    useEditorStore.setState({
      nodes: initialSection?.nodes ?? [],
      edges: initialSection?.edges ?? [],
    });

    const store = useEditorStore.getState();
    store.reorderMaterialLayers("sad", 0, 1);

    const state = useEditorStore.getState();
    const layerEdges = state.edges
      .filter((e) => e.target === "sad" && /^Layers\[\d+\]$/.test(e.targetHandle ?? ""))
      .sort((a, b) => {
        const ai = parseInt(/\[(\d+)\]/.exec(a.targetHandle!)![1]);
        const bi = parseInt(/\[(\d+)\]/.exec(b.targetHandle!)![1]);
        return ai - bi;
      });

    // After swapping: layer1 should be at index 0, layer0 at index 1
    expect(layerEdges[0].source).toBe("layer1");
    expect(layerEdges[0].targetHandle).toBe("Layers[0]");
    expect(layerEdges[1].source).toBe("layer0");
    expect(layerEdges[1].targetHandle).toBe("Layers[1]");
  });

  it("change layer type creates new node with correct type", () => {
    setupMaterialProviderV2();
    const initialSection = useEditorStore.getState().biomeSections?.MaterialProvider;

    useEditorStore.setState({
      nodes: initialSection?.nodes ?? [],
      edges: initialSection?.edges ?? [],
    });

    const store = useEditorStore.getState();
    store.changeMaterialLayerType("layer0", "NoiseThickness", "sad");

    const state = useEditorStore.getState();
    // Old node should be gone
    expect(state.nodes.find((n) => n.id === "layer0")).toBeUndefined();

    // New node should exist with NoiseThickness type
    const newLayerNode = state.nodes.find(
      (n) => (n.data as Record<string, unknown>).type === "NoiseThickness",
    );
    expect(newLayerNode).toBeDefined();
    expect(newLayerNode!.type).toBe("Layer:NoiseThickness");

    // Material edge should be transferred
    const matEdge = state.edges.find(
      (e) => e.target === newLayerNode!.id && e.targetHandle === "Material",
    );
    expect(matEdge).toBeDefined();
    expect(matEdge!.source).toBe("mat0");
  });

  it("SpaceAndDepth settings update via updateNodeField", () => {
    setupMaterialProviderV2();
    const initialSection = useEditorStore.getState().biomeSections?.MaterialProvider;

    useEditorStore.setState({
      nodes: initialSection?.nodes ?? [],
      edges: initialSection?.edges ?? [],
    });

    const store = useEditorStore.getState();
    store.updateNodeField("sad", "LayerContext", "DEPTH_INTO_CEILING");
    store.updateNodeField("sad", "MaxExpectedDepth", 32);

    const state = useEditorStore.getState();
    const sadNode = state.nodes.find((n) => n.id === "sad");
    const fields = (sadNode?.data as Record<string, unknown>)?.fields as Record<string, unknown>;
    expect(fields.LayerContext).toBe("DEPTH_INTO_CEILING");
    expect(fields.MaxExpectedDepth).toBe(32);
  });
});
