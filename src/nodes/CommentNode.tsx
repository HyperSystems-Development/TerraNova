import { memo, useState, useCallback, useRef } from "react";
import type { NodeProps } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";

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

export const CommentNode = memo(function CommentNode({ id, selected, data }: NodeProps) {
  const nodeData = data as unknown as CommentNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(nodeData.text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(nodeData.text ?? "");
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [nodeData.text]);

  const handleCommit = useCallback(() => {
    setIsEditing(false);
    useEditorStore.getState().updateNodeField(id, "text", editText);
  }, [id, editText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(nodeData.text ?? "");
    }
    // Ctrl+Enter or Shift+Enter to commit
    if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) {
      handleCommit();
    }
  }, [nodeData.text, handleCommit]);

  const width = nodeData.width ?? 200;
  const height = nodeData.height ?? 80;

  return (
    <div
      style={{
        width,
        height,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        background: COMMENT_BG,
        border: `1px solid ${selected ? COMMENT_COLOR : COMMENT_BORDER}`,
        borderRadius: 6,
        boxShadow: selected
          ? `0 0 0 2px ${COMMENT_COLOR}55, 0 2px 8px rgba(0,0,0,0.3)`
          : "0 1px 4px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
        pointerEvents: "all",
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Drag handle / header strip */}
      <div
        className="nodrag"
        style={{
          background: `${COMMENT_COLOR}22`,
          borderBottom: `1px solid ${COMMENT_BORDER}`,
          padding: "2px 6px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          cursor: "grab",
        }}
      >
        <span style={{ color: COMMENT_COLOR, fontSize: 10, userSelect: "none" }}>✎ Comment</span>
      </div>

      {/* Text content */}
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
              color: COMMENT_COLOR,
              fontSize: 11,
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <div
            style={{
              color: COMMENT_COLOR,
              fontSize: 11,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.4,
              opacity: nodeData.text ? 1 : 0.4,
              userSelect: "none",
            }}
          >
            {nodeData.text || "Double-click to edit…"}
          </div>
        )}
      </div>
    </div>
  );
});
