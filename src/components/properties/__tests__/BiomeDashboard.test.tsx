import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { BiomeDashboard } from "../BiomeDashboard";

const noop = () => {};

beforeEach(() => {
  useEditorStore.getState().reset();
});

function setupBiomeState() {
  useEditorStore.setState({
    biomeConfig: {
      Name: "forest_hills",
      EnvironmentProvider: { Type: "Default" },
      TintProvider: { Type: "Gradient", From: "#2d5a1e", To: "#1a3a0e" },
      propMeta: [
        { Runtime: 0, Skip: false },
        { Runtime: 2, Skip: true },
      ],
    },
    biomeSections: {
      Terrain: {
        nodes: [
          { id: "t1", position: { x: 0, y: 0 }, data: { type: "Clamp", fields: {} } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
      MaterialProvider: {
        nodes: [
          { id: "m1", position: { x: 0, y: 0 }, data: { type: "Constant", fields: { Material: "stone" } } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
      "Props[0]": {
        nodes: [
          { id: "p1", position: { x: 0, y: 0 }, data: { type: "Mesh2D", fields: { Resolution: 12 }, _biomeField: "Positions" } },
          { id: "p2", position: { x: 0, y: 400 }, data: { type: "Constant", fields: {}, _biomeField: "Assignments" } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
      "Props[1]": {
        nodes: [
          { id: "p3", position: { x: 0, y: 0 }, data: { type: "FieldFunction", fields: {}, _biomeField: "Positions" } },
          { id: "p4", position: { x: 0, y: 400 }, data: { type: "Conditional", fields: {}, _biomeField: "Assignments" } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
    },
    activeBiomeSection: "Terrain",
  });
}

describe("BiomeDashboard", () => {
  it("renders null when no biomeConfig", () => {
    const { container } = render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders biome name input", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    const input = screen.getByLabelText("Biome name") as HTMLInputElement;
    expect(input.value).toBe("forest_hills");
  });

  it("renders tint gradient bar", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    expect(screen.getByText("Tint Gradient")).toBeTruthy();
  });

  it("renders environment badge", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    expect(screen.getByText("Default")).toBeTruthy();
  });

  it("renders section summary cards with node counts", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    expect(screen.getByText("Terrain")).toBeTruthy();
    expect(screen.getByText("Materials")).toBeTruthy();
  });

  it("renders prop summary table", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    expect(screen.getByText("Props Overview")).toBeTruthy();
    // "Mesh2D" may appear in both section cards and prop table
    expect(screen.getAllByText("Mesh2D").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FieldFunction").length).toBeGreaterThanOrEqual(1);
  });

  it("name edit calls onBiomeConfigChange", () => {
    setupBiomeState();
    let lastField = "";
    let lastValue: unknown = "";

    render(
      <BiomeDashboard
        onBiomeConfigChange={(f, v) => { lastField = f; lastValue = v; }}
       
        onBlur={noop}
      />,
    );

    const input = screen.getByLabelText("Biome name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "desert_oasis" } });
    expect(lastField).toBe("Name");
    expect(lastValue).toBe("desert_oasis");
  });

  it("clicking section card calls switchBiomeSection", () => {
    setupBiomeState();
    render(
      <BiomeDashboard onBiomeConfigChange={noop} onBlur={noop} />,
    );

    fireEvent.click(screen.getByText("Materials"));
    expect(useEditorStore.getState().activeBiomeSection).toBe("MaterialProvider");
  });
});
