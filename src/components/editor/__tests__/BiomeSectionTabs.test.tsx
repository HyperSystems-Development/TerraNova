import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { BiomeSectionTabs } from "../BiomeSectionTabs";

beforeEach(() => {
  useEditorStore.getState().reset();
});

function setupBiomeSections() {
  useEditorStore.setState({
    biomeSections: {
      Terrain: {
        nodes: [
          { id: "t1", position: { x: 0, y: 0 }, data: { type: "Clamp", fields: {} } },
          { id: "t2", position: { x: 100, y: 0 }, data: { type: "SimplexNoise2D", fields: {} } },
        ],
        edges: [{ id: "t1-t2", source: "t2", target: "t1" }],
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
          { id: "p1", position: { x: 0, y: 0 }, data: { type: "Mesh2D", fields: {}, _biomeField: "Positions" } },
          { id: "p2", position: { x: 0, y: 400 }, data: { type: "Constant", fields: {}, _biomeField: "Assignments" } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
    },
    activeBiomeSection: "Terrain",
  });
}

function setupBiomeSectionsWithDisabledGraphTabs() {
  useEditorStore.setState({
    biomeSections: {
      Terrain: {
        nodes: [
          { id: "t1", position: { x: 0, y: 0 }, data: { type: "Clamp", fields: {} } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
      EnvironmentProvider: {
        nodes: [
          { id: "e1", position: { x: 0, y: 0 }, data: { type: "Constant", fields: { Environment: "Env_Zone1" } } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
      TintProvider: {
        nodes: [
          { id: "tp1", position: { x: 0, y: 0 }, data: { type: "Constant", fields: { Color: "#5b9e28" } } },
        ],
        edges: [],
        history: [], historyIndex: -1,
      },
    },
    activeBiomeSection: "EnvironmentProvider",
  });
}

describe("BiomeSectionTabs", () => {
  it("renders null when no biomeSections", () => {
    const { container } = render(<BiomeSectionTabs />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correct number of tabs", () => {
    setupBiomeSections();
    render(<BiomeSectionTabs />);

    expect(screen.getByText("Terrain")).toBeTruthy();
    expect(screen.getByText("Materials")).toBeTruthy();
    expect(screen.getByText("Prop 0")).toBeTruthy();
  });

  it("shows node count badges", () => {
    setupBiomeSections();
    render(<BiomeSectionTabs />);

    // Terrain has 2 nodes, MaterialProvider has 1, Props[0] has 2
    expect(screen.getAllByText("2")).toHaveLength(2); // Terrain + Props[0]
    expect(screen.getByText("1")).toBeTruthy();       // MaterialProvider
  });

  it("applies active styling to current section", () => {
    setupBiomeSections();
    render(<BiomeSectionTabs />);

    const terrainBtn = screen.getByText("Terrain").closest("button")!;
    expect(terrainBtn.className).toContain("text-white");
    expect(terrainBtn.className).toContain("border-b-2");
  });

  it("clicking tab calls switchBiomeSection", () => {
    setupBiomeSections();
    render(<BiomeSectionTabs />);

    fireEvent.click(screen.getByText("Materials"));
    expect(useEditorStore.getState().activeBiomeSection).toBe("MaterialProvider");
  });

  it("tab has tooltip with root type chain", () => {
    setupBiomeSections();
    render(<BiomeSectionTabs />);

    const terrainBtn = screen.getByText("Terrain").closest("button")!;
    expect(terrainBtn.title).toContain("Clamp");
  });

  it("hides environment and tint graph tabs and falls back to a visible section", () => {
    setupBiomeSectionsWithDisabledGraphTabs();
    render(<BiomeSectionTabs />);

    expect(screen.queryByText("Atmosphere")).toBeNull();
    expect(screen.queryByText("Tint")).toBeNull();
    expect(useEditorStore.getState().activeBiomeSection).toBe("Terrain");
  });
});
