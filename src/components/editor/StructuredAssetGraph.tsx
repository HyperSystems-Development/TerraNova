import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

export interface StructuredGraphNodeData extends Record<string, unknown> {
  label: string;
  subtitle?: string;
  accent: string;
  stats?: string[];
  badges?: string[];
}

type StructuredGraphNode = Node<StructuredGraphNodeData, "assetCard">;

interface StructuredAssetGraphProps {
  nodes: Array<Node<StructuredGraphNodeData>>;
  edges: Edge[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

function AssetCardNode({ data, selected }: NodeProps<StructuredGraphNode>) {
  return (
    <div
      className={`min-w-[220px] max-w-[240px] rounded-xl border bg-tn-surface/95 shadow-[0_14px_42px_rgba(0,0,0,0.28)] backdrop-blur-sm ${
        selected ? "border-tn-accent ring-1 ring-tn-accent/55" : "border-tn-border/70"
      }`}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${data.accent}55, 0 16px 42px rgba(0, 0, 0, 0.35)`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-tn-surface"
        style={{ background: data.accent }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-tn-surface"
        style={{ background: data.accent }}
        isConnectable={false}
      />

      <div className="border-b border-tn-border/50 px-3 py-2">
        <div className="flex items-start gap-2">
          <div
            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: data.accent }}
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-tn-text">
              {data.label}
            </p>
            {data.subtitle && (
              <p className="mt-1 text-[10px] leading-snug text-tn-text-muted">
                {data.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {data.stats && data.stats.length > 0 && (
        <div className="space-y-1 px-3 py-2">
          {data.stats.map((stat) => (
            <p key={stat} className="text-[10px] leading-snug text-tn-text-muted">
              {stat}
            </p>
          ))}
        </div>
      )}

      {data.badges && data.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-tn-border/40 px-3 py-2">
          {data.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-tn-border/50 bg-tn-bg/60 px-2 py-0.5 text-[9px] uppercase tracking-wider text-tn-text-muted"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const NODE_TYPES = {
  assetCard: AssetCardNode,
};

export function StructuredAssetGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodeDoubleClick,
}: StructuredAssetGraphProps) {
  const displayNodes: StructuredGraphNode[] = nodes.map((node) => ({
    ...node,
    type: "assetCard",
    selected: selectedNodeId === node.id,
  }));

  return (
    <div className="h-full w-full rounded-xl border border-tn-border/60 bg-[radial-gradient(circle_at_top,_rgba(80,120,180,0.12),_transparent_40%),linear-gradient(to_bottom,_rgba(18,24,32,0.92),_rgba(12,17,23,0.98))]">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        fitView
        minZoom={0.3}
        maxZoom={1.6}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "rgba(124, 164, 255, 0.72)",
          },
          style: {
            stroke: "rgba(124, 164, 255, 0.72)",
            strokeWidth: 1.6,
          },
        }}
        onNodeClick={(_, node) => onSelectNode?.(node.id)}
        onNodeDoubleClick={(_, node) => onNodeDoubleClick?.(node.id)}
        onPaneClick={() => onSelectNode?.("")}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(110, 135, 185, 0.18)" gap={28} />
        <Controls showInteractive={false} className="!border !border-tn-border/60 !bg-tn-surface/85" />
        <MiniMap
          pannable
          zoomable
          className="!border !border-tn-border/60 !bg-tn-surface/85"
          nodeColor={(node) => String((node.data as StructuredGraphNodeData | undefined)?.accent ?? "#6b7280")}
          maskColor="rgba(5, 7, 11, 0.38)"
        />
      </ReactFlow>
    </div>
  );
}
