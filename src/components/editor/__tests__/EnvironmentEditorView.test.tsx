import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { EnvironmentEditorView } from "../EnvironmentEditorView";

const { openFileMock, listDirectoryMock, writeAssetFileMock } = vi.hoisted(() => ({
  openFileMock: vi.fn(),
  listDirectoryMock: vi.fn(),
  writeAssetFileMock: vi.fn(),
}));

vi.mock("@/hooks/useTauriIO", () => ({
  useTauriIO: () => ({
    openFile: openFileMock,
  }),
}));

vi.mock("@/utils/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/utils/ipc")>("@/utils/ipc");
  return {
    ...actual,
    listDirectory: listDirectoryMock,
    writeAssetFile: writeAssetFileMock,
  };
});

vi.mock("../AssetGraphCanvasBridge", () => ({
  AssetGraphCanvasBridge: () => <div data-testid="asset-graph-canvas" />,
}));

describe("EnvironmentEditorView", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useProjectStore.getState().reset();
    openFileMock.mockReset();
    listDirectoryMock.mockReset();
    writeAssetFileMock.mockReset();
    listDirectoryMock.mockResolvedValue([
      {
        name: "Zone1_Sunny.json",
        path: "C:\\Pack\\Server\\Weathers\\Zone1\\Zone1_Sunny.json",
        is_dir: false,
      },
    ]);
  });

  it("filters forecast cards by selected scope", async () => {
    useEditorStore.setState({
      rawJsonContent: {
        Parent: "Env_Zone1",
        WeatherForecasts: Object.fromEntries(
          Array.from({ length: 24 }, (_, hour) => [
            String(hour),
            [{ WeatherId: "Zone1_Sunny", Weight: hour + 1 }],
          ]),
        ),
      },
    });
    useProjectStore.setState({
      currentFile: "C:\\Pack\\Server\\Environments\\Zone1\\Env_Zone1.json",
      projectPath: "C:\\Pack",
    });

    render(<EnvironmentEditorView />);

    await waitFor(() => {
      expect(listDirectoryMock).toHaveBeenCalled();
    });

    expect(screen.getAllByRole("button", { name: "Add Weather" })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "all" } });
    expect(screen.getAllByRole("button", { name: "Add Weather" })).toHaveLength(24);

    fireEvent.click(screen.getAllByRole("button", { name: /Morning/i })[1]);
    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "daypart" } });
    expect(screen.getAllByRole("button", { name: "Add Weather" })).toHaveLength(4);
  });
});
