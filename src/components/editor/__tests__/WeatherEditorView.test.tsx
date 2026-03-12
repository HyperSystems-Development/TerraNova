import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { WeatherEditorView } from "../WeatherEditorView";

vi.mock("../AssetGraphCanvasBridge", () => ({
  AssetGraphCanvasBridge: () => <div data-testid="asset-graph-canvas" />,
}));

describe("WeatherEditorView", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useProjectStore.getState().reset();
  });

  it("switches between editor and graph modes", () => {
    useEditorStore.setState({
      rawJsonContent: {
        SkyTopColors: [{ Hour: 12, Color: "#224466" }],
        SkyBottomColors: [{ Hour: 12, Color: "#112233" }],
        FogColors: [{ Hour: 12, Color: "#334455" }],
        SunColors: [{ Hour: 12, Color: "#fbbf24" }],
      },
    });
    useProjectStore.setState({
      currentFile: "C:\\Pack\\Server\\Weathers\\Zone1\\Zone1_Sunny.json",
    });

    render(<WeatherEditorView />);

    expect(screen.getByText("24h Atmosphere Strip")).toBeTruthy();
    expect(screen.queryByTestId("asset-graph-canvas")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));

    expect(screen.getByTestId("asset-graph-canvas")).toBeTruthy();
    expect(screen.getByText("Weather Graph")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Editor" }));

    expect(screen.getByText("24h Atmosphere Strip")).toBeTruthy();
    expect(screen.queryByTestId("asset-graph-canvas")).toBeNull();
  });
});
