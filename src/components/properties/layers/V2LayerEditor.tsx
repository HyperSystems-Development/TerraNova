import { useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { MaterialLayer } from "@/utils/biomeSectionUtils";
import type { ConditionType } from "@/schema/material";
import { LAYER_CONTEXT_OPTIONS } from "./constants";
import { ConditionBadge, ConditionEditor } from "./ConditionEditor";

export function V2LayerEditor({ sadNodeId, layers, onSelectNode }: {
  sadNodeId: string;
  layers: MaterialLayer[];
  onSelectNode: (id: string) => void;
}) {
  // Hytale asset-based atmosphere templates
  const atmosphereTemplates = [
    { name: "default", displayName: "Default Atmosphere", icon: "Soil_Grass.png" },
    { name: "lush", displayName: "Lush Forest (Hytale)", icon: "Leaves_Oak.png" },
    { name: "eldritch", displayName: "Eldritch Spirelands (Hytale)", icon: "Stone_Eldritch.png" },
    { name: "tropical", displayName: "Tropical Pirate Islands (Hytale)", icon: "Sand_Tropical.png" },
  ];
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const handleApplyTemplate = () => {
    alert(`Applied template: ${selectedTemplate}`);
  };
  const handleSaveTemplate = () => {
    alert("Saved current settings as new atmosphere template!");
  };
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const addMaterialLayer = useEditorStore((s) => s.addMaterialLayer);
  const removeMaterialLayer = useEditorStore((s) => s.removeMaterialLayer);
  // Removed unused reorderMaterialLayers
  const changeMaterialLayerType = useEditorStore((s) => s.changeMaterialLayerType);

  const [conditionExpanded, setConditionExpanded] = useState(false);

  // Get SpaceAndDepth node fields
  const section = biomeSections?.MaterialProvider;
  const sadNode = section?.nodes.find((n) => n.id === sadNodeId);
  const sadData = sadNode?.data as Record<string, unknown> | undefined;
  const sadFields = (sadData?.fields as Record<string, unknown>) ?? {};

  const layerContext = (sadFields.LayerContext as string) ?? "DEPTH_INTO_FLOOR";
  const maxExpectedDepth = (sadFields.MaxExpectedDepth as number) ?? 16;

  // Get condition info
  const conditionData = sadFields.Condition as Record<string, unknown> | undefined;
  const conditionType = (conditionData?.Type as ConditionType) ?? "AlwaysTrueCondition";

  // V2 layers (those with layerIndex defined)
  const v2Layers = layers.filter((l) => l.layerIndex != null);

  // Find layer node IDs from edges
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
  }, [sadNodeId, addMaterialLayer]);

  const handleRemoveLayer = useCallback((index: number) => {
    removeMaterialLayer(sadNodeId, index);
  }, [sadNodeId, removeMaterialLayer]);

  const handleChangeType = useCallback((layerIndex: number, newType: string) => {
    const nodeId = layerNodeIds.get(layerIndex);
    if (nodeId) {
      changeMaterialLayerType(nodeId, newType, sadNodeId);
    }
  }, [layerNodeIds, sadNodeId, changeMaterialLayerType]);

  // Removed handleReorder (unused)

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
      {/* Atmosphere templates section - moved to top */}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs text-tn-text-muted">Atmosphere Template:</label>
        <div className="flex items-center gap-2">
          {/* Custom dropdown with block icons */}
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-tn-border bg-tn-bg text-tn-text"
          >
            {atmosphereTemplates.map(t => (
              <option key={t.name} value={t.name}>{t.displayName}</option>
            ))}
          </select>
          {/* Show icon for selected template */}
          {(() => {
            const tpl = atmosphereTemplates.find(t => t.name === selectedTemplate);
            if (!tpl) return null;
            return (
              <img
                src={"/icons/blocks/" + tpl.icon}
                alt={tpl.displayName + " icon"}
                className="w-6 h-6 rounded border border-tn-border bg-tn-bg"
                style={{ marginLeft: 4 }}
              />
            );
          })()}
        </div>
        <button
          className="px-2 py-1 text-xs rounded bg-tn-accent text-white hover:bg-tn-accent/80 border border-tn-border"
          onClick={handleApplyTemplate}
        >Apply</button>
        <button
          className="px-2 py-1 text-xs rounded bg-tn-bg border border-tn-border text-tn-text hover:bg-white/10"
          onClick={handleSaveTemplate}
        >Save</button>
      </div>
      {/* ...existing property editor content follows... */}
        <button
          className="px-2 py-1 text-xs rounded bg-tn-bg border border-tn-border text-tn-text hover:bg-white/10 transition-colors mr-2"
          onClick={() => onSelectNode("back")}
        >
          <svg className="w-4 h-4 inline mr-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4l-4 4 4 4" />
          </svg>
          Back
        </button>
        <h3 className="text-sm font-semibold">Material Layers</h3>
      </div>

      {/* Header */}
      <div className="border-b border-tn-border pb-2">
        <div className="flex items-center justify-between">
          <span></span>
          <button
            onClick={handleAddLayer}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-white/5 border border-tn-border text-tn-text hover:bg-white/10 transition-colors"
            title="Add new layer"
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add
          </button>
        </div>
        <p className="text-xs text-tn-text-muted mt-0.5">
          {v2Layers.length} layer{v2Layers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* SpaceAndDepth settings */}
      <div className="flex flex-col gap-2 p-2 rounded border border-tn-border bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Context</label>
          <select
            value={layerContext}
            onChange={(e) => updateNodeField(sadNodeId, "LayerContext", e.target.value)}
            className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
          >
            {LAYER_CONTEXT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Max Depth</label>
          <input
            type="number"
            value={maxExpectedDepth}
            onChange={(e) => updateNodeField(sadNodeId, "MaxExpectedDepth", parseInt(e.target.value) || 0)}
            className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text w-16"
            min={0}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col p-3 gap-3">
            {/* Atmosphere templates section - moved to top */}
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-tn-text-muted">Atmosphere Template:</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-tn-border bg-tn-bg text-tn-text"
                >
                  {atmosphereTemplates.map(t => (
                    <option key={t.name} value={t.name}>{t.displayName}</option>
                  ))}
                </select>
                {(() => {
                  const tpl = atmosphereTemplates.find(t => t.name === selectedTemplate);
                  if (!tpl) return null;
                  return (
                    <img
                      src={"/icons/blocks/" + tpl.icon}
                      alt={tpl.displayName + " icon"}
                      className="w-6 h-6 rounded border border-tn-border bg-tn-bg"
                      style={{ marginLeft: 4 }}
                    />
                  );
                })()}
              </div>
              <button
                className="px-2 py-1 text-xs rounded bg-tn-accent text-white hover:bg-tn-accent/80 border border-tn-border"
                onClick={handleApplyTemplate}
              >Apply</button>
              <button
                className="px-2 py-1 text-xs rounded bg-tn-bg border border-tn-border text-tn-text hover:bg-white/10"
                onClick={handleSaveTemplate}
              >Save</button>
            </div>
            {/* Back button and header */}
            <div className="flex items-center mb-2">
              <button
                className="px-2 py-1 text-xs rounded bg-tn-bg border border-tn-border text-tn-text hover:bg-white/10 transition-colors mr-2"
                onClick={() => onSelectNode("back")}
              >
                <svg className="w-4 h-4 inline mr-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4l-4 4 4 4" />
                </svg>
                Back
              </button>
              <h3 className="text-sm font-semibold">Material Layers</h3>
            </div>
            {/* Header */}
            <div className="border-b border-tn-border pb-2">
              <div className="flex items-center justify-between">
                <span />
                <button
                  onClick={handleAddLayer}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-white/5 border border-tn-border text-tn-text hover:bg-white/10 transition-colors"
                  title="Add new layer"
                >
                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  Add
                </button>
              </div>
              <p className="text-xs text-tn-text-muted mt-0.5">
                {v2Layers.length} layer{v2Layers.length !== 1 ? "s" : ""}
              </p>
            </div>
            {/* SpaceAndDepth settings */}
            <div className="flex flex-col gap-2 p-2 rounded border border-tn-border bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Context</label>
                <select
                  value={layerContext}
                  onChange={(e) => updateNodeField(sadNodeId, "LayerContext", e.target.value)}
                  className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text"
                >
                  {LAYER_CONTEXT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Max Depth</label>
                <input
                  type="number"
                  value={maxExpectedDepth}
                  onChange={(e) => updateNodeField(sadNodeId, "MaxExpectedDepth", parseInt(e.target.value) || 0)}
                  className="flex-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text w-16"
                  min={0}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-tn-text-muted shrink-0 w-16">Condition</label>
                <button
                  onClick={() => setConditionExpanded((v) => !v)}
                  className="flex-1 flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-tn-bg border border-tn-border rounded text-tn-text hover:bg-white/5 transition-colors text-left"
                >
                  <ConditionBadge type={conditionType} />
                  <svg
                    className={`w-3 h-3 text-tn-text-muted ml-auto transition-transform ${conditionExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Condition editor (expandable) */}
            {conditionExpanded && (
              <ConditionEditor
                conditionType={conditionType}
                conditionData={conditionData}
                onTypeChange={handleConditionTypeChange}
                onFieldChange={handleConditionFieldChange}
              />
            )}
            {/* Layer list with extra settings */}
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
        );
