import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,

  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore } from "@/stores/previewStore";
import { useProjectStore } from "@/stores/projectStore";
import { useDragStore } from "@/stores/dragStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { autoLayout } from "@/utils/autoLayout";
import { nodeTypes } from "@/nodes";
import { CATEGORY_COLORS, AssetCategory } from "@/schema/types";
import { NodeSearchDialog } from "./NodeSearchDialog";
import { QuickAddDialog, type PendingConnection } from "./QuickAddDialog";
import { RootDock } from "./RootDock";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { NodeContextMenu } from "./NodeContextMenu";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { MIN_ZOOM, MAX_ZOOM } from "@/constants";
import { useConnectionValidation } from "@/hooks/useConnectionValidation";
import { useKnifeTool } from "@/hooks/useKnifeTool";
import { useNodeInterjection } from "@/hooks/useNodeInterjection";
import { KnifeOverlay } from "./KnifeOverlay";
import {
  getUpstreamEdgeIds,
  getBidirectionalEdgeIds,
} from "@/utils/graphGeometry";
import { findHandleDef } from "@/nodes/handleRegistry";

/** Map node type prefix to category for minimap coloring */
const PREFIX_TO_CATEGORY: Record<string, AssetCategory> = {
  "Curve:": AssetCategory.Curve,
  "Material:": AssetCategory.MaterialProvider,
  "Pattern:": AssetCategory.Pattern,
  "Position:": AssetCategory.PositionProvider,
  "Prop:": AssetCategory.Prop,
  "Scanner:": AssetCategory.Scanner,
  "Assignment:": AssetCategory.Assignment,
  "Vector:": AssetCategory.VectorProvider,
  "Environment:": AssetCategory.EnvironmentProvider,
  "Tint:": AssetCategory.TintProvider,
  "BlockMask:": AssetCategory.BlockMask,
  "Directionality:": AssetCategory.Directionality,
};

function getNodeColor(node: Node): string {
  const type = node.type ?? "";
  for (const [prefix, cat] of Object.entries(PREFIX_TO_CATEGORY)) {
    if (type.startsWith(prefix)) {
      return CATEGORY_COLORS[cat];
    }
  }
  return CATEGORY_COLORS[AssetCategory.Density];
}

/** Remap any node whose type isn't in the registry to "default" + preview node indicator */
function useResolvedNodes() {
  const nodes = useEditorStore((s) => s.nodes);
  const selectedPreviewNodeId = usePreviewStore((s) => s.selectedPreviewNodeId);
  return useMemo(
    () =>
      nodes.map((node) => {
        const resolved = node.type && node.type in nodeTypes
          ? node
          : { ...node, type: "default" };
        if (selectedPreviewNodeId && node.id === selectedPreviewNodeId) {
          return { ...resolved, className: "ring-2 ring-cyan-400/60" };
        }
        return resolved;
      }),
    [nodes, selectedPreviewNodeId],
  );
}

// ---------------------------------------------------------------------------
// Context menu state types
// ---------------------------------------------------------------------------

