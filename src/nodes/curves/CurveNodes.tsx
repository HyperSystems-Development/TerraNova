import { memo, useMemo } from "react";
import { BaseNode, type TypedNodeProps } from "@/nodes/shared/BaseNode";
import { AssetCategory } from "@/schema/types";
import { curveInput, curveOutput } from "@/nodes/shared/handles";
import { CurveCanvas } from "@/components/properties/CurveCanvas";
import { getCurveEvaluator } from "@/utils/curveEvaluators";
import { SchemaFields } from "@/nodes/shared/SchemaFields";
import { useCompoundHandles } from "@/hooks/useCompoundHandles";
const HANDLES_CURVE_OUT = [curveOutput()];

const HANDLES_CURVE_IN_OUT = [curveInput("Input", "Input"), curveOutput()];

/** Mini curve preview for computed curve nodes. */
function CurveMiniPreview({ typeName, fields }: { typeName: string; fields: Record<string, unknown> }) {
  const evaluator = useMemo(() => getCurveEvaluator(typeName, fields), [typeName, fields]);
  if (!evaluator) return null;
  return <CurveCanvas evaluator={evaluator} compact />;
}

// ── Leaf curves ────────────────────────────────────────────────────────

export const ManualCurveNode = memo(function ManualCurveNode(props: TypedNodeProps) {
  const data = props.data;
  const points = data.fields.Points;
  const count = Array.isArray(points) ? points.length : 0;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Points</span>
        <span>{count}</span>
      </div>
      {Array.isArray(points) && points.length > 0 && (
        <CurveCanvas points={points} compact />
      )}
    </BaseNode>
  );
});

export const ConstantCurveNode = memo(function ConstantCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="Constant" fields={data.fields} />
    </BaseNode>
  );
});

export const DistanceExponentialCurveNode = memo(function DistanceExponentialCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="DistanceExponential" fields={data.fields} />
    </BaseNode>
  );
});

export const DistanceSCurveNode = memo(function DistanceSCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="DistanceS" fields={data.fields} />
    </BaseNode>
  );
});

export const NoiseCurveNode = memo(function NoiseCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const StepFunctionCurveNode = memo(function StepFunctionCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="StepFunction" fields={data.fields} />
    </BaseNode>
  );
});

export const ThresholdCurveNode = memo(function ThresholdCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="Threshold" fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothStepCurveNode = memo(function SmoothStepCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="SmoothStep" fields={data.fields} />
    </BaseNode>
  );
});

export const PowerCurveNode = memo(function PowerCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="Power" fields={data.fields} />
    </BaseNode>
  );
});

// ── Composite curves ───────────────────────────────────────────────────

export const MultiplierCurveNode = memo(function MultiplierCurveNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Curve:Multiplier");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">A × B</div>
    </BaseNode>
  );
});

export const SumCurveNode = memo(function SumCurveNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Curve:Sum");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">A + B</div>
    </BaseNode>
  );
});

export const InverterCurveNode = memo(function InverterCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <div className="text-tn-text-muted text-center py-1">1 − x</div>
      <CurveMiniPreview typeName="Inverter" fields={{}} />
    </BaseNode>
  );
});

export const NotCurveNode = memo(function NotCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <div className="text-tn-text-muted text-center py-1">NOT</div>
    </BaseNode>
  );
});

export const ClampCurveNode = memo(function ClampCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="Clamp" fields={data.fields} />
    </BaseNode>
  );
});

export const LinearRemapCurveNode = memo(function LinearRemapCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
      <CurveMiniPreview typeName="LinearRemap" fields={data.fields} />
    </BaseNode>
  );
});

export const CacheCurveNode = memo(function CacheCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <div className="text-tn-text-muted text-center py-1">Cache</div>
    </BaseNode>
  );
});

export const BlendCurveNodeC = memo(function BlendCurveNodeC(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Curve:Blend");
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={handles}
    >
      <div className="text-tn-text-muted text-center py-1">Blend A↔B</div>
    </BaseNode>
  );
});

// ── Import/Export ──────────────────────────────────────────────────────

export const ImportedCurveNode = memo(function ImportedCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const ExportedCurveNode = memo(function ExportedCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode
      {...props}
      category={AssetCategory.Curve}
      handles={HANDLES_CURVE_IN_OUT}
    >
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

// ── New pre-release curve types ───────────────────────────────────────

export const FloorCurveNode = memo(function FloorCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_IN_OUT}>
      <div className="text-tn-text-muted text-center py-1">floor(x)</div>
    </BaseNode>
  );
});

export const CeilingCurveNode = memo(function CeilingCurveNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_IN_OUT}>
      <div className="text-tn-text-muted text-center py-1">ceil(x)</div>
    </BaseNode>
  );
});

export const SmoothFloorCurveNode = memo(function SmoothFloorCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_IN_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothCeilingCurveNode = memo(function SmoothCeilingCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_IN_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothClampCurveNode = memo(function SmoothClampCurveNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={HANDLES_CURVE_IN_OUT}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const MinCurveNode = memo(function MinCurveNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Curve:Min");
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={handles}>
      <div className="text-tn-text-muted text-center py-1">min(A, B)</div>
    </BaseNode>
  );
});

export const MaxCurveNode = memo(function MaxCurveNode(props: TypedNodeProps) {
  const handles = useCompoundHandles(props.id, "Curve:Max");
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={handles}>
      <div className="text-tn-text-muted text-center py-1">max(A, B)</div>
    </BaseNode>
  );
});

export const SmoothMinCurveNode = memo(function SmoothMinCurveNode(props: TypedNodeProps) {
  const data = props.data;
  const handles = useCompoundHandles(props.id, "Curve:SmoothMin");
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={handles}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});

export const SmoothMaxCurveNode = memo(function SmoothMaxCurveNode(props: TypedNodeProps) {
  const data = props.data;
  const handles = useCompoundHandles(props.id, "Curve:SmoothMax");
  return (
    <BaseNode {...props} category={AssetCategory.Curve} handles={handles}>
      <SchemaFields typeKey={data.type} fields={data.fields} />
    </BaseNode>
  );
});
