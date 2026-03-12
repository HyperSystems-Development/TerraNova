import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { MaterialLayer } from "@/utils/biomeSectionUtils";
import type { ConditionType } from "@/schema/material";
import { ConditionBadge, ConditionEditor } from "./ConditionEditor";
import { LAYER_CONTEXT_OPTIONS, LAYER_TYPE_LABELS } from "./constants";

export function V2LayerEditor(props: { sadNodeId: string; layers: MaterialLayer[]; onSelectNode: (id: string) => void }) {
  const { sadNodeId, layers, onSelectNode } = props;

  const biomeSections = useEditorStore((s) => s.biomeSections);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const addMaterialLayer = useEditorStore((s) => s.addMaterialLayer);
  const removeMaterialLayer = useEditorStore((s) => s.removeMaterialLayer);
  const changeMaterialLayerType = useEditorStore((s) => s.changeMaterialLayerType);

  const [conditionExpanded, setConditionExpanded] = useState(false);

  const section = biomeSections?.MaterialProvider;
  const sadNode = section?.nodes.find((n) => n.id === sadNodeId);
  const sadData = sadNode?.data as Record<string, unknown> | undefined;
  const sadFields = (sadData?.fields as Record<string, unknown>) ?? {};

  const layerContext = typeof sadFields.LayerContext === "string"
    ? sadFields.LayerContext
    : "DEPTH_INTO_FLOOR";
  const maxExpectedDepth = typeof sadFields.MaxExpectedDepth === "number"
    ? sadFields.MaxExpectedDepth
    : 16;

  const conditionData = sadFields.Condition as Record<string, unknown> | undefined;
  const conditionType = (conditionData?.Type as ConditionType) ?? "AlwaysTrueCondition";

  const v2Layers = layers.filter((l) => l.layerIndex != null);

  const layerNodeIds = new Map<number, string>();
  if (section) {
    for (const e of section.edges) {
      if (e.target === sadNodeId && /^Layers\[\d+\]$/.test(e.targetHandle ?? "")) {
        const idx = parseInt(/\[(\d+)\]/.exec(e.targetHandle!)![1]);
        layerNodeIds.set(idx, e.source);
      }
    }
  }

  const handleAddLayer = useCallback(() => {
    addMaterialLayer(sadNodeId, "ConstantThickness");
  }, [addMaterialLayer, sadNodeId]);

  const handleRemoveLayer = useCallback((index: number) => {
    removeMaterialLayer(sadNodeId, index);
  }, [sadNodeId, removeMaterialLayer]);

  const handleChangeType = useCallback((layerIndex: number, newType: string) => {
    const nodeId = layerNodeIds.get(layerIndex);
    if (nodeId) {
      changeMaterialLayerType(nodeId, newType, sadNodeId);
    }
  }, [layerNodeIds, sadNodeId, changeMaterialLayerType]);

  const handleConditionTypeChange = useCallback((newType: ConditionType) => {
    const base: Record<string, unknown> = { Type: newType };
    if (newType === "EqualsCondition") {
      base.ContextToCheck = "SPACE_ABOVE_FLOOR";
      base.Value = 0;
    } else if (newType === "GreaterThanCondition" || newType === "SmallerThanCondition") {
      base.ContextToCheck = "SPACE_ABOVE_FLOOR";
      base.Threshold = 0;
    }
    updateNodeField(sadNodeId, "Condition", base);
  }, [sadNodeId, updateNodeField]);

  const handleConditionFieldChange = useCallback((field: string, value: unknown) => {
    const current = { ...(conditionData ?? { Type: conditionType }) };
    current[field] = value;
    updateNodeField(sadNodeId, "Condition", current);
  }, [sadNodeId, conditionData, conditionType, updateNodeField]);

  return (
    <div className="flex flex-col p-3 gap-3">
      <div className="border-b border-tn-border pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Material Layers</h3>
            <p className="text-xs text-tn-text-muted">
              {v2Layers.length} layer{v2Layers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLayer}
            className="rounded border border-tn-accent/50 bg-tn-accent/10 px-2 py-1 text-[11px] font-medium text-tn-accent hover:bg-tn-accent/15"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded border border-tn-border bg-white/[0.03] p-2">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Context</label>
            <select
              value={layerContext}
              onChange={(event) => updateNodeField(sadNodeId, "LayerContext", event.target.value)}
              className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
            >
              {LAYER_CONTEXT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Max Depth</label>
            <input
              type="number"
              value={maxExpectedDepth}
              onChange={(event) => updateNodeField(
                sadNodeId,
                "MaxExpectedDepth",
                Number.parseInt(event.target.value, 10) || 0,
              )}
              className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 rounded border border-tn-border/50 bg-tn-bg/40 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-tn-text-muted">Condition</span>
            <ConditionBadge type={conditionType} />
          </div>
          <button
            type="button"
            onClick={() => setConditionExpanded((value) => !value)}
            className="text-[10px] font-medium uppercase tracking-wider text-tn-text-muted hover:text-tn-text"
          >
            {conditionExpanded ? "Hide" : "Edit"}
          </button>
        </div>

        {conditionExpanded && (
          <ConditionEditor
            conditionType={conditionType}
            conditionData={conditionData}
            onTypeChange={handleConditionTypeChange}
            onFieldChange={handleConditionFieldChange}
          />
        )}
      </div>

      <div>
        {v2Layers.length === 0 ? (
          <div className="text-xs text-tn-text-muted text-center py-4">
            No layers yet. Click "Add" to create one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {v2Layers.map((layer, idx) => (
              <div key={layer.nodeId} className="border border-tn-border rounded p-2 bg-white/[0.03] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">Layer {layer.layerIndex ?? idx + 1}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded leading-none bg-tn-accent/15 text-tn-accent">
                    {LAYER_TYPE_LABELS[(layer.layerType as keyof typeof LAYER_TYPE_LABELS) ?? "ConstantThickness"] ?? layer.layerType ?? "Constant"}
                  </span>
                  <span className="text-[10px] text-tn-text-muted">t: {layer.thickness ?? "-"}</span>
                  <button
                    className="ml-auto px-2 py-0.5 text-xs rounded bg-red-500/10 border border-red-500 text-red-700 hover:bg-red-500/20"
                    onClick={() => handleRemoveLayer(layer.layerIndex ?? idx)}
                    title="Remove layer"
                  >Remove</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-tn-text-muted w-16">Type</label>
                  <select
                    value={layer.layerType ?? "ConstantThickness"}
                    onChange={e => handleChangeType(layer.layerIndex ?? idx, e.target.value)}
                    className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
                  >
                    <option value="ConstantThickness">ConstantThickness</option>
                    <option value="RangeThickness">RangeThickness</option>
                    <option value="NoiseThickness">NoiseThickness</option>
                    <option value="WeightedThickness">WeightedThickness</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-tn-text-muted w-16">Material</label>
                  <button
                    type="button"
                    onClick={() => onSelectNode(layer.nodeId)}
                    className="flex-1 rounded border border-tn-border bg-tn-bg px-1.5 py-1 text-left text-[11px] text-tn-text hover:border-tn-accent/50 hover:text-tn-accent"
                  >
                    {layer.material}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-tn-text-muted w-16">Thickness</label>
                  <input
                    type="text"
                    value={layer.thickness ?? ""}
                    onChange={e => updateNodeField(layer.nodeId, "Thickness", e.target.value)}
                    className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-tn-text-muted w-16">Color Override</label>
                  <input
                    type="color"
                    value={layer.color ?? "#808080"}
                    onChange={e => updateNodeField(layer.nodeId, "Color", e.target.value)}
                    className="w-8 h-8 border border-tn-border rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
