import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StatusBar } from "../StatusBar";
import { useProjectStore } from "@/stores/projectStore";
import { useBridgeStore } from "@/stores/bridgeStore";
import { usePreviewStore } from "@/stores/previewStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";

// Mock the stores
vi.mock("@/stores/projectStore");
vi.mock("@/stores/bridgeStore");
vi.mock("@/stores/previewStore");
vi.mock("@/stores/uiStore");
vi.mock("@/stores/settingsStore");
vi.mock("@xyflow/react");

describe("StatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      const state = {
        currentFile: "/test/file.json",
        isDirty: false,
        projectPath: "/test",
        lastError: null,
      };
      return selector(state as any);
    });

    vi.mocked(useBridgeStore).mockImplementation((selector) => {
      const state = {
        connected: true,
        connecting: false,
      };
      return selector(state as any);
    });

    vi.mocked(usePreviewStore).mockImplementation((selector) => {
      const state = {
        viewMode: "graph",
      };
      return selector(state as any);
    });

    vi.mocked(useUIStore).mockImplementation((selector) => {
      const state = {
        showGrid: true,
        snapToGrid: false,
      };
      return selector(state as any);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        instantSaveEnabled: true,
      };
      return selector(state as any);
    });
  });

  it("renders file path when file is open", () => {
    render(<StatusBar />);
    expect(screen.getByText(/file\.json/)).toBeInTheDocument();
  });

  it("renders error message when lastError is present", () => {
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      const state = {
        currentFile: "/test/file.json",
        isDirty: false,
        projectPath: "/test",
        lastError: "Test error message",
      };
      return selector(state as any);
    });
    render(<StatusBar />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("renders grid and snap buttons in graph view", () => {
    render(<StatusBar />);
    expect(screen.getByRole("button", { name: /toggle grid/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /toggle snap/i })).toBeInTheDocument();
  });

  it("does not render grid/snap buttons in non-graph view", () => {
    vi.mocked(usePreviewStore).mockImplementation((selector) => {
      const state = {
        viewMode: "preview",
      };
      return selector(state as any);
    });
    render(<StatusBar />);
    expect(screen.queryByRole("button", { name: /toggle grid/i })).not.toBeInTheDocument();
  });

  it("shows bridge connection status", () => {
    render(<StatusBar />);
    const bridgeButton = screen.getByRole("button", { name: /bridge connected/i });
    expect(bridgeButton).toBeInTheDocument();
  });

  it("shows instant save status", () => {
    render(<StatusBar />);
    const instantButton = screen.getByRole("button", { name: /instant save enabled/i });
    expect(instantButton).toBeInTheDocument();
  });

  it("shows saved status when not dirty", () => {
    render(<StatusBar />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows unsaved status when dirty", () => {
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      const state = {
        currentFile: "/test/file.json",
        isDirty: true,
        projectPath: "/test",
        lastError: null,
      };
      return selector(state as any);
    });
    render(<StatusBar />);
    expect(screen.getByText("Unsaved")).toBeInTheDocument();
  });

  it("has proper ARIA labels for accessibility", () => {
    render(<StatusBar />);
    const gridButton = screen.getByRole("button", { name: /toggle grid on/i });
    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    
    const snapButton = screen.getByRole("button", { name: /toggle snap to grid off/i });
    expect(snapButton).toHaveAttribute("aria-pressed", "false");
  });
});
