import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocsPanel } from "../DocsPanel";

const clipboardWriteMock = vi.fn<() => Promise<void>>().mockResolvedValue();
const scrollIntoViewMock = vi.fn();
const curveCanvasMock = vi.fn(
  ({ docsCompact, points }: { docsCompact?: boolean; points?: unknown[] }) => (
    <div
      data-testid="curve-canvas"
      data-docs-compact={String(Boolean(docsCompact))}
      data-point-count={String(Array.isArray(points) ? points.length : 0)}
    />
  ),
);

vi.mock("@/components/docs/MermaidDiagram", () => ({
  MermaidDiagram: ({ code }: { code: string }) => <div data-testid="mermaid-diagram">{code}</div>,
}));

vi.mock("@/components/docs/DocNodeGraph", () => ({
  DocNodeGraph: () => <div data-testid="doc-nodegraph" />,
  parseNodeGraph: () => null,
}));

vi.mock("@/components/properties/CurveCanvas", () => ({
  CurveCanvas: (props: { docsCompact?: boolean; points?: unknown[] }) => curveCanvasMock(props),
}));

vi.mock("@/utils/autoLayout", () => ({
  autoLayout: vi.fn(async (nodes: unknown[]) => nodes),
}));

describe("DocsPanel", () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;

    Object.defineProperty(globalThis, "CSS", {
      configurable: true,
      value: {
        escape: (value: string) => value.replace(/["\\#.:]/g, "\\$&"),
      },
    });

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });

    Object.defineProperty(Element.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tn-docs-last-slug", "walkthroughs/sky-islands");
    scrollIntoViewMock.mockReset();
    clipboardWriteMock.mockClear();
    curveCanvasMock.mockClear();

    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteMock,
      },
    });
  });

  it("keeps same-document anchor clicks out of navigation history", async () => {
    render(<DocsPanel />);

    await screen.findByText("Walkthrough: Building a Sky Islands Biome from Scratch");

    const backButton = screen.getByTitle(/Back/) as HTMLButtonElement;
    expect(backButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole("link", { name: /Overview/i }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(backButton.disabled).toBe(true);
  });

  it("copies docs-relative heading links", async () => {
    render(<DocsPanel />);

    await screen.findByText("Walkthrough: Building a Sky Islands Biome from Scratch");

    fireEvent.click(screen.getAllByTitle("Copy link to heading")[0]);

    await waitFor(() => {
      expect(clipboardWriteMock).toHaveBeenCalledWith("/walkthroughs/sky-islands#table-of-contents");
    });
  });

  it("starts walkthrough mode at the first real step", async () => {
    render(<DocsPanel />);

    const startWalkthroughButton = await screen.findByRole("button", { name: "Start Walkthrough" });
    fireEvent.click(startWalkthroughButton);

    await screen.findByText("Step 0 — Overview: What We're Building");
    expect(screen.queryByText(/^Table of Contents$/)).toBeNull();
  });
  it("renders docs curve previews with docs-compact affordances", async () => {
    localStorage.setItem("tn-docs-last-slug", "reference/curves");

    render(<DocsPanel />);

    await screen.findByText("Curves Reference");

    const curveCanvases = await screen.findAllByTestId("curve-canvas");
    expect(curveCanvases.length).toBeGreaterThan(0);
    expect(curveCanvases[0].getAttribute("data-docs-compact")).toBe("true");
    expect(screen.getAllByText(/Input x/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Output y/i).length).toBeGreaterThan(0);
  });
});
