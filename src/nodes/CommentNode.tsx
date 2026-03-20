import { memo, useState, useCallback, useRef } from "react";
import type { NodeProps, ResizeDragEvent, ResizeParams } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { isAuthorNoteText, stripAuthorNotePrefix } from "@/utils/annotationUtils";

export interface CommentNodeData {
  type: "comment";
  text: string;
  width: number;
  height: number;
}

const MIN_WIDTH = 120;
const MIN_HEIGHT = 60;
const COMMENT_COLOR = "#e8d44d";
const COMMENT_BG = "rgba(232, 212, 77, 0.12)";
const COMMENT_BORDER = "rgba(232, 212, 77, 0.5)";
const AUTHOR_NOTE_COLOR = "#7dcfff";
const AUTHOR_NOTE_BG = "rgba(125, 207, 255, 0.12)";
const AUTHOR_NOTE_BORDER = "rgba(125, 207, 255, 0.5)";

export const CommentNode = memo(function CommentNode({ id, selected, data }: NodeProps) {
  const nodeData = data as unknown as CommentNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(nodeData.text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAuthorNote = isAuthorNoteText(nodeData.text);
  const accentColor = isAuthorNote ? AUTHOR_NOTE_COLOR : COMMENT_COLOR;
  const backgroundColor = isAuthorNote ? AUTHOR_NOTE_BG : COMMENT_BG;
  const borderColor = isAuthorNote ? AUTHOR_NOTE_BORDER : COMMENT_BORDER;
  const displayText = isAuthorNote ? stripAuthorNotePrefix(nodeData.text) : (nodeData.text ?? "");

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(nodeData.text ?? "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [nodeData.text]);

  const handleCommit = useCallback(() => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    const { nodes, setNodes } = useEditorStore.getState();
    setNodes(nodes.map((node) => (
      node.id !== id ? node : { ...node, data: { ...node.data as object, text: editText } }
    )));
  }, [id, editText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      cancelEditRef.current = true;
      setIsEditing(false);
      setEditText(nodeData.text ?? "");
    }
    if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) {
      (e.target as HTMLTextAreaElement).blur();
    }
  }, [nodeData.text]);

  const handleResizeEnd = useCallback((_event: ResizeDragEvent, params: ResizeParams) => {
    const { nodes, setNodes } = useEditorStore.getState();
    setNodes(nodes.map((node) => (
      node.id !== id
        ? node
        : { ...node, data: { ...node.data as object, width: params.width, height: params.height } }
    )));
  }, [id]);

  const width = nodeData.width ?? 240;
  const height = nodeData.height ?? 110;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        lineStyle={{ borderColor: accentColor, borderWidth: 1 }}
        handleStyle={{
          width: 10,
          height: 10,
          background: accentColor,
          border: "2px solid rgba(0,0,0,0.3)",
          borderRadius: 2,
        }}
        onResizeEnd={handleResizeEnd}
      />
      <div
        style={{
          width,
          height,
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          background: backgroundColor,
          border: `1px solid ${selected ? accentColor : borderColor}`,
          borderRadius: 6,
          boxShadow: selected
            ? `0 0 0 2px ${accentColor}55, 0 2px 8px rgba(0,0,0,0.3)`
            : "0 1px 4px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          cursor: "default",
          pointerEvents: "all",
        }}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            background: `${accentColor}22`,
            borderBottom: `1px solid ${borderColor}`,
            padding: "2px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            cursor: "grab",
          }}
        >
          <span style={{ color: accentColor, fontSize: 10, fontWeight: 600, userSelect: "none" }}>
            {isAuthorNote ? "Author Note" : "Comment"}
          </span>
          {selected && (
            <span style={{ color: accentColor, fontSize: 10, opacity: 0.85, userSelect: "none" }}>
              {Math.round(width)} x {Math.round(height)}
            </span>
          )}
        </div>

        <div style={{ flex: 1, padding: "6px 8px", overflow: "hidden" }}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              className="nodrag nowheel"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: accentColor,
                fontSize: 11,
                resize: "none",
                fontFamily: "inherit",
              }}
            />
          ) : (
            <div
              style={{
                color: accentColor,
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.4,
                opacity: displayText ? 1 : 0.45,
                userSelect: "none",
              }}
            >
              {displayText || (isAuthorNote ? "Double-click to explain this template section..." : "Double-click to edit...")}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
