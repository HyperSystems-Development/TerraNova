import { Fragment, memo, useMemo } from "react";
import { Handle, useStore } from "@xyflow/react";
import type { TypedNodeProps } from "@/nodes/shared/BaseNode";
import { ROW_H, handleTop, inputPosition, outputPosition, inputSide } from "@/nodes/shared/nodeLayout";
import { INPUT_HANDLE_COLOR, getHandleColor, type HandleDef } from "@/nodes/shared/handles";
import { useSettingsStore } from "@/stores/settingsStore";
import { getHandles } from "@/nodes/handleRegistry";
import { AssetCategory } from "@/schema/types";

/**
 * Fallback node component for any V2 type that doesn't have
 * a dedicated custom node component yet.
 * Shows the type header, all scalar fields, and generic handles.
 */
export const GenericNode = memo(function GenericNode({ selected, id, ...props }: TypedNodeProps) {
  const data = props.data;
  const typeName = String(data.type ?? "Unknown");
  const flowDirection = useSettingsStore((s) => s.flowDirection);
  const inPos = inputPosition(flowDirection);
  const outPos = outputPosition(flowDirection);
  const inSide = inputSide(flowDirection);

  // Pick a header color based on type name hash (deterministic)
  const headerColor = getTypeColor(typeName);
  const schemaHandles = useMemo(() => getHandles(typeName), [typeName]);
  const schemaTargetHandles = useMemo(
    () => schemaHandles.filter((handle) => handle.type === "target"),
    [schemaHandles],
  );
  const schemaSourceHandles = useMemo(
    () => schemaHandles.filter((handle) => handle.type === "source"),
    [schemaHandles],
  );

  // Only show scalar fields in the body (not nested objects/arrays)
  const scalarFields = useMemo(() => {
    const fields = data.fields ?? {};
    return Object.entries(fields).filter(
      ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean",
    );
  }, [data.fields]);

  // Filter s.edges for handles targeting this node; custom equality prevents re-renders when handles are unchanged
  const uniqueTargetHandles = useStore(
    (s) => {
      const handles: string[] = [];
      for (const edge of s.edges) {
        if (edge.target === id && edge.targetHandle) handles.push(edge.targetHandle);
      }
      return [...new Set(handles)];
    },
    (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  );

  const targetHandles: HandleDef[] = schemaTargetHandles.length > 0
    ? [
        ...schemaTargetHandles,
        ...uniqueTargetHandles
          .filter((handleId) => !schemaTargetHandles.some((handle) => handle.id === handleId))
          .map((handleId) => ({ id: handleId, label: handleId, type: "target" as const, category: schemaTargetHandles[0].category })),
      ]
    : uniqueTargetHandles.map((handleId) => ({
        id: handleId,
        label: handleId,
        type: "target" as const,
        category: schemaSourceHandles[0]?.category ?? AssetCategory.Density,
      }));
  const sourceHandles: HandleDef[] = schemaSourceHandles.length > 0
    ? schemaSourceHandles
    : [{ id: "output", label: "Output", type: "source" as const, category: targetHandles[0]?.category ?? AssetCategory.Density }];
  const showFallbackInput = targetHandles.length === 0;
  const maxRows = Math.max(targetHandles.length || 1, sourceHandles.length || 1);

  return (
    <div
      className="rounded-md min-w-[180px] max-w-[280px]"
      style={{
        background: "#262320",
        boxShadow: selected
          ? "0 0 0 2px #f59e0b, 0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 text-xs font-semibold text-white text-left"
        style={{
          backgroundColor: headerColor,
          borderRadius: "5px 5px 0 0",
        }}
      >
        {typeName}
      </div>

      {/* Handle zone */}
      <div className="relative" style={{ height: maxRows * ROW_H }}>
        {targetHandles.map((handle, i) => (
          <Fragment key={handle.id}>
            <Handle
              type="target"
              position={inPos}
              id={handle.id}
              style={{
                background: INPUT_HANDLE_COLOR,
                width: 14,
                height: 14,
                border: "2px solid rgba(0,0,0,0.4)",
                top: handleTop(i),
              }}
            />
            <div
              className={`absolute ${inSide}-4 text-tn-text-muted text-[10px]`}
              style={{ top: handleTop(i), transform: "translateY(-50%)" }}
            >
              {handle.label || handle.id}
            </div>
          </Fragment>
        ))}
        {showFallbackInput && (
          <Handle
            type="target"
            position={inPos}
            id="input"
            style={{
              background: INPUT_HANDLE_COLOR,
              width: 14,
              height: 14,
              border: "2px solid rgba(0,0,0,0.4)",
              top: handleTop(0),
            }}
          />
        )}

        {sourceHandles.map((handle, i) => (
          <Fragment key={handle.id}>
            <Handle
              type="source"
              position={outPos}
              id={handle.id}
              style={{
                background: getHandleColor(handle.category) || headerColor,
                width: 14,
                height: 14,
                border: "2px solid rgba(0,0,0,0.4)",
                top: handleTop(i),
              }}
            />
            <div
              className="absolute right-4 text-tn-text-muted text-[10px]"
              style={{ top: handleTop(i), transform: "translateY(-50%)" }}
            >
              {handle.label || handle.id}
            </div>
          </Fragment>
        ))}
      </div>

      {/* Scalar fields zone */}
      {scalarFields.length > 0 ? (
        <div
          className="px-3 py-2 text-xs"
          style={{ borderTop: `1px solid ${headerColor}33` }}
        >
          <div className="space-y-1">
            {scalarFields.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-tn-text-muted truncate">{key}</span>
                <span className="truncate font-mono">
                  {typeof value === "boolean" ? (value ? "true" : "false") : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="px-3 py-2 text-xs"
          style={{ borderTop: `1px solid ${headerColor}33` }}
        >
          <span className="text-tn-text-muted italic">No fields</span>
        </div>
      )}
    </div>
  );
});

/** Deterministic color from type name, so each type always gets the same color */
function getTypeColor(typeName: string): string {
  const TYPE_COLORS: Record<string, string> = {
    // World structure types
    NoiseRange: "#5A6FA0",
    // Material types
    Constant: "#5B8DBF",
    SpaceAndDepth: "#C87D3A",
    // Biome/settings
    DAOTerrain: "#4E9E8F",
  };

  if (TYPE_COLORS[typeName]) return TYPE_COLORS[typeName];

  // Hash-based fallback
  let hash = 0;
  for (let i = 0; i < typeName.length; i++) {
    hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 40%, 48%)`;
}
