import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useFieldChange } from "@/hooks/useFieldChange";
import { SliderField } from "./SliderField";
import { VectorField } from "./VectorField";
import { RangeField } from "./RangeField";
import { ToggleField } from "./ToggleField";
import { TextField } from "./TextField";
import { ArrayField } from "./ArrayField";
import { CurveCanvas } from "./CurveCanvas";
import { CurvePointList } from "./CurvePointList";
import { BiomeDashboard } from "./BiomeDashboard";
import { SettingsPanel } from "./SettingsPanel";
import { PropOverviewPanel } from "./PropOverviewPanel";
import { MaterialLayerStack } from "./MaterialLayerStack";
import { AtmosphereTab } from "./AtmosphereTab";
import { DebugTab } from "./DebugTab";
import { PropPlacementGrid } from "./PropPlacementGrid";
import { POSITION_TYPE_NAMES } from "@/utils/positionEvaluator";
import { getCurveEvaluator } from "@/utils/curveEvaluators";
import { validateField, type ValidationIssue } from "@/schema/validation";
import { FIELD_CONSTRAINTS } from "@/schema/constraints";
import { NODE_TIPS } from "@/schema/nodeTips";
import { FIELD_DESCRIPTIONS, getShortDescription, getExtendedDescription } from "@/schema/fieldDescriptions";
import { useLanguage } from "@/languages/useLanguage";

