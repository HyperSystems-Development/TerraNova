import { memo, useState, useCallback, useRef } from "react";
import type { NodeProps, ResizeDragEvent, ResizeParams } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";

export interface FrameNodeData {
  type: "frame";
  name: string;
  width: number;
  height: number;
}

const FRAME_COLOR = "#4a7fa5";
const FRAME_BG = "rgba(74, 127, 165, 0.07)";
const FRAME_BORDER = "rgba(74, 127, 165, 0.35)";
const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

export const FrameNode = memo(function FrameNode({ id, selected, data }: NodeProps) {
  const nodeData = data as unknown as FrameNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(nodeData.name ?? "");
  const cancelEditRef = useRef(false);

  const handleLabelDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(nodeData.name ?? "");
    setIsEditing(true);
  }, [nodeData.name]);

  const handleCommit = useCallback(() => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    const { nodes, setNodes, commitState } = useEditorStore.getState();
    setNodes(nodes.map((n) =>
      n.id !== id ? n : { ...n, data: { ...n.data as object, name: editName } }
    ));
    commitState("Rename frame");
    useProjectStore.getState().setDirty(true);
  }, [id, editName]);

  const handleResizeEnd = useCallback(
    (_event: ResizeDragEvent, params: ResizeParams) => {
      const { nodes, setNodes, commitState } = useEditorStore.getState();
      setNodes(nodes.map((n) =>
        n.id !== id
          ? n
          : { ...n, data: { ...n.data as object, width: params.width, height: params.height } }
      ));
      commitState("Resize frame");
      useProjectStore.getState().setDirty(true);
    },
    [id],
  );

  const width = nodeData.width ?? 300;
  const height = nodeData.height ?? 200;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        lineStyle={{ borderColor: FRAME_COLOR, borderWidth: 1 }}
        handleStyle={{
          width: 10,
          height: 10,
          background: FRAME_COLOR,
          border: "2px solid rgba(0,0,0,0.3)",
          borderRadius: 2,
        }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        style={{
          width,
          height,
          background: FRAME_BG,
          border: `1px solid ${selected ? FRAME_COLOR : FRAME_BORDER}`,
          borderRadius: 8,
          boxShadow: selected
            ? `0 0 0 2px ${FRAME_COLOR}55`
            : "none",
          pointerEvents: "all",
          position: "relative",
        }}
      >
        {/* Label in top-left corner */}
        <div
          className="nodrag"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: "3px 10px",
            background: `${FRAME_COLOR}22`,
            borderBottom: `1px solid ${FRAME_BORDER}`,
            borderRight: `1px solid ${FRAME_BORDER}`,
            borderRadius: "7px 0 6px 0",
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "text",
          }}
          onDoubleClick={handleLabelDoubleClick}
        >
          {isEditing ? (
            <input
              type="text"
              value={editName}
              autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Escape") {
                  cancelEditRef.current = true;
                  setIsEditing(false);
                  setEditName(nodeData.name ?? "");
                }
              }}
              className="nodrag"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: FRAME_COLOR,
                fontSize: 11,
                fontWeight: 600,
                minWidth: 60,
                width: Math.max(60, editName.length * 7),
              }}
            />
          ) : (
            <span
              style={{
                color: FRAME_COLOR,
                fontSize: 11,
                fontWeight: 600,
                userSelect: "none",
                cursor: "text",
                opacity: nodeData.name ? 1 : 0.5,
              }}
            >
              {nodeData.name || "Frame"}
            </span>
          )}
        </div>
      </div>
    </>
  );
});
