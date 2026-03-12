import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("keeps graph mode disabled and stays in the editor view", () => {
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
    const disabledGraphButtons = screen.getAllByRole("button", { name: "Graph Disabled" });
    expect(disabledGraphButtons).toHaveLength(1);
    disabledGraphButtons.forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));

    fireEvent.click(disabledGraphButtons[0]);
    expect(screen.getByText("24h Atmosphere Strip")).toBeTruthy();
    expect(screen.queryByTestId("asset-graph-canvas")).toBeNull();
  });

  it("can transition from no file to a loaded weather document without changing hook order", async () => {
    useProjectStore.setState({
      currentFile: "C:\\Pack\\Server\\Weathers\\Zone1\\Zone1_Sunny.json",
    });

    render(<WeatherEditorView />);

    expect(screen.getByText("No weather file loaded.")).toBeTruthy();

    await act(async () => {
      useEditorStore.setState({
        rawJsonContent: {
          SkyTopColors: [{ Hour: 12, Color: "#224466" }],
          SkyBottomColors: [{ Hour: 12, Color: "#112233" }],
          FogColors: [{ Hour: 12, Color: "#334455" }],
          SunColors: [{ Hour: 12, Color: "#fbbf24" }],
        },
      });
    });

    expect(screen.getByText("24h Atmosphere Strip")).toBeTruthy();
  });
});
