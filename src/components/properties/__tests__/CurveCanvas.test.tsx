import { describe, it, expect, beforeAll } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { CurveCanvas } from "../CurveCanvas";

beforeAll(() => {
  // jsdom lacks ResizeObserver — provide a minimal stub
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("CurveCanvas", () => {
  it("renders without crashing with empty points", () => {
    const { container } = render(<CurveCanvas points={[]} />);
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("renders with sample points", () => {
    const points = [[0, 0], [0.5, 0.5], [1, 1]];
    const { container } = render(
      <CurveCanvas points={points} onChange={() => {}} onCommit={() => {}} />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("renders in evaluator mode", () => {
    const evaluator = (x: number) => x * x;
    const { container } = render(
      <CurveCanvas evaluator={evaluator} label="Preview (read-only)" />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("shows interactive label when onChange is provided", () => {
    const { container } = render(
      <CurveCanvas
        points={[[0, 0], [1, 1]]}
        label="Points (2)"
        onChange={() => {}}
        onCommit={() => {}}
      />,
    );
    expect(container.textContent).toContain("Points (2)");
  });

  it("shows help text in interactive mode", () => {
    const { container } = render(
      <CurveCanvas points={[]} onChange={() => {}} onCommit={() => {}} />,
    );
    expect(container.textContent).toContain("Double-click to add");
    expect(container.textContent).toContain("Shift = snap");
  });

  it("shows preset buttons in interactive mode", () => {
    const { container } = render(
      <CurveCanvas points={[]} onChange={() => {}} onCommit={() => {}} />,
    );
    expect(container.textContent).toContain("Presets:");
    expect(container.textContent).toContain("Linear");
    expect(container.textContent).toContain("Ease In");
    expect(container.textContent).toContain("S-Curve");
  });

  it("renders in compact mode with minimal DOM", () => {
    const { container } = render(
      <CurveCanvas points={[[0, 0], [0.5, 0.5], [1, 1]]} compact />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    // Compact mode should NOT show help text, presets, or labels
    expect(container.textContent).not.toContain("Double-click");
    expect(container.textContent).not.toContain("Presets:");
  });

  it("compact mode has correct height", () => {
    const { container } = render(
      <CurveCanvas evaluator={(x) => x} compact />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe("40px");
  });

  it("compact mode can use a larger preview height", () => {
    const { container } = render(
      <CurveCanvas evaluator={(x) => x} compact compactHeight={72} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe("72px");
  });

  it("supports the docs compact variant", () => {
    const { container } = render(
      <CurveCanvas points={[[0, 0], [0.5, 0.75], [1, 0.2]]} compact compactHeight={112} compactVariant="docs" />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe("112px");
    expect(container.querySelector("canvas")).toBeTruthy();
  });

  describe("static bounds behavior", () => {
    it("computes bounds from initial wide-range points in interactive mode", () => {
      // Points span In: -80 to 5, Out: 0 to 2 — bounds should extend beyond [0,1]
      const points = [[-80, 0], [-40, 1], [0, 1.5], [5, 2]];
      const { container } = render(
        <CurveCanvas points={points} onChange={() => {}} onCommit={() => {}} />,
      );
      // Bounds inputs should exist and reflect wide-range values (not [0,1])
      const inputs = container.querySelectorAll<HTMLInputElement>("input[type='number']");
      expect(inputs.length).toBe(4); // xMin, xMax, yMin, yMax
      const xMin = inputs[0].value;
      const xMax = inputs[1].value;
      // xMin should be less than -80 (with padding), xMax greater than 5
      expect(Number(xMin)).toBeLessThan(-80);
      expect(Number(xMax)).toBeGreaterThan(5);
    });

    it("does NOT recompute bounds when points change via rerender", () => {
      const points1 = [[-80, 0], [5, 2]];
      const { container, rerender } = render(
        <CurveCanvas points={points1} onChange={() => {}} onCommit={() => {}} />,
      );

      // Capture initial bounds
      const inputs = container.querySelectorAll<HTMLInputElement>("input[type='number']");
      const initialXMin = inputs[0].value;
      const initialXMax = inputs[1].value;

      // Rerender with different points — bounds should stay the same
      const points2 = [[-100, 0], [50, 5]];
      rerender(
        <CurveCanvas points={points2} onChange={() => {}} onCommit={() => {}} />,
      );

      const updatedInputs = container.querySelectorAll<HTMLInputElement>("input[type='number']");
      expect(updatedInputs[0].value).toBe(initialXMin);
      expect(updatedInputs[1].value).toBe(initialXMax);
    });

    it("compact mode still auto-fits on point change", () => {
      const points1 = [[0, 0], [1, 1]];
      const { container, rerender } = render(
        <CurveCanvas points={points1} compact />,
      );

      // Compact mode should render canvas without bounds inputs
      const inputs = container.querySelectorAll<HTMLInputElement>("input[type='number']");
      expect(inputs.length).toBe(0);

      // Rerender with wider points — should NOT crash (auto-fits internally)
      const points2 = [[-80, 0], [5, 2]];
      rerender(<CurveCanvas points={points2} compact />);
      expect(container.querySelector("canvas")).toBeTruthy();
    });

    it("preset application resets bounds to [0,1]", () => {
      // Start with wide-range points
      const points = [[-80, 0], [5, 2]];
      let lastChange: [number, number][] | null = null;
      const { container } = render(
        <CurveCanvas
          points={points}
          onChange={(pts) => { lastChange = pts; }}
          onCommit={() => {}}
        />,
      );

      // Click the "Linear" preset button
      const buttons = container.querySelectorAll("button");
      const linearBtn = Array.from(buttons).find((b) => b.textContent === "Linear");
      expect(linearBtn).toBeTruthy();
      fireEvent.click(linearBtn!);

      // onChange should have been called with preset data
      expect(lastChange).not.toBeNull();

      // Bounds inputs should now show [0,1] range
      const inputs = container.querySelectorAll<HTMLInputElement>("input[type='number']");
      expect(Number(inputs[0].value)).toBe(0);   // xMin
      expect(Number(inputs[1].value)).toBe(1);   // xMax
      expect(Number(inputs[2].value)).toBe(0);   // yMin
      expect(Number(inputs[3].value)).toBe(1);   // yMax
    });
  });
});
