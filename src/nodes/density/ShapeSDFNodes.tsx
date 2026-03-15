import { memo } from "react";
import { AssetCategory } from "@/schema/types";
import { BaseNode, type TypedNodeProps } from "../shared/BaseNode";
import { curveInput, densityOutput } from "../shared/handles";

const SINGLE_CURVE_SDF_HANDLES = [curveInput("Curve", "Curve"), densityOutput()];
const CYLINDER_HANDLES = [curveInput("RadialCurve", "Radial Curve"), curveInput("AxialCurve", "Axial Curve"), densityOutput()];
const SHELL_HANDLES = [curveInput("AngleCurve", "Angle Curve"), curveInput("DistanceCurve", "Distance Curve"), densityOutput()];
const CURVE_INPUT_HANDLES = [curveInput("Curve", "Curve"), densityOutput()];

export const EllipsoidNode = memo(function EllipsoidNode(props: TypedNodeProps) {
  const data = props.data;
  const r = data.fields.Radius as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Radius</span>
        <span>{Number(r?.x ?? 1).toFixed(1)}, {Number(r?.y ?? 1).toFixed(1)}, {Number(r?.z ?? 1).toFixed(1)}</span>
      </div>
    </BaseNode>
  );
});

export const CuboidNode = memo(function CuboidNode(props: TypedNodeProps) {
  const data = props.data;
  const s = data.fields.Size as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Size</span>
        <span>{Number(s?.x ?? 1).toFixed(1)}, {Number(s?.y ?? 1).toFixed(1)}, {Number(s?.z ?? 1).toFixed(1)}</span>
      </div>
    </BaseNode>
  );
});

export const CylinderNode = memo(function CylinderNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CYLINDER_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Radius</span>
          <span>{Number(data.fields.Radius ?? 1).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Height</span>
          <span>{Number(data.fields.Height ?? 2).toFixed(2)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const PlaneNode = memo(function PlaneNode(props: TypedNodeProps) {
  const data = props.data;
  const n = data.fields.Normal as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Normal</span>
          <span>{Number(n?.x ?? 0).toFixed(1)}, {Number(n?.y ?? 1).toFixed(1)}, {Number(n?.z ?? 0).toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Anchored</span>
          <span>{data.fields.IsAnchored ? "Yes" : "No"}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ShellNode = memo(function ShellNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SHELL_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Inner R</span>
          <span>{Number(data.fields.InnerRadius ?? 0.5).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Outer R</span>
          <span>{Number(data.fields.OuterRadius ?? 1).toFixed(2)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const CubeSDFNode = memo(function CubeSDFNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CURVE_INPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Cube SDF</div>
    </BaseNode>
  );
});

export const AxisNode = memo(function AxisNode(props: TypedNodeProps) {
  const data = props.data;
  const axis = data.fields.Axis as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CURVE_INPUT_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Axis</span>
          <span>{Number(axis?.x ?? 0).toFixed(1)}, {Number(axis?.y ?? 1).toFixed(1)}, {Number(axis?.z ?? 0).toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Anchored</span>
          <span>{data.fields.IsAnchored ? "Yes" : "No"}</span>
        </div>
      </div>
    </BaseNode>
  );
});
