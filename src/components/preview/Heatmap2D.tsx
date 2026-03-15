import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { getColormap } from "@/utils/colormaps";
import { screenToWorld } from "@/utils/canvasTransform";
import { generateContours, getContourLevels } from "@/utils/contourLines";

export const Heatmap2D = memo(forwardRef<HTMLCanvasElement>(function Heatmap2D(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const values = usePreviewStore((s) => s.values);
  const resolution = usePreviewStore((s) => s.resolution);
  const minValue = usePreviewStore((s) => s.minValue);
  const maxValue = usePreviewStore((s) => s.maxValue);
  const p02Value = usePreviewStore((s) => s.p02Value);
  const p98Value = usePreviewStore((s) => s.p98Value);
  const rangeMin = usePreviewStore((s) => s.rangeMin);
  const rangeMax = usePreviewStore((s) => s.rangeMax);
  const colormap = usePreviewStore((s) => s.colormap);
  const canvasTransform = usePreviewStore((s) => s.canvasTransform);
  const setCanvasTransform = usePreviewStore((s) => s.setCanvasTransform);
  const showContours = usePreviewStore((s) => s.showContours);
  const contourInterval = usePreviewStore((s) => s.contourInterval);
  const showCrossSection = usePreviewStore((s) => s.showCrossSection);
  const crossSectionLine = usePreviewStore((s) => s.crossSectionLine);
  const setCrossSectionLine = usePreviewStore((s) => s.setCrossSectionLine);
  const showPositionOverlay = usePreviewStore((s) => s.showPositionOverlay);
  const positionOverlayPoints = usePreviewStore((s) => s.positionOverlayPoints);
  const positionOverlayColor = usePreviewStore((s) => s.positionOverlayColor);
  const positionOverlaySize = usePreviewStore((s) => s.positionOverlaySize);

  const showHillShade = usePreviewStore((s) => s.showHillShade);

  const [hoverInfo, setHoverInfo] = useState<{ x: number; z: number; value: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOX: number; startOY: number } | null>(null);
  const crossLineRef = useRef<{ startX: number; startZ: number } | null>(null);

  // Merge refs: internal + forwarded
  const setRefs = useCallback(
    (el: HTMLCanvasElement | null) => {
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    },
    [ref],
  );

  // ── Draw base heatmap (with optional hill-shading) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !values) return;

    const n = resolution;
    canvas.width = n;
    canvas.height = n;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cm = getColormap(colormap);
    const imageData = ctx.createImageData(n, n);
    // Use percentile-based range for outlier resistance
    const lo = p02Value ?? minValue;
    const hi = p98Value ?? maxValue;
    const isFlat = Math.abs(hi - lo) < 1e-8;
    const range = hi - lo || 1;

    // Pre-compute normalized height grid for hill-shading
    let normalized: Float32Array | null = null;
    if (showHillShade && !isFlat) {
      normalized = new Float32Array(values.length);
      for (let i = 0; i < values.length; i++) {
        normalized[i] = Math.max(0, Math.min(1, (values[i] - lo) / range));
      }
    }

    // Hill-shade light direction (NW sun, cartographic standard)
    const azimuth = 315 * Math.PI / 180;
    const altitude = 45 * Math.PI / 180;
    const lx = Math.cos(altitude) * Math.sin(azimuth);
    const ly = Math.sin(altitude);
    const lz = Math.cos(altitude) * Math.cos(azimuth);
    const reliefScale = 2.0;
    const ambient = 0.3;
    const diffuse = 0.7;

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const i = row * n + col;
        const norm = isFlat ? 0.5 : Math.max(0, Math.min(1, (values[i] - lo) / range));
        const [r, g, b] = cm.ramp(norm);
        const pixel = i * 4;

        if (normalized && showHillShade) {
          // Central differences with proper one-sided fallback at boundaries
          const colL = col > 0 ? col - 1 : col;
          const colR = col < n - 1 ? col + 1 : col;
          const rowU = row > 0 ? row - 1 : row;
          const rowD = row < n - 1 ? row + 1 : row;

          // Adjust divisor for edge cells (one-sided vs two-sided difference)
          const dxDiv = colR - colL || 1;
          const dzDiv = rowD - rowU || 1;

          const dx = (normalized[row * n + colR] - normalized[row * n + colL]) / dxDiv * reliefScale;
          const dz = (normalized[rowD * n + col] - normalized[rowU * n + col]) / dzDiv * reliefScale;

          // Surface normal from gradient: (-dx, 1, -dz) then normalize
          const nx = -dx;
          const ny = 1;
          const nz = -dz;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
          const nnx = nx / len;
          const nny = ny / len;
          const nnz = nz / len;

          // Lambertian shading
          const dot = nnx * lx + nny * ly + nnz * lz;
          const shade = ambient + diffuse * Math.max(0, dot);

          imageData.data[pixel] = Math.min(255, r * shade);
          imageData.data[pixel + 1] = Math.min(255, g * shade);
          imageData.data[pixel + 2] = Math.min(255, b * shade);
        } else {
          imageData.data[pixel] = r;
          imageData.data[pixel + 1] = g;
          imageData.data[pixel + 2] = b;
        }
        imageData.data[pixel + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [values, resolution, minValue, maxValue, p02Value, p98Value, colormap, showHillShade]);

  // ── Memoize contour data separately from drawing ──
  const contourData = useMemo(
    () => showContours && values ? generateContours(values, resolution, getContourLevels(minValue, maxValue, contourInterval)) : [],
    [values, resolution, showContours, contourInterval, minValue, maxValue],
  );

  // ── Shared overlay helpers ──
  const getOverlayContext = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const wrapperEl = overlay.parentElement;
    if (!wrapperEl) return null;
    const displaySize = wrapperEl.clientWidth;
    if (displaySize === 0) return null;
    return { overlay, displaySize };
  }, []);

  const makeGridToScreen = useCallback((displaySize: number, n: number, scale: number, offsetX: number, offsetY: number) => {
    const cx = displaySize / 2;
    const cy = displaySize / 2;
    return (gx: number, gz: number) => {
      const normX = gx / n;
      const normZ = gz / n;
      const sx = (normX * displaySize - cx) * scale + cx + offsetX;
      const sy = (normZ * displaySize - cy) * scale + cy + offsetY;
      return { sx, sy };
    };
  }, []);

  // ── Draw overlay (grid + contours + position dots + cross-section) ──
  useEffect(() => {
    const info = getOverlayContext();
    if (!info || !values) return;
    const { overlay, displaySize } = info;

    const dpr = window.devicePixelRatio || 1;
    overlay.width = displaySize * dpr;
    overlay.height = displaySize * dpr;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displaySize, displaySize);

    const n = resolution;
    const { scale, offsetX, offsetY } = canvasTransform;
    const gridToScreen = makeGridToScreen(displaySize, n, scale, offsetX, offsetY);

    // ── World-coordinate gridlines ──
    const worldRange = rangeMax - rangeMin;
    const pixelsPerBlock = (displaySize * scale) / worldRange;
    let gridSpacing = 8;
    if (pixelsPerBlock * 8 < 16) gridSpacing = 64;
    else if (pixelsPerBlock * 8 < 32) gridSpacing = 32;
    else if (pixelsPerBlock * 8 < 64) gridSpacing = 16;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;

    const gridStart = Math.ceil(rangeMin / gridSpacing) * gridSpacing;
    for (let w = gridStart; w <= rangeMax; w += gridSpacing) {
      const g = ((w - rangeMin) / worldRange) * n;
      const { sx } = gridToScreen(g, 0);
      const { sy: sy0 } = gridToScreen(0, 0);
      const { sy: sy1 } = gridToScreen(0, n);
      ctx.beginPath();
      ctx.moveTo(sx, sy0);
      ctx.lineTo(sx, sy1);
      ctx.stroke();

      const { sy } = gridToScreen(0, g);
      const { sx: sx0 } = gridToScreen(0, 0);
      const { sx: sx1 } = gridToScreen(n, 0);
      ctx.beginPath();
      ctx.moveTo(sx0, sy);
      ctx.lineTo(sx1, sy);
      ctx.stroke();
    }

    // ── Contour lines (uses pre-computed contourData) ──
    if (showContours && contourData.length > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.8;
      for (const contour of contourData) {
        for (const seg of contour.segments) {
          const p1 = gridToScreen(seg.x1, seg.z1);
          const p2 = gridToScreen(seg.x2, seg.z2);
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
      }
    }

    // ── Position overlay dots ──
    if (showPositionOverlay && positionOverlayPoints.length > 0) {
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

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(displaySize - 72, displaySize - 22, 68, 18);
      ctx.fillStyle = positionOverlayColor;
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${positionOverlayPoints.length} pts`, displaySize - 8, displaySize - 8);
      ctx.textAlign = "start";
    }

    // ── Cross-section line ──
    if (showCrossSection && crossSectionLine) {
      const worldToGrid = (wx: number, wz: number) => ({
        gx: ((wx - rangeMin) / worldRange) * n,
        gz: ((wz - rangeMin) / worldRange) * n,
      });
      const g1 = worldToGrid(crossSectionLine.start.x, crossSectionLine.start.z);
      const g2 = worldToGrid(crossSectionLine.end.x, crossSectionLine.end.z);
      const p1 = gridToScreen(g1.gx, g1.gz);
      const p2 = gridToScreen(g2.gx, g2.gz);

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(p1.sx, p1.sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p2.sx, p2.sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [values, resolution, canvasTransform, contourData, showContours, rangeMin, rangeMax, showCrossSection, crossSectionLine, showPositionOverlay, positionOverlayPoints, positionOverlayColor, positionOverlaySize, getOverlayContext, makeGridToScreen]);

  // ── Get display rect for interactions ──
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

      // Pan
      if (dragRef.current && !e.shiftKey) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setCanvasTransform({
          ...canvasTransform,
          offsetX: dragRef.current.startOX + dx,
          offsetY: dragRef.current.startOY + dy,
        });
        return;
      }

      // Cross-section drawing
      if (crossLineRef.current && e.shiftKey) {
        const world = screenToWorld(
          e.clientX - rect.left, e.clientY - rect.top,
          canvasTransform, rect.width, rangeMin, rangeMax,
        );
        setCrossSectionLine({
          start: { x: crossLineRef.current.startX, z: crossLineRef.current.startZ },
          end: { x: world.x, z: world.z },
        });
        return;
      }

      // Hover readout
      const world = screenToWorld(
        e.clientX - rect.left, e.clientY - rect.top,
        canvasTransform, rect.width, rangeMin, rangeMax,
      );

      const n = resolution;
      const worldRange = rangeMax - rangeMin;
      const col = Math.floor(((world.x - rangeMin) / worldRange) * n);
      const row = Math.floor(((world.z - rangeMin) / worldRange) * n);
      if (col < 0 || col >= n || row < 0 || row >= n) {
        setHoverInfo(null);
        return;
      }
      const idx = row * n + col;
      setHoverInfo({
        x: Math.round(world.x),
        z: Math.round(world.z),
        value: values[idx],
      });
    },
    [values, resolution, rangeMin, rangeMax, canvasTransform, setCanvasTransform, setCrossSectionLine, getInteractionRect],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = getInteractionRect();
      if (!rect) return;

      // Shift+click starts cross-section line
      if (e.shiftKey && showCrossSection) {
        const world = screenToWorld(
          e.clientX - rect.left, e.clientY - rect.top,
          canvasTransform, rect.width, rangeMin, rangeMax,
        );
        crossLineRef.current = { startX: world.x, startZ: world.z };
        return;
      }

      // Normal click starts pan — use document-level listeners so drag
      // releases correctly even when the cursor leaves the heatmap container
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOX: canvasTransform.offsetX,
        startOY: canvasTransform.offsetY,
      };

      const handleDocMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setCanvasTransform({
          ...canvasTransform,
          offsetX: dragRef.current.startOX + dx,
          offsetY: dragRef.current.startOY + dy,
        });
      };
      const handleDocMouseUp = () => {
        dragRef.current = null;
        crossLineRef.current = null;
        document.removeEventListener("mousemove", handleDocMouseMove);
        document.removeEventListener("mouseup", handleDocMouseUp);
      };
      document.addEventListener("mousemove", handleDocMouseMove);
      document.addEventListener("mouseup", handleDocMouseUp);
    },
    [canvasTransform, rangeMin, rangeMax, showCrossSection, getInteractionRect, setCanvasTransform],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    crossLineRef.current = null;
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

      // Zoom centered on cursor
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

  const onDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Shift+double-click clears cross-section
      if (e.shiftKey && showCrossSection) {
        setCrossSectionLine(null);
      }
    },
    [showCrossSection, setCrossSectionLine],
  );

  const onMouseLeave = useCallback(() => {
    setHoverInfo(null);
    dragRef.current = null;
    crossLineRef.current = null;
  }, []);

  const cm = getColormap(colormap);

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
        {/* Base heatmap canvas */}
        <canvas
          ref={setRefs}
          className="absolute inset-0 w-full h-full border border-tn-border"
          style={{
            imageRendering: "pixelated",
            transform: `translate(${canvasTransform.offsetX}px, ${canvasTransform.offsetY}px) scale(${canvasTransform.scale})`,
            transformOrigin: "center center",
          }}
        />
        {/* Overlay canvas for contours, grid, cross-section */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none" }}
        />
        {/* Interaction layer */}
        <div
          className="absolute inset-0"
          style={{ cursor: dragRef.current ? "grabbing" : "crosshair" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
        />
      </div>

      {/* Hover readout */}
      {hoverInfo && (
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-tn-panel/90 border border-tn-border rounded text-[10px] text-tn-text font-mono">
          x: {hoverInfo.x}, z: {hoverInfo.z} &rarr; {hoverInfo.value.toFixed(4)}
        </div>
      )}

      {/* Min/Max legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-0.5 text-[10px] text-tn-text-muted font-mono">
        <span>min: {minValue.toFixed(3)}</span>
        <span>max: {maxValue.toFixed(3)}</span>
      </div>

      {/* Color ramp legend bar */}
      <div className="absolute bottom-3 right-3 flex items-end gap-1">
        <span className="text-[9px] text-tn-text-muted font-mono">low</span>
        <div className="w-24 h-2 rounded-sm" style={{
          background: cm.cssGradient,
        }} />
        <span className="text-[9px] text-tn-text-muted font-mono">high</span>
      </div>

      {/* Zoom indicator */}
      {canvasTransform.scale !== 1 && (
        <div className="absolute top-3 left-3 px-1.5 py-0.5 bg-tn-panel/80 border border-tn-border rounded text-[9px] text-tn-text-muted font-mono">
          {canvasTransform.scale.toFixed(1)}x
        </div>
      )}
    </div>
  );
}));
