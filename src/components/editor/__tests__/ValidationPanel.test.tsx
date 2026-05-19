import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ValidationPanel } from "../ValidationPanel";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useEditorStore } from "@/stores/editorStore";

// Mock the stores
vi.mock("@/stores/diagnosticsStore");
vi.mock("@/stores/editorStore");
vi.mock("@/hooks/useTauriIO", () => ({
  useTauriIO: () => ({
    openFile: vi.fn(),
  }),
}));
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    fitView: vi.fn(),
  }),
}));

describe("ValidationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    vi.mocked(useDiagnosticsStore).mockImplementation((selector) => {
      const state = {
        diagnostics: [],
        assetValidationBadge: {
          label: "All assets validated",
          detail: "0 missing, 0 unknown",
        },
        assetPathIndexByKind: {},
      };
      return selector(state as any);
    });

    vi.mocked(useEditorStore).mockImplementation((selector) => {
      const state = {
        nodes: [],
        biomeConfig: null,
        biomeSections: null,
        setBiomeConfig: vi.fn(),
        setSelectedNodeId: vi.fn(),
        setEditingContext: vi.fn(),
        switchBiomeSection: vi.fn(),
        updateNodeField: vi.fn(),
        setNodes: vi.fn(),
        removeNode: vi.fn(),
        removeNodes: vi.fn(),
        commitState: vi.fn(),
      };
      return selector(state as any);
    });
  });

  it("renders no issues message when diagnostics are empty", () => {
    render(<ValidationPanel />);
    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });

  it("renders asset validation badge", () => {
    render(<ValidationPanel />);
    expect(screen.getByText("All assets validated")).toBeInTheDocument();
  });

  it("renders diagnostic items when present", () => {
    vi.mocked(useDiagnosticsStore).mockImplementation((selector) => {
      const state = {
        diagnostics: [
          {
            code: "test-error",
            severity: "error",
            message: "Test error message",
            nodeId: "node-1",
            field: "TestField",
          },
        ],
        assetValidationBadge: {
          label: "Some issues",
          detail: "1 error",
        },
        assetPathIndexByKind: {},
      };
      return selector(state as any);
    });

    render(<ValidationPanel />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getAllByText("1 error")).toHaveLength(2);
  });

  it("has aria-live region for dynamic content", () => {
    render(<ValidationPanel />);
    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveAttribute("aria-live", "polite");
  });

  it("diagnostic items have proper ARIA labels when clickable", () => {
    vi.mocked(useDiagnosticsStore).mockImplementation((selector) => {
      const state = {
        diagnostics: [
          {
            code: "test-error",
            severity: "error",
            message: "Test error message",
            nodeId: "node-1",
            field: "TestField",
          },
        ],
        assetValidationBadge: {
          label: "Some issues",
          detail: "1 error",
        },
        assetPathIndexByKind: {},
      };
      return selector(state as any);
    });

    render(<ValidationPanel />);
    const diagnosticItem = screen.getByRole("button");
    expect(diagnosticItem).toHaveAttribute("aria-label", expect.stringContaining("click to navigate to node"));
  });

  it("severity icons are hidden from screen readers", () => {
    vi.mocked(useDiagnosticsStore).mockImplementation((selector) => {
      const state = {
        diagnostics: [
          {
            code: "test-error",
            severity: "error",
            message: "Test error message",
            nodeId: "node-1",
            field: "TestField",
          },
        ],
        assetValidationBadge: {
          label: "Some issues",
          detail: "1 error",
        },
        assetPathIndexByKind: {},
      };
      return selector(state as any);
    });

    render(<ValidationPanel />);
    const icons = screen.getAllByText("✖");
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});
