import { useCallback, useRef, useState } from "react";
import type { MaterialLayer } from "@/utils/biomeSectionUtils";
import { InteractiveLayerCard } from "./InteractiveLayerCard";

interface DragState {
  dragging: boolean;
  dragIndex: number;
  overIndex: number;
  startY: number;
  currentY: number;
}

export function DraggableLayerList({
  layers,
  onSelectNode,
  onRemove,
  onChangeType,
  onReorder,
}: {
  layers: MaterialLayer[];
  onSelectNode: (id: string) => void;
  onRemove: (index: number) => void;
  onChangeType: (index: number, type: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragRef = useRef<DragState>({
    dragging: false,
    dragIndex: -1,
    overIndex: -1,
    startY: 0,
    currentY: 0,
  });
  const [, forceUpdate] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56; // approximate height of each card

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      dragIndex: index,
      overIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
    };
    forceUpdate((n) => n + 1);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag.dragging) return;

    drag.currentY = e.clientY;
    const deltaY = e.clientY - drag.startY;
    const indexOffset = Math.round(deltaY / itemHeight);
    const newOverIndex = Math.max(0, Math.min(layers.length - 1, drag.dragIndex + indexOffset));
    drag.overIndex = newOverIndex;
    forceUpdate((n) => n + 1);
  }, [layers.length]);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.dragging) return;

    if (drag.dragIndex !== drag.overIndex) {
      onReorder(drag.dragIndex, drag.overIndex);
    }

    dragRef.current = {
      dragging: false,
      dragIndex: -1,
      overIndex: -1,
      startY: 0,
      currentY: 0,
    };
    forceUpdate((n) => n + 1);
  }, [onReorder]);

  const drag = dragRef.current;

  return (
    <div
      ref={listRef}
      className="flex flex-col gap-1.5 relative"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {layers.map((layer, i) => {
        const layerIndex = layer.layerIndex ?? i;
        let transform = "";
        let opacity = 1;
        let zIndex = 0;

        if (drag.dragging) {
          if (i === drag.dragIndex) {
            const deltaY = drag.currentY - drag.startY;
            transform = `translateY(${deltaY}px)`;
            opacity = 0.85;
            zIndex = 10;
          } else {
            // Shift items to make room
            if (drag.dragIndex < drag.overIndex && i > drag.dragIndex && i <= drag.overIndex) {
              transform = `translateY(-${itemHeight + 6}px)`;
            } else if (drag.dragIndex > drag.overIndex && i < drag.dragIndex && i >= drag.overIndex) {
              transform = `translateY(${itemHeight + 6}px)`;
            }
          }
        }

        return (
          <div
            key={`${layer.nodeId}-${i}`}
            style={{
              transform,
              opacity,
              zIndex,
              transition: drag.dragging && i !== drag.dragIndex ? "transform 150ms ease" : undefined,
            }}
          >
            <InteractiveLayerCard
              layer={layer}
              layerIndex={layerIndex}
              onClick={() => onSelectNode(layer.nodeId)}
              onRemove={() => onRemove(layerIndex)}
              onChangeType={(type) => onChangeType(layerIndex, type)}
              onDragStart={(e) => handlePointerDown(e, i)}
            />
          </div>
        );
      })}

      {/* Insertion indicator */}
      {drag.dragging && drag.dragIndex !== drag.overIndex && (
        <div
          className="absolute left-0 right-0 h-0.5 bg-blue-400 rounded-full pointer-events-none"
          style={{
            top: drag.overIndex * (itemHeight + 6) + (drag.overIndex > drag.dragIndex ? itemHeight + 3 : -3),
          }}
        />
      )}
    </div>
  );
}