export function PropertyPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const commitState = useEditorStore((s) => s.commitState);
  const setDirty = useProjectStore((s) => s.setDirty);
  const editingContext = useEditorStore((s) => s.editingContext);
  const { getTypeDisplayName, getFieldDisplayName, getFieldTransform } = useLanguage();
  const helpMode = useUIStore((s) => s.helpMode);
  const toggleHelpMode = useUIStore((s) => s.toggleHelpMode);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const noiseRangeConfig = useEditorStore((s) => s.noiseRangeConfig);
  const setNoiseRangeConfig = useEditorStore((s) => s.setNoiseRangeConfig);
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const setBiomeConfig = useEditorStore((s) => s.setBiomeConfig);
  const settingsConfig = useEditorStore((s) => s.settingsConfig);
  const setSettingsConfig = useEditorStore((s) => s.setSettingsConfig);
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);

  const hasPendingSnapshotRef = useRef(false);
  const lastChangedFieldRef = useRef<{ field: string; nodeType: string }>({ field: "", nodeType: "" });

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  /**
   * Flush any pending history snapshot immediately.
   */
  const flushPendingSnapshot = useCallback(() => {
    if (hasPendingSnapshotRef.current) {
      const { field, nodeType } = lastChangedFieldRef.current;
      commitState(field ? `Edit ${field} on ${nodeType}` : "Edit");
      hasPendingSnapshotRef.current = false;
    }
  }, [commitState]);

  /**
   * For discrete changes (toggle clicks): update field then commit.
   */
  const handleDiscreteChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (!selectedNodeId) return;
      flushPendingSnapshot();
      const node = useEditorStore.getState().nodes.find((n) => n.id === selectedNodeId);
      const nodeType = (node?.data as Record<string, unknown>)?.type as string ?? "node";
      updateNodeField(selectedNodeId, fieldName, value);
      commitState(`Edit ${fieldName} on ${nodeType}`);
      setDirty(true);
    },
    [selectedNodeId, commitState, updateNodeField, setDirty, flushPendingSnapshot],
  );

  /**
   * For continuous changes (slider drags, text typing): update immediately
   * but only commit to history on blur (interaction end) so a single drag
   * produces exactly one undo entry.
   */
  const handleContinuousChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (!selectedNodeId) return;

      // Track field name + node type for descriptive history label
      const node = useEditorStore.getState().nodes.find((n) => n.id === selectedNodeId);
      const nodeType = (node?.data as Record<string, unknown>)?.type as string ?? "node";
      lastChangedFieldRef.current = { field: fieldName, nodeType };

      updateNodeField(selectedNodeId, fieldName, value);
      setDirty(true);

      // Mark that we have uncommitted changes — commit happens on blur
      hasPendingSnapshotRef.current = true;
    },
    [selectedNodeId, updateNodeField, setDirty],
  );

  /**
   * On blur, flush any pending snapshot so undo state is clean before
   * other actions (like deletion) can occur.
   */
  const handleBlur = useCallback(() => {
    flushPendingSnapshot();
  }, [flushPendingSnapshot]);

  // Flush pending snapshot when switching nodes so changes aren't lost
  useEffect(() => {
    return () => {
      flushPendingSnapshot();
    };
  }, [selectedNodeId, flushPendingSnapshot]);

  const { debouncedChange: debouncedConfigChange, flush: flushConfig } = useFieldChange(commitState, setDirty, 300);

  const handleConfigBlur = useCallback(() => {
    flushConfig();
  }, [flushConfig]);

  const handleNoiseRangeConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!noiseRangeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setNoiseRangeConfig({ ...noiseRangeConfig, [field]: value }));
    },
    [noiseRangeConfig, setNoiseRangeConfig, debouncedConfigChange],
  );

  const handleBiomeConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!biomeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setBiomeConfig({ ...biomeConfig, [field]: value }));
    },
    [biomeConfig, setBiomeConfig, debouncedConfigChange],
  );

  const handleSettingsConfigChange = useCallback(
    (field: string, value: unknown) => {
      if (!settingsConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => setSettingsConfig({ ...settingsConfig, [field]: value }));
    },
    [settingsConfig, setSettingsConfig, debouncedConfigChange],
  );

  const handleBiomeTintChange = useCallback(
    (field: string, value: string) => {
      if (!biomeConfig) return;
      debouncedConfigChange(`Edit ${field}`, () => {
        const tint = { ...biomeConfig.TintProvider, [field]: value };
        setBiomeConfig({ ...biomeConfig, TintProvider: tint });
      });
    },
    [biomeConfig, setBiomeConfig, debouncedConfigChange],
  );

  const handlePropMetaChange = useCallback(
    (index: number, field: string, value: unknown) => {
      if (!biomeConfig) return;
      const propMeta = [...biomeConfig.propMeta];
      propMeta[index] = { ...propMeta[index], [field]: value };
      setBiomeConfig({ ...biomeConfig, propMeta });
      setDirty(true);
      commitState(`Edit prop ${field}`);
    },
    [biomeConfig, setBiomeConfig, commitState, setDirty],
  );

  if (!selectedNode) {
    if (editingContext === "NoiseRange" && noiseRangeConfig) {
      return (
        <div className="flex flex-col p-3 gap-3">
          <div className="border-b border-tn-border pb-2">
            <h3 className="text-sm font-semibold">NoiseRange Config</h3>
            <p className="text-xs text-tn-text-muted">Global biome range settings</p>
          </div>
          <TextField
            label="DefaultBiome"
            value={noiseRangeConfig.DefaultBiome}
            onChange={(v) => handleNoiseRangeConfigChange("DefaultBiome", v)}
            onBlur={handleConfigBlur}
          />
          <SliderField
            label="DefaultTransitionDistance"
            value={noiseRangeConfig.DefaultTransitionDistance}
            min={0}
            max={128}
            step={1}
            onChange={(v) => handleNoiseRangeConfigChange("DefaultTransitionDistance", v)}
            onBlur={handleConfigBlur}
          />
          <SliderField
            label="MaxBiomeEdgeDistance"
            value={noiseRangeConfig.MaxBiomeEdgeDistance}
            min={0}
            max={128}
            step={1}
            onChange={(v) => handleNoiseRangeConfigChange("MaxBiomeEdgeDistance", v)}
            onBlur={handleConfigBlur}
          />
        </div>
      );
    }

    if (editingContext === "Settings" && settingsConfig) {
      return (
        <SettingsPanel
          onSettingsConfigChange={handleSettingsConfigChange}
          onBlur={handleConfigBlur}
        />
      );
    }

    if (editingContext === "Biome" && biomeConfig) {
      return (
        <BiomeInspector
          activeBiomeSection={activeBiomeSection}
          onBiomeConfigChange={handleBiomeConfigChange}
          onBiomeTintChange={handleBiomeTintChange}
          onPropMetaChange={handlePropMetaChange}
          onBlur={handleConfigBlur}
        />
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-tn-text-muted text-center">
          Select a node to edit its properties
        </p>
      </div>
    );
  }

  const data = selectedNode.data as Record<string, unknown>;
  const fields = (data.fields as Record<string, unknown>) ?? {};
  const typeName = (data.type as string) ?? "Unknown";
  const rfType = selectedNode.type ?? typeName;
  const rfDisplayName = getTypeDisplayName(rfType);
  const displayTypeName = (rfDisplayName !== rfType) ? rfDisplayName : getTypeDisplayName(typeName);
  const typeConstraints = FIELD_CONSTRAINTS[displayTypeName] ?? FIELD_CONSTRAINTS[typeName] ?? {};
  const tips = NODE_TIPS[rfType] ?? NODE_TIPS[typeName] ?? [];
  const typeDescriptions = FIELD_DESCRIPTIONS[rfType] ?? FIELD_DESCRIPTIONS[typeName] ?? {};
  const isCurveNode = selectedNode.type?.startsWith("Curve:") ?? false;
  const isManualCurve = selectedNode.type === "Curve:Manual";
  const isPositionNode = (selectedNode.type?.startsWith("Position:") ?? false) || (POSITION_TYPE_NAMES as readonly string[]).includes(typeName);

  return (
    <div className="flex flex-col p-3 gap-3">
      <div className="border-b border-tn-border pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{displayTypeName}</h3>
          <button
            onClick={toggleHelpMode}
            title={helpMode ? "Exit help mode (?)" : "Toggle help mode (?)"}
            className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
              helpMode
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300"
                : "border-tn-border text-tn-text-muted hover:border-tn-text-muted"
            }`}
          >
            ?
          </button>
        </div>
        <p className="text-xs text-tn-text-muted">ID: {selectedNode.id}</p>
      </div>

      {helpMode && (
        <div className="text-[10px] px-2 py-1.5 rounded border bg-sky-500/10 border-sky-500/30 text-sky-300 flex items-center gap-1.5">
          <span className="font-bold">?</span>
          <span>Help mode active — click any field for extended docs. Press <kbd className="px-1 py-0.5 bg-sky-500/20 rounded text-[9px]">?</kbd> to exit.</span>
        </div>
      )}

      {tips.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tips.map((tip, i) => (
            <div
              key={i}
              className={`text-[11px] leading-relaxed px-2.5 py-2 rounded border ${
                tip.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-300"
              }`}
            >
              <span className="font-semibold">
                {tip.severity === "warning" ? "Tip: " : "Info: "}
              </span>
              {tip.message}
            </div>
          ))}
        </div>
      )}

      {Object.entries(fields).map(([key, value]) => {
        const fieldLabel = getFieldDisplayName(typeName, key);
        const transform = typeof value === "number" ? getFieldTransform(typeName, key) : null;
        const constraint = typeConstraints[key] ?? typeConstraints[fieldLabel];
        const validationValue = (transform && typeof value === "number") ? transform.toDisplay(value as number) : value;
        const issue = constraint ? validateField(fieldLabel, validationValue, constraint) : null;
        const rawDescription = typeDescriptions[key];
        const description = rawDescription ? getShortDescription(rawDescription) : undefined;
        const extendedDesc = rawDescription ? getExtendedDescription(rawDescription) : undefined;
        const isExpanded = helpMode && expandedField === key;
        const handleHelpClick = helpMode && extendedDesc
          ? () => setExpandedField(expandedField === key ? null : key)
          : undefined;

        if (typeof value === "number") {
          const displayValue = transform ? transform.toDisplay(value) : value;
          const handleTransformedChange = transform
            ? (v: number) => handleContinuousChange(key, transform.fromDisplay(v))
            : (v: number) => handleContinuousChange(key, v);
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <SliderField
                label={fieldLabel}
                value={displayValue}
                min={constraint?.min ?? -100}
                max={constraint?.max ?? 100}
                description={description}
                onChange={handleTransformedChange}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "boolean") {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ToggleField
                label={fieldLabel}
                value={value}
                description={description}
                onChange={(v) => handleDiscreteChange(key, v)}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "string") {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <TextField
                label={fieldLabel}
                value={value}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "x" in (value as Record<string, unknown>)
        ) {
          const v = value as { x: number; y: number; z: number };
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <VectorField
                label={fieldLabel}
                value={v}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "Min" in (value as Record<string, unknown>) &&
          "Max" in (value as Record<string, unknown>)
        ) {
          const v = value as { Min: number; Max: number };
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <RangeField
                label={fieldLabel}
                value={v}
                description={description}
                onChange={(v) => handleContinuousChange(key, v)}
                onBlur={handleBlur}
              />
            </FieldWrapper>
          );
        }
        if (Array.isArray(value) && key === "DelimiterRanges") {
          const ranges = value as { From?: number; To?: number }[];
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ArrayField
                label={fieldLabel}
                values={ranges}
                description={description}
                renderItem={(item, index) => {
                  const range = item as { From?: number; To?: number };
                  return (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="text-[10px] text-tn-text-muted w-4 shrink-0">[{index}]</span>
                      <label className="text-[10px] text-tn-text-muted shrink-0">From</label>
                      <input
                        type="number"
                        step="any"
                        value={range.From ?? 0}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          const newRanges = ranges.map((r, i) => i === index ? { ...r, From: v } : r);
                          handleContinuousChange("DelimiterRanges", newRanges);
                        }}
                        onBlur={handleBlur}
                        className="w-16 shrink-0 px-1.5 py-0.5 text-xs bg-tn-bg border border-tn-border rounded text-right"
                      />
                      <label className="text-[10px] text-tn-text-muted shrink-0">To</label>
                      <input
                        type="number"
                        step="any"
                        value={range.To ?? 1000}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isNaN(v)) return;
                          const newRanges = ranges.map((r, i) => i === index ? { ...r, To: v } : r);
                          handleContinuousChange("DelimiterRanges", newRanges);
                        }}
                        onBlur={handleBlur}
                        className="w-16 shrink-0 px-1.5 py-0.5 text-xs bg-tn-bg border border-tn-border rounded text-right"
                      />
                    </div>
                  );
                }}
                onAdd={() => {
                  const lastTo = ranges.length > 0 ? (ranges[ranges.length - 1].To ?? 0) : 0;
                  handleDiscreteChange("DelimiterRanges", [...ranges, { From: lastTo, To: lastTo + 25 }]);
                }}
                onRemove={(index) => {
                  handleDiscreteChange("DelimiterRanges", ranges.filter((_, i) => i !== index));
                }}
              />
            </FieldWrapper>
          );
        }
        if (Array.isArray(value)) {
          if (isManualCurve && key === "Points") {
            return (
              <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
                <CurveCanvas
                  key={selectedNodeId}
                  label={`Points (${value.length})`}
                  points={value}
                  onChange={(pts) => {
                    if (selectedNodeId) {
                      updateNodeField(selectedNodeId, "Points", pts);
                      setDirty(true);
                    }
                  }}
                  onCommit={() => commitState("Edit curve")}
                />
                <CurvePointList
                  points={value}
                  onChange={(pts) => {
                    if (selectedNodeId) {
                      updateNodeField(selectedNodeId, "Points", pts);
                      setDirty(true);
                    }
                  }}
                  onCommit={() => commitState("Edit curve point")}
                />
              </FieldWrapper>
            );
          }
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <ArrayField
                label={fieldLabel}
                values={value}
                description={description}
              />
            </FieldWrapper>
          );
        }
        if (typeof value === "object" && value !== null) {
          return (
            <FieldWrapper key={key} issue={issue} helpMode={helpMode} onHelpClick={handleHelpClick} extendedDesc={isExpanded ? extendedDesc : undefined}>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-tn-text-muted">{fieldLabel}</span>
                <pre className="text-xs text-tn-text bg-tn-bg p-2 rounded border border-tn-border overflow-x-auto max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            </FieldWrapper>
          );
        }
        return null;
      })}

      {isCurveNode && !isManualCurve && (() => {
        const evaluator = getCurveEvaluator(typeName, fields);
        if (!evaluator) return null;
        return <CurveCanvas label="Preview (read-only)" evaluator={evaluator} />;
      })()}

      {/* Show material layer stack when SpaceAndDepth is selected */}
      {typeName === "SpaceAndDepth" && <MaterialLayerStack />}

      {/* Show placement preview for position provider nodes */}
      {isPositionNode && (
        <div className="border-t border-tn-border pt-2 mt-1">
          <PropPlacementGrid
            nodes={nodes}
            edges={edges}
            rootNodeId={selectedNodeId ?? undefined}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BiomeInspector - tabbed wrapper for the Biome editing context
// ---------------------------------------------------------------------------

type BiomeTab = "biome" | "atmosphere" | "debug";

function BiomeInspector({
  activeBiomeSection,
  onBiomeConfigChange,
  onBiomeTintChange,
  onPropMetaChange,
  onBlur,
}: {
  activeBiomeSection: string | null | undefined;
  onBiomeConfigChange: (field: string, value: unknown) => void;
  onBiomeTintChange: (field: string, value: string) => void;
  onPropMetaChange: (index: number, field: string, value: unknown) => void;
  onBlur: () => void;
}) {
  const [tab, setTab] = useState<BiomeTab>("biome");

  const propIndex = activeBiomeSection?.startsWith("Props[")
    ? parseInt(/\[(\d+)\]/.exec(activeBiomeSection)?.[1] ?? "-1", 10)
    : -1;

  function renderBiomeContent(): ReactNode {
    if (propIndex >= 0) {
      return (
        <PropOverviewPanel
          propIndex={propIndex}
          onPropMetaChange={onPropMetaChange}
          onBlur={onBlur}
        />
      );
    }
    if (activeBiomeSection === "MaterialProvider") {
      return <MaterialLayerStack />;
    }
    return (
      <BiomeDashboard
        onBiomeConfigChange={onBiomeConfigChange}
        onBlur={onBlur}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-tn-border shrink-0">
        {(["biome", "atmosphere", "debug"] as BiomeTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${
              tab === t
                ? "text-tn-accent border-b-2 border-tn-accent"
                : "text-tn-text-muted hover:text-tn-text"
            }`}
          >
            {t === "biome" ? "Biome" : t === "atmosphere" ? "Atmosphere" : "Debug"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "biome" && renderBiomeContent()}
        {tab === "atmosphere" && <AtmosphereTab onBlur={onBlur} onBiomeTintChange={onBiomeTintChange} />}
        {tab === "debug" && <DebugTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FieldWrapper({
  children,
  issue,
  helpMode,
  onHelpClick,
  extendedDesc,
}: {
  children: React.ReactNode;
  issue: ValidationIssue | null;
  helpMode?: boolean;
  onHelpClick?: () => void;
  extendedDesc?: string;
}) {
  return (
    <div>
      <div
        className={`${issue ? "ring-1 ring-red-500/60 rounded p-0.5 -m-0.5" : ""} ${
          helpMode && onHelpClick ? "cursor-help" : ""
        }`}
        onClick={onHelpClick}
      >
        {children}
      </div>
      {issue && (
        <p className={`text-[11px] mt-0.5 ${issue.severity === "error" ? "text-red-400" : issue.severity === "warning" ? "text-amber-400" : "text-tn-text-muted"}`}>
          {issue.message}
        </p>
      )}
      {extendedDesc && (
        <div className="mt-1.5 px-2.5 py-2 text-[11px] leading-relaxed rounded border bg-sky-500/10 border-sky-500/30 text-sky-200">
          {extendedDesc}
        </div>
      )}
    </div>
  );
}
