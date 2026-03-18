import { Fragment, memo, useState, useCallback } from "react";
import { Handle, type NodeProps } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { ROW_H, handleTop, inputPosition, outputPosition, inputSide, outputSide } from "@/nodes/shared/nodeLayout";
import { INPUT_HANDLE_COLOR } from "@/nodes/shared/handles";
import { useSettingsStore } from "@/stores/settingsStore";

export interface GroupNodeData {
  type: "group";
  name: string;
  collapsed: boolean;
  internalNodes: Node[];
  internalEdges: Edge[];
  externalConnectionMap: ExternalConnection[];
}

interface ExternalConnection {
  originalNodeId: string;
  handleId: string;
  direction: "in" | "out";
}

const GROUP_COLOR = "#8B7355";

export const GroupNode = memo(function GroupNode({ id, selected, data }: NodeProps) {
  const nodeData = data as unknown as GroupNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(nodeData.name);
  const flowDirection = useSettingsStore((s) => s.flowDirection);
  const inPos = inputPosition(flowDirection);
  const outPos = outputPosition(flowDirection);
  const inSide = inputSide(flowDirection);
  const outSide = outputSide(flowDirection);

  const inConnections = nodeData.externalConnectionMap.filter((c) => c.direction === "in");
  const outConnections = nodeData.externalConnectionMap.filter((c) => c.direction === "out");
  const nodeCount = nodeData.internalNodes.length;
  const maxRows = Math.max(inConnections.length, outConnections.length);

  const handleExpand = useCallback(() => {
    useEditorStore.getState().expandGroup(id);
  }, [id]);

  const handleNameCommit = useCallback(() => {
    setIsEditing(false);
    useEditorStore.getState().updateNodeField(id, "name", editName);
  }, [id, editName]);

  return (
    <div
      className="rounded-md min-w-[200px]"
      style={{
        background: "#262320",
        boxShadow: selected
          ? "0 0 0 2px #f59e0b, 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.4)",
      }}
      onDoubleClick={handleExpand}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 text-xs font-semibold text-white text-left flex items-center gap-2"
        style={{
          background: "linear-gradient(to right, #6B5B3E, #8B7355)",
          borderRadius: "5px 5px 0 0",
        }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameCommit}
            onKeyDown={(e) => e.key === "Enter" && handleNameCommit()}
            className="flex-1 bg-transparent border-b border-white/50 text-white text-xs outline-none"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 cursor-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {nodeData.name}
          </span>
        )}
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
          {nodeCount}
        </span>
        <button
          onClick={handleExpand}
          className="text-white/70 hover:text-white text-[10px]"
          title="Expand group"
        >
          ⊞
        </button>
      </div>

      {/* Handle zone */}
      {maxRows > 0 ? (
        <div className="relative" style={{ height: maxRows * ROW_H }}>
          {/* Input handles + labels */}
          {inConnections.map((conn, i) => (
            <Fragment key={`in-${conn.handleId}-${i}`}>
              <Handle
                type="target"
                position={inPos}
                id={conn.handleId}
                style={{
                  background: INPUT_HANDLE_COLOR,
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(0,0,0,0.4)",
                  top: handleTop(i),
                }}
              />
              <div
                className={`absolute ${inSide}-4 text-xs text-tn-text-muted`}
                style={{ top: handleTop(i), transform: "translateY(-50%)" }}
              >
                {conn.handleId}
              </div>
            </Fragment>
          ))}

          {/* Output handles + labels */}
          {outConnections.map((conn, i) => (
            <Fragment key={`out-${conn.handleId}-${i}`}>
              <Handle
                type="source"
                position={outPos}
                id={conn.handleId}
                style={{
                  background: GROUP_COLOR,
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(0,0,0,0.4)",
                  top: handleTop(i),
                }}
              />
              <div
                className={`absolute ${outSide}-4 text-xs text-tn-text-muted`}
                style={{ top: handleTop(i), transform: "translateY(-50%)" }}
              >
                {conn.handleId}
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs">
          <span className="text-tn-text-muted italic">
            {nodeCount} node{nodeCount !== 1 ? "s" : ""} grouped
          </span>
        </div>
      )}

      <div
        className="px-3 py-1 text-[10px] text-tn-text-muted"
        style={{ borderTop: `1px solid ${GROUP_COLOR}33` }}
      >
        Double-click to expand
      </div>
    </div>
  );
});