interface ContextMenuState {
  type: "canvas" | "node";
  x: number;
  y: number;
  nodeId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EditorCanvasProps {
  mode?: "full" | "inspect";
  showRootDock?: boolean;
  onNodeDoubleClick?: (node: Node) => void;
}

export function EditorCanvas({
  mode = "full",
  showRootDock,
  onNodeDoubleClick,
}: EditorCanvasProps = {}) {
  const inspectMode = mode === "inspect";
  const shouldShowRootDock = showRootDock ?? !inspectMode;
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddPos, setQuickAddPos] = useState({ x: 0, y: 0 });
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const resolvedNodes = useResolvedNodes();
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const reactFlowInstance = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);

  // UI Store
  const showGrid = useUIStore((s) => s.showGrid);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const gridSize = useUIStore((s) => s.gridSize);
  const showMinimap = useUIStore((s) => s.showMinimap);

  // Track mouse position for keyboard-invoked quick-add
  const mousePosRef = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Ctrl+scroll → vertical pan, Alt+scroll → horizontal pan ──────────
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      const { x, y, zoom } = reactFlowInstance.getViewport();
      if (e.ctrlKey) {
        reactFlowInstance.setViewport({ x, y: y - e.deltaY, zoom });
      } else {
        reactFlowInstance.setViewport({ x: x - e.deltaY, y, zoom });
      }
    };
    el.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", handleWheel, { capture: true });
  }, [reactFlowInstance]);

  // ── Zoom-responsive handle scaling via CSS variable ────────────────
  const zoom = useStore((s) => s.transform[2]);
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      const scale = Math.min(1.8, Math.max(0.75, 1 / Math.sqrt(zoom)));
      el.style.setProperty("--handle-scale", String(scale));
    });
    return () => cancelAnimationFrame(id);
  }, [zoom]);

  // Pending connection ref for onConnectEnd
  const pendingHandleRef = useRef<{
    nodeId: string;
    handleId: string;
    handleType: "source" | "target";
  } | null>(null);

  // Track where a connection drag started (for backward-drag distance check)
  const connectStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Track whether onConnect fired (successful connection) to avoid opening QuickAdd
  const connectionMadeRef = useRef(false);

  // ── Input handle selection (for single-port upstream tracing) ───────
  const [selectedHandle, setSelectedHandle] = useState<{ nodeId: string; handleId: string } | null>(null);

  // ── Edge hover state (local refs to avoid store broadcasts) ────────
  const [hoverTrigger, setHoverTrigger] = useState(0);
  const hoveredEdgeRef = useRef<Edge | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConnect = useCallback((connection: Connection) => {
    connectionMadeRef.current = true;
    onConnect(connection);
    useDragStore.getState().setConnectingCategory(null);
  }, [onConnect]);

  // ── fitView on biome section switch ───────────────────────────────────
  useEffect(() => {
    if (activeBiomeSection == null) return;
    const timer = setTimeout(() => {
      reactFlowInstance.fitView();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeBiomeSection, reactFlowInstance]);

  // ── Re-layout on flow direction change ─────────────────────────────────
  const flowDirection = useSettingsStore((s) => s.flowDirection);
  const prevDirectionRef = useRef(flowDirection);

  useEffect(() => {
    if (prevDirectionRef.current === flowDirection) return;
    prevDirectionRef.current = flowDirection;

    const { nodes, edges } = useEditorStore.getState();
    if (nodes.length === 0) return;

    (async () => {
      try {
        const layouted = await autoLayout(nodes, edges, flowDirection);
        useEditorStore.getState().setNodes(layouted);
        // Double rAF ensures React's commit phase is done and the browser has painted,
        // so updateNodeInternals reads the correct handle positions from the DOM.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updateNodeInternals(layouted.map((n) => n.id));
            reactFlowInstance.fitView({ padding: 0.1, duration: 300 });
          });
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("Auto layout failed (flow direction change):", err);
      }
    })();
  }, [flowDirection, reactFlowInstance, updateNodeInternals]);

  // ── Connection type validation ────────────────────────────────────────
  const isValidConnection = useConnectionValidation();

  // ── Knife tool (Ctrl+Shift+LMB drag to cut wires) ──────────────────
  const {
    knifeActive,
    cutEdgeIds,
    overlayProps: knifeOverlayProps,
    handlePointerDownCapture: knifePointerDownCapture,
    handlePointerMoveCapture: knifePointerMoveCapture,
    handlePointerUpCapture: knifePointerUpCapture,
  } = useKnifeTool({ containerRef: canvasContainerRef });

  // ── Node interjection (drag node over wire to insert) ────────────────
  const {
    interjectEdgeId,
    onNodeDrag: interjectOnNodeDrag,
    onNodeDragStop: interjectOnNodeDragStop,
    checkPaletteDrag,
    getInterjectResult,
    clearInterject,
  } = useNodeInterjection();

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    disabled: inspectMode,
    onSearchOpen: () => setSearchOpen(true),
    onQuickAdd: () => {
      // Open at current cursor position (tracked via mousemove on wrapper)
      setQuickAddPos({ x: mousePosRef.current.x, y: mousePosRef.current.y });
      setPendingConnection(null);
      setQuickAddOpen(true);
    },
  });

  // ── Bidirectional path highlighting ─────────────────────────────────
  const { upstreamEdgeIds, downstreamEdgeIds, hasHighlight } = useMemo(() => {
    const empty = {
      upstreamEdgeIds: new Set<string>(),
      downstreamEdgeIds: new Set<string>(),
      hasHighlight: false,
    };

    // Input handle selection — trace upstream from that specific port
    if (selectedHandle) {
      const connectedEdge = edges.find(
        (e) => e.target === selectedHandle.nodeId && e.targetHandle === selectedHandle.handleId,
      );
      if (connectedEdge) {
        const upstream = getUpstreamEdgeIds(connectedEdge.source, edges);
        upstream.add(connectedEdge.id);
        return { upstreamEdgeIds: upstream, downstreamEdgeIds: new Set<string>(), hasHighlight: true };
      }
      return empty;
    }

    if (selectedNodeId) {
      // Selection takes priority — full bidirectional from selected node
      const { upstream, downstream } = getBidirectionalEdgeIds(selectedNodeId, edges);
      return {
        upstreamEdgeIds: upstream,
        downstreamEdgeIds: downstream,
        hasHighlight: upstream.size > 0 || downstream.size > 0,
      };
    }

    const hoveredEdge = hoveredEdgeRef.current;
    if (hoveredEdge) {
      // Hover — upstream from edge's source, downstream from edge's target
      const upstream = getUpstreamEdgeIds(hoveredEdge.source, edges);
      upstream.add(hoveredEdge.id);
      const downstream = new Set<string>([hoveredEdge.id]);
      const { downstream: downFromTarget } = getBidirectionalEdgeIds(hoveredEdge.target, edges);
      for (const id of downFromTarget) downstream.add(id);
      return {
        upstreamEdgeIds: upstream,
        downstreamEdgeIds: downstream,
        hasHighlight: true,
      };
    }

    return empty;
  }, [selectedHandle, selectedNodeId, edges, hoverTrigger]);

  const styledEdges = useMemo(() => {
    const hasInterject = interjectEdgeId !== null;
    const needsHighlight = hasHighlight || (knifeActive && cutEdgeIds.size > 0) || hasInterject;
    if (!needsHighlight) return edges;
    return edges.map((edge) => {
      // Knife cut highlight takes priority
      if (knifeActive && cutEdgeIds.has(edge.id)) {
        return { ...edge, className: "knife-cut-edge", style: { stroke: "#ff4444", strokeWidth: 3 } };
      }

      // Interjection highlight (second priority)
      if (hasInterject && edge.id === interjectEdgeId) {
        return {
          ...edge,
          className: "interjection-edge",
          style: { stroke: "#00CED1", strokeWidth: 3, strokeDasharray: "8 4" },
        };
      }

      const isUpstream = upstreamEdgeIds.has(edge.id);
      const isDownstream = downstreamEdgeIds.has(edge.id);

      if (isUpstream && isDownstream) {
        return { ...edge, animated: false, style: { stroke: "#ffffff", strokeWidth: 3 } };
      }
      if (isUpstream) {
        return { ...edge, animated: false, style: { stroke: "#5AACA6", strokeWidth: 2.5 } };
      }
      if (isDownstream) {
        return { ...edge, animated: false, style: { stroke: "#7a9e68", strokeWidth: 2.5 } };
      }
      if (hasHighlight) {
        // Non-participating — dotted
        return { ...edge, style: { stroke: "#5a5347", strokeWidth: 1.5, strokeDasharray: "4 3" } };
      }
      return edge;
    });
  }, [edges, hasHighlight, upstreamEdgeIds, downstreamEdgeIds, knifeActive, cutEdgeIds, interjectEdgeId]);

  // ── Pointer-based drop handler (replaces HTML5 drag-and-drop) ───────
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (inspectMode) return;
      const { isDragging, dragData, endDrag } = useDragStore.getState();
      if (!isDragging || !dragData) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const nodeId = crypto.randomUUID();
      useEditorStore.getState().addNode({
        id: nodeId,
        type: dragData.nodeType,
        position,
        data: { type: dragData.displayType, fields: { ...dragData.defaults } },
      });

      // Check if interjection hook resolved a target edge during palette drag
      const interjectResult = getInterjectResult();
      if (interjectResult) {
        useEditorStore.getState().interjectOnEdge(
          interjectResult.edgeId,
          nodeId,
          interjectResult.inputHandleId,
          interjectResult.outputHandleId,
        );
      }

      clearInterject();
      useProjectStore.getState().setDirty(true);
      endDrag();
    },
    [inspectMode, reactFlowInstance, getInterjectResult, clearInterject],
  );

  // ── Edge hover handlers (30ms debounce) ─────────────────────────────
  const handleEdgeMouseEnter = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      hoveredEdgeRef.current = edge;
      setHoverTrigger((t) => t + 1);
    }, 30);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    hoveredEdgeRef.current = null;
    setHoverTrigger((t) => t + 1);
  }, []);

  // Cleanup hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // ── Context menu handlers ───────────────────────────────────────────
  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    const clientX = (event as MouseEvent).clientX;
    const clientY = (event as MouseEvent).clientY;
    setContextMenu({ type: "canvas", x: clientX, y: clientY });
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Select the node if not already selected
    if (!node.selected) {
      setSelectedNodeId(node.id);
    }
    setContextMenu({ type: "node", x: event.clientX, y: event.clientY, nodeId: node.id });
  }, [setSelectedNodeId]);

  const handleSelectionContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const nodes = useEditorStore.getState().nodes;
    const firstSelected = nodes.find((n) => n.selected);
    if (firstSelected) {
      setContextMenu({ type: "node", x: event.clientX, y: event.clientY, nodeId: firstSelected.id });
    }
  }, []);

  // ── onConnectEnd — open QuickAdd when dropped on empty canvas ────────
  const handleConnectStart = useCallback((_event: any, params: any) => {
    connectionMadeRef.current = false;
    const handleType = params.handleType ?? "source";
    pendingHandleRef.current = {
      nodeId: params.nodeId,
      handleId: params.handleId ?? "output",
      handleType,
    };

    // Record drag start position for backward-drag distance check
    const clientX = _event.clientX ?? _event.touches?.[0]?.clientX ?? 0;
    const clientY = _event.clientY ?? _event.touches?.[0]?.clientY ?? 0;
    connectStartPosRef.current = { x: clientX, y: clientY };

    // Input handle click → highlight upstream path from this port
    if (handleType === "target" && params.handleId) {
      setSelectedHandle({ nodeId: params.nodeId, handleId: params.handleId });
    } else {
      setSelectedHandle(null);
    }

    // Broadcast source handle category for connection suggestions
    const nodes = useEditorStore.getState().nodes;
    const node = nodes.find((n) => n.id === params.nodeId);
    const nodeType = node?.type ?? "default";
    const handleId = params.handleId ?? (handleType === "source" ? "output" : "Input");
    const handleDef = findHandleDef(nodeType, handleId);
    useDragStore.getState().setConnectingCategory(handleDef?.category ?? null);
  }, []);

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    useDragStore.getState().setConnectingCategory(null);
    const pending = pendingHandleRef.current;
    pendingHandleRef.current = null;
    if (!pending) return;

    // If onConnect fired, the connection succeeded — don't open QuickAdd
    if (connectionMadeRef.current) return;

    const clientX = (event as MouseEvent).clientX ?? (event as TouchEvent).changedTouches?.[0]?.clientX ?? 0;
    const clientY = (event as MouseEvent).clientY ?? (event as TouchEvent).changedTouches?.[0]?.clientY ?? 0;

    // Target handle: short click = path highlighting only, long drag = open QuickAdd
    if (pending.handleType === "target") {
      const start = connectStartPosRef.current;
      if (start) {
        const dx = clientX - start.x;
        const dy = clientY - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10) return; // click — used for path highlighting
      } else {
        return;
      }
    }

    // Look up the node type for handle category resolution
    const nodes = useEditorStore.getState().nodes;
    const node = nodes.find((n) => n.id === pending.nodeId);
    const nodeType = node?.type ?? "default";

    // Clear path highlighting when opening QuickAdd from backward drag
    if (pending.handleType === "target") {
      setSelectedHandle(null);
    }

    setQuickAddPos({ x: clientX, y: clientY });
    setPendingConnection({
      nodeId: pending.nodeId,
      handleId: pending.handleId,
      handleType: pending.handleType,
      nodeType,
    });
    setQuickAddOpen(true);
  }, []);

  // Close context menu on any pane click
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedHandle(null);
    usePreviewStore.getState().setSelectedPreviewNodeId(null);
    setContextMenu(null);
  }, [setSelectedNodeId]);

  // ── Memoized static props for ReactFlow ────────────────────────────
  const snapGridValue = useMemo(() => [gridSize, gridSize] as [number, number], [gridSize]);
  const defaultEdgeOpts = useMemo(() => ({ style: { stroke: "#5a5347", strokeWidth: 1.5 } }), []);
  const connectionLineStyleValue = useMemo(() => ({ stroke: "#8a7f70", strokeWidth: 2 }), []);

  // ── Memoized inline event handlers ─────────────────────────────────
  const handleEdgeClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedHandle(null);
    usePreviewStore.getState().setSelectedPreviewNodeId(null);
    setContextMenu(null);
  }, [setSelectedNodeId]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setSelectedHandle(null);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedHandle(null);
    usePreviewStore.getState().setSelectedPreviewNodeId(node.id);
  }, [setSelectedNodeId]);

  return (
    <div
      ref={canvasContainerRef}
      className="w-full h-full"
      style={knifeActive ? { cursor: "crosshair" } : undefined}
      onMouseUp={handleMouseUp}
      onMouseMove={(e) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
        if (inspectMode) return;
        // Palette drag → check for interjection target
        const { isDragging, dragData } = useDragStore.getState();
        if (isDragging && dragData) {
          const flowPos = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          checkPaletteDrag(flowPos, dragData.nodeType);
        }
      }}
      onPointerDownCapture={inspectMode ? undefined : knifePointerDownCapture}
      onPointerMoveCapture={inspectMode ? undefined : knifePointerMoveCapture}
      onPointerUpCapture={inspectMode ? undefined : knifePointerUpCapture}
    >
      <ReactFlow
        nodes={resolvedNodes}
        edges={styledEdges}
        onNodesChange={inspectMode ? undefined : onNodesChange}
        onEdgesChange={inspectMode ? undefined : onEdgesChange}
        onConnect={inspectMode ? undefined : handleConnect}
        isValidConnection={inspectMode ? undefined : isValidConnection}
        nodeTypes={nodeTypes}
        onEdgeClick={handleEdgeClick}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onNodeDrag={inspectMode ? undefined : interjectOnNodeDrag}
        onNodeDragStop={inspectMode ? undefined : interjectOnNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={(_, node) => onNodeDoubleClick?.(node)}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={inspectMode ? undefined : handlePaneContextMenu}
        onNodeContextMenu={inspectMode ? undefined : handleNodeContextMenu}
        onSelectionContextMenu={inspectMode ? undefined : handleSelectionContextMenu}
        onConnectStart={inspectMode ? undefined : handleConnectStart}
        onConnectEnd={inspectMode ? undefined : handleConnectEnd}
        fitView
        deleteKeyCode={inspectMode ? null : ["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        nodesDraggable={!inspectMode}
        nodesConnectable={!inspectMode}
        // ── Snap-to-grid ──────────────────────────────────────────────
        snapToGrid={snapToGrid}
        snapGrid={snapGridValue}
        // ── Edge styling ──────────────────────────────────────────────
        defaultEdgeOptions={defaultEdgeOpts}
        connectionLineStyle={connectionLineStyleValue}
        // ── Magnetic wire snapping ───────────────────────────────────
        connectionRadius={20}
        // ── Marquee selection ────────────────────────────────────────
        selectionOnDrag
        selectionKeyCode={null}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        // ── Zoom bounds ────────────────────────────────────────────
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        // ── Space-to-pan ─────────────────────────────────────────────
        panActivationKeyCode="Space"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={showGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
          gap={showGrid ? gridSize : 20}
          size={showGrid ? 0.5 : 1}
          color={showGrid ? "#3a3830" : "#4a4438"}
        />
        <Controls
          position="bottom-right"
          className="!bg-tn-surface !border-tn-border !shadow-lg [&>button]:!bg-tn-panel [&>button]:!border-tn-border [&>button]:!text-tn-text"
        />
        {showMinimap && (
          <MiniMap
            position="bottom-left"
            className="!bg-tn-surface !border-tn-border"
            nodeColor={getNodeColor}
            maskColor="rgba(28, 26, 23, 0.8)"
            pannable
            zoomable
          />
        )}
      </ReactFlow>

      {/* Knife tool cut line overlay */}
      {!inspectMode && <KnifeOverlay {...knifeOverlayProps} />}

      {/* Root dock — right-edge output target */}
      {shouldShowRootDock && <RootDock />}

      {/* Node search dialog (Ctrl+F) */}
      {!inspectMode && <NodeSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />}

      {/* Quick-add dialog (Tab / Shift+A / connection drop) */}
      {!inspectMode && (
        <QuickAddDialog
          open={quickAddOpen}
          position={quickAddPos}
          pendingConnection={pendingConnection}
          onClose={() => {
            setQuickAddOpen(false);
            setPendingConnection(null);
          }}
        />
      )}

      {/* Canvas context menu */}
      {!inspectMode && contextMenu?.type === "canvas" && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onQuickAdd={() => {
            setQuickAddPos({ x: contextMenu.x, y: contextMenu.y });
            setPendingConnection(null);
            setQuickAddOpen(true);
          }}
        />
      )}

      {/* Node context menu */}
      {!inspectMode && contextMenu?.type === "node" && contextMenu.nodeId && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
