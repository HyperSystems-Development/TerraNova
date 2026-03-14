import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { WeatherEditorView } from "../WeatherEditorView";

describe("WeatherEditorView", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useProjectStore.getState().reset();
  });

  it("renders only the editor view", () => {
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

    expect(screen.getByText("Scene Preview")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Graph Disabled" })).toBeNull();
    expect(screen.getByText("Quick Edit")).toBeTruthy();
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

    expect(screen.getByText("Scene Preview")).toBeTruthy();
  });
});
