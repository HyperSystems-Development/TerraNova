import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { screenToWorld } from "@/utils/canvasTransform";
import { generateContours } from "@/utils/contourLines";

const SOLID_COLOR = { r: 120, g: 180, b: 100 };
const AIR_COLOR = { r: 20, g: 20, b: 30 };

export const ThresholdedHeatmap = forwardRef<HTMLCanvasElement>(function ThresholdedHeatmap(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const values = usePreviewStore((s) => s.values);
  const rangeMin = usePreviewStore((s) => s.rangeMin);
  const rangeMax = usePreviewStore((s) => s.rangeMax);
  const canvasTransform = usePreviewStore((s) => s.canvasTransform);
  const setCanvasTransform = usePreviewStore((s) => s.setCanvasTransform);
  const showPositionOverlay = usePreviewStore((s) => s.showPositionOverlay);
  const positionOverlayPoints = usePreviewStore((s) => s.positionOverlayPoints);
  const positionOverlayColor = usePreviewStore((s) => s.positionOverlayColor);
  const positionOverlaySize = usePreviewStore((s) => s.positionOverlaySize);

  const [hoverInfo, setHoverInfo] = useState<{ x: number; z: number; value: number; solid: boolean } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOX: number; startOY: number } | null>(null);

  // Merge refs
  const setRefs = useCallback(
    (el: HTMLCanvasElement | null) => {
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    },
    [ref],
  );

  // ── Draw thresholded heatmap ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !values) return;

    const n = Math.round(Math.sqrt(values.length));
    canvas.width = n;
    canvas.height = n;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(n, n);

    for (let i = 0; i < values.length; i++) {
      const isSolid = values[i] >= 0;
      const c = isSolid ? SOLID_COLOR : AIR_COLOR;
      const pixel = i * 4;
      imageData.data[pixel] = c.r;
      imageData.data[pixel + 1] = c.g;
      imageData.data[pixel + 2] = c.b;
      imageData.data[pixel + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [values]);

  // ── Draw overlay: surface contour at density=0 ──
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !values) return;

    const wrapperEl = overlay.parentElement;
    if (!wrapperEl) return;
    const displaySize = wrapperEl.clientWidth;
    if (displaySize === 0) return;

    const dpr = window.devicePixelRatio || 1;
    overlay.width = displaySize * dpr;
    overlay.height = displaySize * dpr;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displaySize, displaySize);

    const n = Math.round(Math.sqrt(values.length));
    const { scale, offsetX, offsetY } = canvasTransform;

    const gridToScreen = (gx: number, gz: number) => {
      const cx = displaySize / 2;
      const cy = displaySize / 2;
      const normX = gx / n;
      const normZ = gz / n;
      const sx = (normX * displaySize - cx) * scale + cx + offsetX;
      const sy = (normZ * displaySize - cy) * scale + cy + offsetY;
      return { sx, sy };
    };

    // Draw surface contour at density=0
    const contours = generateContours(values, n, [0]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    for (const contour of contours) {
      for (const seg of contour.segments) {
        const p1 = gridToScreen(seg.x1, seg.z1);
        const p2 = gridToScreen(seg.x2, seg.z2);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
    }

    // ── Position overlay dots ──
    if (showPositionOverlay && positionOverlayPoints.length > 0) {
      const worldRange = rangeMax - rangeMin;
      ctx.fillStyle = positionOverlayColor;

      for (const pt of positionOverlayPoints) {
        const gx = ((pt.x - rangeMin) / worldRange) * n;
        const gz = ((pt.z - rangeMin) / worldRange) * n;
        const { sx, sy } = gridToScreen(gx, gz);

        ctx.globalAlpha = 0.3 + 0.7 * pt.weight;
        ctx.beginPath();
        ctx.arc(sx, sy, positionOverlaySize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Position count badge
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(displaySize - 72, displaySize - 22, 68, 18);
      ctx.fillStyle = positionOverlayColor;
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${positionOverlayPoints.length} pts`, displaySize - 8, displaySize - 8);
      ctx.textAlign = "start";
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [values, canvasTransform, rangeMin, rangeMax, showPositionOverlay, positionOverlayPoints, positionOverlayColor, positionOverlaySize]);

  // ── Interaction rect ──
  const getInteractionRect = useCallback((): DOMRect | null => {
    const overlay = overlayRef.current;
    return overlay?.parentElement?.getBoundingClientRect() ?? null;
  }, []);

  // ── Mouse interactions ──
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!values) return;
      const rect = getInteractionRect();
      if (!rect) return;

      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setCanvasTransform({
          ...canvasTransform,
          offsetX: dragRef.current.startOX + dx,
          offsetY: dragRef.current.startOY + dy,
        });
        return;
      }

      const world = screenToWorld(
        e.clientX - rect.left, e.clientY - rect.top,
        canvasTransform, rect.width, rangeMin, rangeMax,
      );
      const n = Math.round(Math.sqrt(values.length));
      const worldRange = rangeMax - rangeMin;
      const col = Math.floor(((world.x - rangeMin) / worldRange) * n);
      const row = Math.floor(((world.z - rangeMin) / worldRange) * n);
      if (col < 0 || col >= n || row < 0 || row >= n) {
        setHoverInfo(null);
        return;
      }
      const idx = row * n + col;
      const val = values[idx];
      if (val === undefined) { setHoverInfo(null); return; }
      setHoverInfo({
        x: Math.round(world.x),
        z: Math.round(world.z),
        value: val,
        solid: val >= 0,
      });
    },
    [values, rangeMin, rangeMax, canvasTransform, setCanvasTransform, getInteractionRect],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOX: canvasTransform.offsetX,
        startOY: canvasTransform.offsetY,
      };
    },
    [canvasTransform],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = getInteractionRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.max(0.5, Math.min(10, canvasTransform.scale * factor));

      const ox = mouseX - cx - canvasTransform.offsetX;
      const oy = mouseY - cy - canvasTransform.offsetY;
      const ratio = newScale / canvasTransform.scale;

      setCanvasTransform({
        scale: newScale,
        offsetX: canvasTransform.offsetX - (ox * (ratio - 1)),
        offsetY: canvasTransform.offsetY - (oy * (ratio - 1)),
      });
    },
    [canvasTransform, setCanvasTransform, getInteractionRect],
  );

  const onMouseLeave = useCallback(() => {
    setHoverInfo(null);
    dragRef.current = null;
  }, []);

  if (!values) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-tn-text-muted">
        No preview data
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
      <div className="relative" style={{ aspectRatio: "1 / 1", maxWidth: "100%", maxHeight: "100%", height: "100%" }}>
        <canvas
          ref={setRefs}
          className="absolute inset-0 w-full h-full border border-tn-border"
          style={{
            imageRendering: "pixelated",
            transform: `translate(${canvasTransform.offsetX}px, ${canvasTransform.offsetY}px) scale(${canvasTransform.scale})`,
            transformOrigin: "center center",
          }}
        />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        />
        <div
          className="absolute inset-0"
          style={{ cursor: dragRef.current ? "grabbing" : "crosshair" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
        />
      </div>

      {/* Hover readout */}
      {hoverInfo && (
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-tn-panel/90 border border-tn-border rounded text-[10px] text-tn-text font-mono">
          x: {hoverInfo.x}, z: {hoverInfo.z} &rarr; {hoverInfo.value.toFixed(4)} ({hoverInfo.solid ? "solid" : "air"})
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 text-[10px] text-tn-text-muted font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: `rgb(${SOLID_COLOR.r},${SOLID_COLOR.g},${SOLID_COLOR.b})` }} />
          <span>Solid (d &ge; 0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: `rgb(${AIR_COLOR.r},${AIR_COLOR.g},${AIR_COLOR.b})` }} />
          <span>Air (d &lt; 0)</span>
        </div>
      </div>

      {/* Zoom indicator */}
      {canvasTransform.scale !== 1 && (
        <div className="absolute top-3 left-3 px-1.5 py-0.5 bg-tn-panel/80 border border-tn-border rounded text-[9px] text-tn-text-muted font-mono">
          {canvasTransform.scale.toFixed(1)}x
        </div>
      )}
    </div>
  );
});
