import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { sampleAllEdgePaths } from "@/utils/graphGeometry";
import { polylinesIntersect, type Point } from "@/utils/lineIntersection";

interface UseKnifeToolOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface KnifeOverlayProps {
  active: boolean;
  points: Point[];
}

export function useKnifeTool({ containerRef }: UseKnifeToolOptions) {
  const [knifeActive, setKnifeActive] = useState(false);
  const [cutEdgeIds, setCutEdgeIds] = useState<Set<string>>(new Set());
  const [overlayPoints, setOverlayPoints] = useState<Point[]>([]);
  const reactFlowInstance = useReactFlow();

  // Suppress native context menu when knife modifier keys are held (Ctrl+Shift)
  // Tauri/WebView interprets Ctrl+Shift+click as a context menu trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const suppress = (e: MouseEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
      }
    };
    el.addEventListener("contextmenu", suppress, { capture: true });
    return () => el.removeEventListener("contextmenu", suppress, { capture: true });
  }, [containerRef]);

  // Refs for drag state (avoid re-renders during rapid mouse moves)
  const knifeScreenPointsRef = useRef<Point[]>([]);
  const knifeFlowPointsRef = useRef<Point[]>([]);
  const cachedEdgePathsRef = useRef<Map<string, Point[]>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const testIntersections = useCallback(() => {
    const knifeLine = knifeFlowPointsRef.current;
    if (knifeLine.length < 2) return;

    const intersected = new Set<string>();
    for (const [edgeId, edgePath] of cachedEdgePathsRef.current) {
      if (polylinesIntersect(knifeLine, edgePath)) {
        intersected.add(edgeId);
      }
    }
    setCutEdgeIds(intersected);
  }, []);

  // Use capture phase so we intercept before ReactFlow starts marquee/pan
  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      // Activate on LMB + (Ctrl or Meta) + Shift
      if (
        e.button !== 0 ||
        !(e.ctrlKey || e.metaKey) ||
        !e.shiftKey
      ) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      // Also stop native propagation to prevent ReactFlow from seeing it
      e.nativeEvent.stopImmediatePropagation();

      // Cache edge paths in flow-space at drag start
      const container = containerRef.current;
      if (container) {
        cachedEdgePathsRef.current = sampleAllEdgePaths(container);
      }

      // Convert screen position to flow-space
      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const flowPt = reactFlowInstance.screenToFlowPosition(screenPt);

      knifeScreenPointsRef.current = [screenPt];
      knifeFlowPointsRef.current = [flowPt];
      activeRef.current = true;
      pointerIdRef.current = e.pointerId;
      setKnifeActive(true);
      setOverlayPoints([screenPt]);
      setCutEdgeIds(new Set());

      // Capture pointer on the container so events are consistently delivered
      containerRef.current?.setPointerCapture(e.pointerId);
    },
    [containerRef, reactFlowInstance],
  );

  const handlePointerMoveCapture = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;

      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();

      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const flowPt = reactFlowInstance.screenToFlowPosition(screenPt);

      knifeScreenPointsRef.current.push(screenPt);
      knifeFlowPointsRef.current.push(flowPt);
      setOverlayPoints([...knifeScreenPointsRef.current]);

      // Throttle intersection testing to animation frames
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          testIntersections();
        });
      }
    },
    [testIntersections, reactFlowInstance],
  );

  const handlePointerUpCapture = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;

      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();

      activeRef.current = false;

      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Final intersection test with all points
      const knifeLine = knifeFlowPointsRef.current;
      const finalCut = new Set<string>();
      if (knifeLine.length >= 2) {
        for (const [edgeId, edgePath] of cachedEdgePathsRef.current) {
          if (polylinesIntersect(knifeLine, edgePath)) {
            finalCut.add(edgeId);
          }
        }
      }

      // Delete intersected edges in a single history transaction
      if (finalCut.size > 0) {
        const ids = Array.from(finalCut);
        const label = ids.length === 1 ? "Cut edge" : `Cut ${ids.length} edges`;
        useEditorStore.getState().removeEdges(ids, label);
      }

      // Reset state
      setKnifeActive(false);
      setCutEdgeIds(new Set());
      setOverlayPoints([]);
      knifeScreenPointsRef.current = [];
      knifeFlowPointsRef.current = [];
      cachedEdgePathsRef.current.clear();

      // Release pointer capture
      if (pointerIdRef.current !== null) {
        try {
          containerRef.current?.releasePointerCapture(pointerIdRef.current);
        } catch {
          // pointer capture may already be released
        }
        pointerIdRef.current = null;
      }
    },
    [containerRef],
  );

  return {
    knifeActive,
    cutEdgeIds,
    overlayProps: { active: knifeActive, points: overlayPoints } as KnifeOverlayProps,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
  };
}
